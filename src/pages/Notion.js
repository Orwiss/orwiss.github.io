import React, { useEffect, useState } from 'react';

const NotionPage = ({ pageId }) => {
  const [notionData, setNotionData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotionData = async () => {
      try {
        const response = await fetch(`/api/notion?pageId=${pageId}`);
        console.log('API Response:', response); // 응답 객체 로그
        if (response.ok) {
          const data = await response.json(); // JSON 데이터 파싱
          console.log('Notion Data:', data); // 파싱된 데이터 로그
          setNotionData(data); // 상태 업데이트
        } else {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
      } catch (error) {
        console.error('Error:', error);
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
