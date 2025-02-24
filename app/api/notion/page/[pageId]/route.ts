import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const notion = new Client({ auth: NOTION_API_KEY });

export async function GET(request: NextRequest, { params }: { params: { pageId: string }}) {
  const page_id = params.pageId;

  try {
    const pageResponse = await notion.pages.retrieve({ page_id: page_id });

    return NextResponse.json({
      page: pageResponse,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch page details" }, { status: 500 });
  }
}
