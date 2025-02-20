import { NextResponse } from "next/server";
const { Client } = require("@notionhq/client"); 

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_DB_ID = process.env.NOTION_TEMP_DB_ID;
const notion = new Client({ auth: NOTION_API_KEY });

export async function GET(request: Request) {
  try {
    console.log(request)
    const response = await notion.databases.query({
      database_id: NOTION_DB_ID,
    });
    return NextResponse.json(response);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch Notion data" }, { status: 500 });
  }
}