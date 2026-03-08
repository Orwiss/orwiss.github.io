import { NextResponse } from "next/server";
import { createCacheHeaders, noStoreHeaders } from "@/lib/http";
import {
  createNotionClient,
  getNotionDatabaseId,
  proxyNotionRequest,
  replacePageCoversWithProxy,
  shouldProxyNotionInDevelopment,
} from "@/lib/notion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const listCacheHeaders = createCacheHeaders(300, 300, 3600);

export async function GET() {
  try {
    if (shouldProxyNotionInDevelopment()) {
      const proxied = await proxyNotionRequest("/api/notion");
      const payload = JSON.parse(proxied.body) as {
        results?: Array<{
          id: string;
          cover?: {
            type?: "file" | "external";
            file?: { url?: string };
            external?: { url?: string };
          };
        }>;
      };

      return NextResponse.json(
        {
          ...payload,
          results: replacePageCoversWithProxy(payload.results ?? []),
        },
        {
          status: proxied.status,
          headers: {
            ...listCacheHeaders,
            "Content-Type": proxied.contentType,
          },
        }
      );
    }

    const notion = createNotionClient();
    const response = await notion.databases.query({
      database_id: getNotionDatabaseId(),
    });
    return NextResponse.json(
      {
        ...response,
        results: replacePageCoversWithProxy(response.results),
      },
      {
        headers: listCacheHeaders,
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch Notion data" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
