import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

export default async function handler(req, res) {
  const { pageId } = req.query;

  if (!pageId) {
    return res.status(400).json({ error: 'Page ID is required' });
  }

  console.log(`Fetching Notion page data for pageId: ${pageId}`);

  try {
    const response = await notion.pages.retrieve({
      page_id: pageId,
    });

    console.log('Notion page data:', response);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching Notion data:', error);
    res.status(500).json({ error: 'Failed to fetch Notion page data' });
  }
}
