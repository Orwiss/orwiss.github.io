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
  params: Promise<{ pageId: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { pageId } = await params;
  try {
    if (shouldProxyNotionInDevelopment()) {
      const proxied = await proxyNotionRequest(`/api/notion/page/${pageId}`);
      return new NextResponse(proxied.body, {
        status: proxied.status,
        headers: { ...noStoreHeaders, "Content-Type": proxied.contentType },
      });
    }

    const notion = createNotionClient();
    const [pageResponse, blocksResponse] = await Promise.all([
      notion.pages.retrieve({ page_id: pageId }),
      notion.blocks.children.list({ block_id: pageId }),
    ]);
    return NextResponse.json(
      { page: pageResponse, blocks: blocksResponse.results },
      { headers: noStoreHeaders },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch page details" },
      { status: 500, headers: noStoreHeaders },
    );
  }
}
