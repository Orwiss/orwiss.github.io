import { NextResponse } from "next/server";
import { createCacheHeaders, noStoreHeaders } from "@/lib/http";
import {
  createNotionClient,
  getCoverUrlFromPage,
  getNotionProxyOrigin,
  proxyNotionJson,
  shouldProxyNotionInDevelopment,
} from "@/lib/notion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const coverCacheHeaders = createCacheHeaders(3600, 86400, 604800);

type RouteContext = {
  params: Promise<{ pageId: string }>;
};

type ProxiedPagePayload = {
  page?: {
    cover?: {
      type?: "file" | "external";
      file?: { url?: string };
      external?: { url?: string };
    };
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { pageId } = await params;
  try {
    let coverUrl: string | null = null;

    if (shouldProxyNotionInDevelopment()) {
      // First try the prod cover proxy directly — it already streams the image
      // and we want to reuse the upstream-cached signed URL when possible.
      const liveCoverUrl = new URL(
        `/api/notion/cover/${pageId}`,
        getNotionProxyOrigin(),
      );
      const liveResponse = await fetch(liveCoverUrl, { cache: "no-store" }).catch(
        () => null,
      );

      if (liveResponse?.ok && liveResponse.body) {
        const headers = new Headers(coverCacheHeaders);
        const contentType = liveResponse.headers.get("content-type");
        if (contentType) headers.set("Content-Type", contentType);
        return new NextResponse(liveResponse.body, { status: 200, headers });
      }

      // Fallback: pull page metadata, extract the cover URL, fetch ourselves.
      const proxied = await proxyNotionJson<ProxiedPagePayload>(
        `/api/notion/page/${pageId}`,
      );
      coverUrl = getCoverUrlFromPage(proxied.page ?? {});
    } else {
      const notion = createNotionClient();
      const page = await notion.pages.retrieve({ page_id: pageId });
      coverUrl = getCoverUrlFromPage(
        page as {
          cover?: {
            type?: "file" | "external";
            file?: { url?: string };
            external?: { url?: string };
          };
        },
      );
    }

    if (!coverUrl) {
      return NextResponse.json(
        { error: "Cover image was not found." },
        { status: 404, headers: noStoreHeaders },
      );
    }

    const coverResponse = await fetch(coverUrl, { cache: "no-store" });
    if (!coverResponse.ok || !coverResponse.body) {
      return NextResponse.json(
        { error: "Failed to fetch cover image." },
        { status: coverResponse.status || 502, headers: noStoreHeaders },
      );
    }

    const headers = new Headers(coverCacheHeaders);
    const contentType = coverResponse.headers.get("content-type");
    if (contentType) headers.set("Content-Type", contentType);
    return new NextResponse(coverResponse.body, { status: 200, headers });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch cover image." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
