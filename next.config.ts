import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Next.js's image optimizer rejects any /_next/image?w=N&q=Q where
    // N isn't in deviceSizes∪imageSizes or Q isn't in qualities (400
    // response, 43-byte body). We use w=900 + q=60 in
    // lib/imageOptimize.ts for body images, so both have to be
    // whitelisted here.
    qualities: [60, 75],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 900],
    // Notion serves block images from a few different signed-URL hosts.
    // Allowing them here lets us route body images through Next.js's
    // image optimizer (/_next/image?url=...&w=…) which converts to
    // WebP/AVIF and resizes — typically 5-10× smaller than the
    // multi-MB originals Notion serves.
    remotePatterns: [
      { protocol: "https", hostname: "prod-files-secure.s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "s3.us-west-2.amazonaws.com" },
      { protocol: "https", hostname: "file.notion.so" },
      { protocol: "https", hostname: "www.notion.so" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
