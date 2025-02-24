import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const notion = new Client({ auth: NOTION_API_KEY });

export async function GET(request: NextRequest, context: { params: { blockId: string }}) {
  const block_id = context.params.blockId;

  try {
    const blocksResponse = await notion.blocks.children.list({ block_id: block_id });

    return NextResponse.json({
      blocks: blocksResponse.results,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch page details" }, { status: 500 });
  }
}
