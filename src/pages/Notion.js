import React, { useEffect, useState } from 'react';

const Notion = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch('https://api.notion.com/v1/pages/6d45f80728b24b719db9c224bd68d6e1', {
        headers: {
          'Authorization': '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',
          'Notion-Version': '2022-06-28'
        }
      });
      const result = await response.json();
      setData(result);
    };

    fetchData();
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{data.properties.title.title[0].text.content}</h1>
      {/* 데이터를 원하는 형식으로 렌더링 */}
    </div>
  );
};

export default Notion;
