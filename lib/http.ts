export const noStoreHeaders = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
  "CDN-Cache-Control": "no-store",
  "Vercel-CDN-Cache-Control": "no-store",
} as const;

export function createCacheHeaders(
  browserMaxAge: number,
  edgeMaxAge = browserMaxAge,
  staleWhileRevalidate = edgeMaxAge * 2
) {
  return {
    "Cache-Control": `public, max-age=${browserMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    "CDN-Cache-Control": `public, s-maxage=${edgeMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
    "Vercel-CDN-Cache-Control": `public, s-maxage=${edgeMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  } as const;
}
