import React, { useEffect, useState } from "react";

const NotionPage = ({ pageId }) => {
  const [notionData, setNotionData] = useState(null);
  const [loading, setLoading] = useState(true);

  // 페이지 데이터 가져오기
  useEffect(() => {
    const fetchNotionData = async () => {
      try {
        const response = await fetch(`/api/notion?pageId=${6d45f80728b24b719db9c224bd68d6e1}`);
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

  // Notion 페이지 데이터를 표시
  return (
    <div>
      <h1>Notion Page</h1>
      <pre>{JSON.stringify(notionData, null, 2)}</pre>
    </div>
  );
};

export default NotionPage;


//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