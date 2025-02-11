import { useEffect, useState } from 'react';

interface NotionData {
  // 여기에는 Notion API 응답 데이터의 구조를 정의해야 합니다.
  // 예시로 몇 가지 필드를 추가합니다.
  title?: string;
  content?: string;
  // 필요한 필드를 여기에 추가
}

interface NotionPageProps {
  pageId: string;
}

const NotionPage = ({ pageId }: NotionPageProps) => {
  const [notionData, setNotionData] = useState<NotionData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotionData = async () => {
      setLoading(true);
      setError(null); // 에러 상태 초기화

      try {
        const response = await fetch(`/api/notion?pageId=${pageId}`);
        console.log('API Response:', response); // 응답 객체 로그
        
        if (response.ok) {
          const data = await response.json();
          console.log('Notion Data:', data); // 파싱된 데이터 로그
          setNotionData(data); // 상태 업데이트
        } else {
          throw new Error(`Failed to fetch: ${response.status}`);
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to load Notion data');
      } finally {
        setLoading(false);
      }
    };

    if (pageId) {
      fetchNotionData();
    }
  }, [pageId]);

  if (loading) return <div className="text-lg text-center">Loading...</div>;
  if (error) return <div className="text-lg text-center text-red-500">{error}</div>;

  return (
    <div className="p-4">
      <h1 className="mb-4 text-3xl font-bold">Notion Page</h1>
      <pre className="p-4 bg-gray-100 rounded-lg">
        {JSON.stringify(notionData, null, 2)}
      </pre>
    </div>
  );
};

export default NotionPage;
