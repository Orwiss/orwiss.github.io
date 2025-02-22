import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const notion = new Client({ auth: NOTION_API_KEY });

export async function GET(request: Request, { params }: { params: { pageId: string }}) {
  const content = await params;
  const page_id = await content.pageId;

  try {
    const pageResponse = await notion.pages.retrieve({ page_id: page_id });
    const blocksResponse = await notion.blocks.children.list({ block_id: page_id });

    return NextResponse.json({
      page: pageResponse,
      blocks: blocksResponse.results,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch page details" }, { status: 500 });
  }
}
