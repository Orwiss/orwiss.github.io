import { unstable_cache } from "next/cache";
import sharp from "sharp";
import {
  createNotionClient,
  getCoverUrlFromPage,
  getNotionProxyOrigin,
  proxyNotionJson,
  shouldProxyNotionInDevelopment,
} from "@/lib/notion";

// Notion covers come straight from the user's upload — often
// multi-MB originals. Two problems:
//   1. unstable_cache caps entries at 2MB; 3MB JPEGs blow past it
//      and the whole cache call throws.
//   2. We display covers at max ~416px wide (mind-map hover
//      preview), so shipping the original is pure waste.
// Resize + reencode here before the cache call so what we store
// fits in cache AND what the browser downloads is small.
const COVER_OUTPUT_WIDTH = 832; // 2× the hover-preview render width
const COVER_OUTPUT_QUALITY = 72;

async function resizeCoverToWebp(input: Uint8Array): Promise<Uint8Array> {
  const out = await sharp(Buffer.from(input))
    .resize({ width: COVER_OUTPUT_WIDTH, withoutEnlargement: true })
    .webp({ quality: COVER_OUTPUT_QUALITY })
    .toBuffer();
  return new Uint8Array(out);
}

// Cached cover-bytes lookup, keyed by Notion pageId.
//
// Why server-side cache (not just browser cache):
//   - Notion serves signed URLs that rotate every ~hour, so the signed
//     URL itself is unusable as a cache key.
//   - The browser cache only helps the SAME browser revisiting. A new
//     visitor (or a fresh tab) would hit Notion from scratch.
//   - Cached by pageId (stable), so the first visitor's fetch warms
//     the cache for everyone, and our home-page preload (which fires
//     28 requests in parallel) all dedupe onto the same cache entry.
//
// The result is a Uint8Array body + content type; the route handler
// wraps it in NextResponse with the appropriate cache headers.
const CACHE_SECONDS = 86400;

type NotionPageCover = {
  cover?: {
    type?: "file" | "external";
    file?: { url?: string };
    external?: { url?: string };
  };
};

// Internally we store bytes as base64 because `unstable_cache`
// serializes its return value to JSON between invocations. A raw
// Uint8Array survives the FIRST call (in-process, identity intact)
// but on cache hits it comes back as a plain `{0: byte, 1: byte, …}`
// object that NextResponse can't transmit as image data — the route
// returns 200 with garbage and browsers show a broken image. base64
// round-trips cleanly through JSON.
type CachedCover = {
  base64: string;
  contentType: string;
};

async function fetchCoverBytesUncached(
  pageId: string,
): Promise<CachedCover | null> {
  let coverUrl: string | null = null;

  if (shouldProxyNotionInDevelopment()) {
    // Dev mode: try the prod cover proxy first (already streams image +
    // refreshes signed URL upstream).
    const liveCoverUrl = new URL(
      `/api/notion/cover/${pageId}`,
      getNotionProxyOrigin(),
    );
    const liveResponse = await fetch(liveCoverUrl, { cache: "no-store" }).catch(
      () => null,
    );
    if (liveResponse?.ok && liveResponse.body) {
      const raw = new Uint8Array(await liveResponse.arrayBuffer());
      const resized = await resizeCoverToWebp(raw);
      return {
        base64: Buffer.from(resized).toString("base64"),
        contentType: "image/webp",
      };
    }
    // Fallback: fetch page metadata via proxy, get signed URL, fetch self.
    const proxied = await proxyNotionJson<{ page?: NotionPageCover }>(
      `/api/notion/page/${pageId}`,
    );
    coverUrl = getCoverUrlFromPage(proxied.page ?? {});
  } else {
    const notion = createNotionClient();
    const page = (await notion.pages.retrieve({
      page_id: pageId,
    })) as NotionPageCover;
    coverUrl = getCoverUrlFromPage(page);
  }

  if (!coverUrl) return null;

  const coverResponse = await fetch(coverUrl, { cache: "no-store" });
  if (!coverResponse.ok || !coverResponse.body) return null;
  const raw = new Uint8Array(await coverResponse.arrayBuffer());
  const resized = await resizeCoverToWebp(raw);
  return {
    base64: Buffer.from(resized).toString("base64"),
    contentType: "image/webp",
  };
}

const getCachedCover = unstable_cache(
  fetchCoverBytesUncached,
  ["notion-cover-bytes-v2"],
  { revalidate: CACHE_SECONDS, tags: ["notion-cover"] },
);

// Public API: returns decoded bytes (Uint8Array) ready for NextResponse,
// hiding the base64 cache encoding from callers.
export async function getCoverBytes(pageId: string) {
  const cached = await getCachedCover(pageId);
  if (!cached) return null;
  const body = new Uint8Array(Buffer.from(cached.base64, "base64"));
  return { body, contentType: cached.contentType };
}
