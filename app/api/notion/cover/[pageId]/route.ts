import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/http";
import {
  createNotionClient,
  getCoverUrlFromPage,
  getNotionProxyOrigin,
  proxyNotionJson,
  shouldProxyNotionInDevelopment,
} from "@/lib/notion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    pageId: string;
  };
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
  try {
    let coverUrl: string | null = null;

    if (shouldProxyNotionInDevelopment()) {
      const liveCoverUrl = new URL(
        `/api/notion/cover/${params.pageId}`,
        getNotionProxyOrigin()
      );
      const liveCoverResponse = await fetch(liveCoverUrl, {
        cache: "no-store",
      }).catch(() => null);

      if (liveCoverResponse?.ok && liveCoverResponse.body) {
        const headers = new Headers(noStoreHeaders);
        const contentType = liveCoverResponse.headers.get("content-type");

        if (contentType) {
          headers.set("Content-Type", contentType);
        }

        return new NextResponse(liveCoverResponse.body, {
          status: 200,
          headers,
        });
      }

      const proxied = await proxyNotionJson<ProxiedPagePayload>(
        `/api/notion/page/${params.pageId}`
      );
      coverUrl = getCoverUrlFromPage(proxied.page ?? {});
    } else {
      const notion = createNotionClient();
      const page = await notion.pages.retrieve({ page_id: params.pageId });
      coverUrl = getCoverUrlFromPage(
        page as {
          cover?: {
            type?: "file" | "external";
            file?: { url?: string };
            external?: { url?: string };
          };
        }
      );
    }

    if (!coverUrl) {
      return NextResponse.json(
        { error: "Cover image was not found." },
        { status: 404, headers: noStoreHeaders }
      );
    }

    const coverResponse = await fetch(coverUrl, {
      cache: "no-store",
    });

    if (!coverResponse.ok || !coverResponse.body) {
      return NextResponse.json(
        { error: "Failed to fetch cover image." },
        { status: coverResponse.status || 502, headers: noStoreHeaders }
      );
    }

    const headers = new Headers(noStoreHeaders);
    const contentType = coverResponse.headers.get("content-type");

    if (contentType) {
      headers.set("Content-Type", contentType);
    }

    return new NextResponse(coverResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch cover image." },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
