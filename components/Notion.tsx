'use client'

import { useEffect, useState } from "react";

type MultiSelectTag = {
  id: string;
  name: string;
};

type RichText = {
  plain_text: string;
};

type PageProperties = {
  이름: { title: RichText[] };
  "카테고리": { multi_select: MultiSelectTag[] };
  "사용 도구"?: { multi_select: MultiSelectTag[] };
  참여자?: { rich_text: RichText[] };
};

type Page = {
  id: string;
  properties: PageProperties;
  cover?: { file: { url: string } };
};

type Block = {
  id: string;
  type: string;
  paragraph?: { rich_text: RichText[] };
  image?: { file: { url: string }; caption?: string };
  video?: { url: string };
};

export default function Projects() {
  const [data, setData] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/notion")
      .then((res) => res.json())
      .then((data: { results: Page[] }) => {
        console.log("API Response:", data);
        setData(data.results || []);
      })
      .catch((error) => console.error("Error fetching data:", error));
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetch(`/api/notion/page/${selectedPage.id}`)
        .then((res) => res.json())
        .then((data: { blocks: Block[] }) => {
          console.log("Page and blocks:", data);
          setBlocks(data.blocks || []);
        })
        .catch((error) => console.error("Error fetching page blocks:", error));
    }
  }, [selectedPage]);

  const filteredData = filter
    ? data.filter((item) =>
        item.properties?.["카테고리"].multi_select.some((tag) => tag.name === filter)
      )
    : data;

  return (
    <div className="flex justify-center h-full overflow-hidden">
      <div className="w-[80vw] min-h-screen flex flex-col p-6 overflow-y-scroll">
        {selectedPage ? (
          <div className="w-full flex flex-col bg-white/20 backdrop-blur-sm rounded-2xl p-6 text-white overflow-y-scroll pointer-events-auto">
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
              {selectedPage.properties?.["사용 도구"]?.multi_select?.map((tag) => (
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
                blocks.map((block) => {
                  switch (block.type) {
                    case "paragraph":
                      return (
                        <p key={block.id} className="text-white mt-2">
                          {block.paragraph?.rich_text.map((text, index) => (
                            <span key={index}>{text.plain_text}</span>
                          ))}
                        </p>
                      );
                    case "image":
                      return (
                        <img
                          key={block.id}
                          src={block.image?.file.url || ""}
                          alt={block.image?.caption || "Image"}
                          className="mt-2"
                        />
                      );
                    case "video":
                      return (
                        <video key={block.id} controls className="mt-2">
                          <source src={block.video?.url || ""} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
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
          <div>
            <div className="flex flex-col sm:flex-row gap-4 my-10 xl:my-20">
              {[...new Set(data.flatMap(item => item.properties?.["카테고리"].multi_select.map(tag => tag.name)))].reverse().map((tag) => (
                <button
                  key={tag}
                  className={`px-4 py-2 xl:px-6 rounded-full text-xs md:text-sm xl:text-lg font-light text-white border-4 ${filter === tag ? 'bg-transparent border-4' : 'bg-white/50 border-transparent text-black backdrop-blur-sm'} pointer-events-auto`}
                  onClick={() => setFilter(filter === tag ? null : tag)}
                >
                  {tag}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8 w-full mb-20 pointer-events-auto">
              {filteredData.length > 0 ? (
                filteredData.map((item) => (
                  <div
                    key={item.id}
                    style={{ backgroundImage: `${item.cover?.file.url ? `url(${item.cover?.file.url})` : "none"}` }}
                    className="group aspect-[7/5] bg-cover bg-center bg-white/20 backdrop-blur-sm p-4 rounded-3xl cursor-pointer transform transition-transform hover:scale-95 flex items-center justify-center text-center"
                    onClick={() => setSelectedPage(item)}
                  >
                    <div className="absolute w-full h-full bg-black opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                    <h3 className="text-lg md:text-xl lg:text-2xl 2xl:text-3xl font-semibold text-transparent group-hover:text-white drop-shadow-md break-words leading-tight text-center">
                      {item.properties.이름.title[0]?.plain_text || "No Name"}
                    </h3>
                  </div>
                ))
              ) : (
                <p className="text-gray-300 col-span-full text-center">데이터 없음</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
