import { NextResponse } from "next/server";
import { noStoreHeaders } from "@/lib/http";
import {
  createNotionClient,
  proxyNotionRequest,
  shouldProxyNotionInDevelopment,
} from "@/lib/notion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    pageId: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    if (shouldProxyNotionInDevelopment()) {
      const proxied = await proxyNotionRequest(`/api/notion/page/${params.pageId}`);
      return new NextResponse(proxied.body, {
        status: proxied.status,
        headers: {
          ...noStoreHeaders,
          "Content-Type": proxied.contentType,
        },
      });
    }

    const notion = createNotionClient();
    const pageResponse = await notion.pages.retrieve({ page_id: params.pageId });
    const blocksResponse = await notion.blocks.children.list({
      block_id: params.pageId,
    });

    return NextResponse.json(
      {
        page: pageResponse,
        blocks: blocksResponse.results,
      },
      {
        headers: noStoreHeaders,
      }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch page details" },
      { status: 500, headers: noStoreHeaders }
    );
  }
}
