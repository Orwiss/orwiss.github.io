import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
