// Wrap a raw image URL so it routes through Next.js's image optimizer
// (/_next/image). The optimizer:
//   - converts to WebP/AVIF based on the browser's Accept header
//   - resizes to the requested width, capped at the source's native
//   - sets long Cache-Control on the result so the CDN / browser
//     short-circuits subsequent requests
// On signed Notion URLs the cache key includes the signature so it
// refreshes whenever Notion rotates the URL — slight inefficiency
// but correct, and the bandwidth savings dwarf the extra transforms.
//
// Used by:
//   - components/notion/Block.tsx (image block render)
//   - app/project/[pageId]/page.tsx (preload hints) — same URL on
//     both sides so the preload + img request collapse into one fetch.
// Lower than the typical 1200/75 default. Sharp transform time scales
// non-linearly with target dimensions, and our biggest perceived
// bottleneck is FIRST-load transform latency (every Notion signed-URL
// rotation invalidates the cache key). 900px wide covers the
// max-w-3xl article column at 2× DPR; q=60 keeps the WebP looking
// clean on photos while shrinking ~30% vs q=75.
const DEFAULT_WIDTH = 900;
const DEFAULT_QUALITY = 60;

export function optimizedImageUrl(
  rawUrl: string,
  width: number = DEFAULT_WIDTH,
  quality: number = DEFAULT_QUALITY,
): string {
  if (!rawUrl) return rawUrl;
  // Local / relative URLs go straight through unchanged.
  if (!rawUrl.startsWith("http")) return rawUrl;
  return `/_next/image?url=${encodeURIComponent(rawUrl)}&w=${width}&q=${quality}`;
}
