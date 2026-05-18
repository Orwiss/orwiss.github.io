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
const DEFAULT_WIDTH = 1200;
const DEFAULT_QUALITY = 75;

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
