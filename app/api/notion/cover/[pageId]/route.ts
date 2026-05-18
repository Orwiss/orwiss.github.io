import { NextResponse } from "next/server";
import { createCacheHeaders, noStoreHeaders } from "@/lib/http";
import { getCoverBytes } from "@/lib/notionCovers";

const coverCacheHeaders = createCacheHeaders(3600, 86400, 604800);

type RouteContext = {
  params: Promise<{ pageId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { pageId } = await params;
  try {
    const result = await getCoverBytes(pageId);
    if (!result) {
      return NextResponse.json(
        { error: "Cover image was not found." },
        { status: 404, headers: noStoreHeaders },
      );
    }
    const headers = new Headers(coverCacheHeaders);
    headers.set("Content-Type", result.contentType);
    // Uint8Array satisfies the underlying Response BodyInit contract,
    // but TS's NextResponse typing is narrower; the cast is safe.
    return new NextResponse(result.body as unknown as BodyInit, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch cover image." },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
