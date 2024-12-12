import React, { useEffect, useState } from 'react';
import { Client } from '@notionhq/client';

const NotionAPIComponent = ({ pageId }) => {
  const [pageContent, setPageContent] = useState(null);

  useEffect(() => {
    const notion = new Client({ auth: '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' });

    async function fetchPage() {
      try {
        const response = await notion.blocks.children.list({ block_id: pageId });
        setPageContent(response.results);
      } catch (error) {
        console.error('Failed to fetch Notion content:', error);
      }
    }

    fetchPage();
  }, [pageId]);

  if (!pageContent) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      {pageContent.map((block) => (
        <div key={block.id}>
          <p>{block.type}</p>
        </div>
      ))}
    </div>
  );
};

export default NotionAPIComponent;