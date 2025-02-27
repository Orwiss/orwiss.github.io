import { NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_TEMP_DB_ID as string;
const notion = new Client({ auth: NOTION_API_KEY });

export async function GET() {
  try {
    const response = await notion.databases.query({
      database_id: NOTION_DB_ID,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch Notion data" }, { status: 500 });
  }
}