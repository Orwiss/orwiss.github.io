import React, { useEffect, useState } from 'react';

const NotionPage = ({ pageId }) => {
  const [notionData, setNotionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotionData = async () => {
      try {
        const response = await fetch(`/api/notion?pageId=${pageId}`);
        if (response.ok) {
          const data = await response.json();
          setNotionData(data);
        } else {
          throw new Error("Failed to fetch Notion page data");
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotionData();
  }, [pageId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Notion Page</h1>
      <pre>{JSON.stringify(notionData, null, 2)}</pre>
    </div>
  );
};

export default NotionPage;
