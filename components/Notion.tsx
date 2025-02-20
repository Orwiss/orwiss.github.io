'use client'

import { useEffect, useState } from "react";

export default function Projects() {
  const [data, setData] = useState<any[]>([]);
  const [selectedPage, setSelectedPage] = useState<any | null>(null);
  const [blocks, setBlocks] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/notion")
      .then((res) => res.json())
      .then((data) => {
        console.log("API Response:", data);
        setData(data.results || []);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetch(`/api/notion/page/${selectedPage.id}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Page and blocks:", data);
          setBlocks(data.blocks || []);
        })
        .catch((error) => console.error("Error fetching page blocks:", error));
    }
  }, [selectedPage]);

  return (
    <div className="w-full min-h-screen flex items-center justify-center p-6">
      {selectedPage ? (
        <div className="w-full max-w-4xl bg-white/20 backdrop-blur-md shadow-2xl rounded-2xl p-6 text-white overflow-y-scroll max-h-[80vh] pointer-events-auto">
          <button
            className="mb-4 text-lg underline hover:text-gray-300 transition"
            onClick={() => setSelectedPage(null)}
          >
            ← 돌아가기
          </button>
          <h2 className="text-3xl font-bold mb-3">
            {selectedPage.properties.이름.title[0]?.plain_text || "No Title"}
          </h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedPage.properties?.["사용 도구"]?.multi_select?.map((tag: any) => (
              <span key={tag.id} className="bg-black text-xs px-3 py-1 rounded-full">
                {tag.name}
              </span>
            ))}
          </div>
          <p className="text-lg whitespace-pre-wrap">
            참여자: {selectedPage.properties.참여자?.rich_text[0]?.plain_text || "No Content"}
          </p>
          <div className="mt-6">
            {blocks.length > 0 ? (
              blocks.map((block: any) => {
                switch (block.type) {
                  case "paragraph":
                    return (
                      <p key={block.id} className="text-white mt-2">
                        {block.paragraph.rich_text.map((text: any, index: number) => (
                          <span key={index}>{text.plain_text}</span>
                        ))}
                      </p>
                    );
                  case "image":
                    return (
                      <img
                        key={block.id}
                        src={block.image.file.url}
                        alt={block.image.caption || "Image"}
                        className="mt-2"
                      />
                    );
                  case "video":
                    return (
                      <video key={block.id} controls className="mt-2">
                        <source src={block.video.url} type="video/mp4" />
                        Your browser does not support the video tag.
                      </video>
                    );
                  case "bookmark":
                    return (
                      <a href={block.bookmark.url}>
                        <h1 className="text-3xl underline">{block.bookmark.url}</h1>
                      </a>
                    );
                  case "column_list":
                    console.log(block.child)
                    return (
                      <div key={block.id} className="mt-2">
                        {block.column_list && block.column_list.length > 0 ? (
                          block.column_list.map((column: any, index: number) => (
                            <div key={index} className="column-item">
                              {column.text ? <p>{column.text}</p> : null}
                              {column.image ? <img src={column.image.url} alt="Column image" className="mt-2" /> : null}
                              {/* Add other column-related elements as needed */}
                            </div>
                          ))
                        ) : (
                          <span>불러오기 실패</span>
                        )}
                      </div>
                    );
                  default:
                    return null;
                }
              })
            ) : (
              <p className="text-gray-300">내용 없음</p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full max-w-5xl bg-white/20 backdrop-blur-md shadow-xl rounded-2xl p-6 pointer-events-auto">
          <h2 className="text-2xl font-bold text-white mb-5">Projects</h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4 overflow-y-scroll max-h-[80vh]">
            {data.length > 0 ? (
              data.map((item: any) => (
                <div
                  key={item.id}
                  className="aspect-square bg-white/20 p-4 rounded-xl shadow-lg cursor-pointer transform transition-transform hover:scale-95 flex items-center justify-center text-center"
                  onClick={() => setSelectedPage(item)}
                >
                  <h3 className="text-lg font-semibold text-white break-words leading-tight text-center">
                    {item.properties.이름.title[0]?.plain_text || "No Name"}
                  </h3>
                </div>
              ))
            ) : (
              <p className="text-gray-300 col-span-3 text-center">데이터 없음</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
