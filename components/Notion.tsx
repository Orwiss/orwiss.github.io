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
  날짜?: { date: { start: string } };
  카테고리: { multi_select: MultiSelectTag[] };
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
  video?: { external?: { url: string }; file?: { url: string }; type: string };
  link_preview?: { url: string };
  bookmark?: { url: string };
  numbered_list_item?: { rich_text: RichText[] };
  has_children?: boolean;
  children?: Block[];
};

export default function Projects() {
  const [data, setData] = useState<Page[]>([]);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [columnListData, setColumnListData] = useState<{ [blockId: string]: Block[] }>({});
  const [columnChildren, setColumnChildren] = useState<{ [columnId: string]: Block[] }>({});

  useEffect(() => {
    fetch("/api/notion")
      .then((res) => res.json())
      .then((data: { results: Page[] }) => {
        //console.log("API Response:", data);
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

  useEffect(() => {
    blocks.forEach((block) => {
      if (block.type === "column_list") {
        fetch(`/api/notion/block/${block.id}`)
          .then((res) => res.json())
          .then((data: { blocks: Block[] }) => {
            //console.log("Column list children for", block.id, data);
            setColumnListData((prev) => ({ ...prev, [block.id]: data.blocks || [] }));
            data.blocks.forEach((column) => {
              if (column.has_children && !columnChildren[column.id]) {
                fetch(`/api/notion/block/${column.id}`)
                  .then((res) => res.json())
                  .then((data: { blocks: Block[] }) => {
                    //console.log(`Fetched children for column ${column.id}:`, data.blocks);
                    setColumnChildren((prev) => ({ ...prev, [column.id]: data.blocks || [] }));
                  })
                  .catch((error) => console.error("Error fetching column children:", error));
              }
            });
          })
          .catch((error) => console.error("Error fetching column_list children:", error));
      }
    });
  }, [blocks]);

  const filteredData = filter
    ? data.filter((item) =>
        item.properties?.["카테고리"].multi_select.some((tag) => tag.name === filter)
      )
    : data;

  return (
    <div className="flex justify-center h-full overflow-hidden">
      <div className="w-[70vw] min-h-screen flex flex-col items-center overflow-y-scroll">
        {selectedPage ? (
          <div className="w-full flex flex-col items-center pt-12 text-white overflow-y-scroll pointer-events-auto">
            <div className="w-full flex flex-col items-center gap-2 xl:gap-4 mb-12">
              <button className="fixed md:left-[15vw] px-7 py-2 bg-white/50 backdrop-blur-sm rounded-full" onClick={() => setSelectedPage(null)}>
                ← 목록
              </button>
              <h2 className="text-3xl xl:text-5xl font-bold mt-24 md:mt-0 text-center break-keep">
                {selectedPage.properties.이름.title[0]?.plain_text || "No Title"}
              </h2>
              <p className="text-md xl:text-lg whitespace-pre-wrap text-center break-keep">
                {selectedPage.properties.참여자?.rich_text[0]?.plain_text || "No Content"}
              </p>
              <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                {selectedPage.properties?.["사용 도구"]?.multi_select?.map((tag) => (
                  <span key={tag.id} className="bg-white/50 backdrop-blur-sm text-xs xl:text-sm px-3 py-1 rounded-full">
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full xl:w-[800px] mb-24">
              {blocks.length > 0 ? (
                blocks.map((block) => {
                  switch (block.type) {
                    case "paragraph":
                      return (
                        <p key={block.id} className="text-white">
                          {block.paragraph?.rich_text.map((text, index) => (
                            <span key={index}>{text.plain_text}</span>
                          ))}
                        </p>
                      );
                    case "numbered_list_item":
                      return (
                        <p key={block.id} className="text-white font-bold text-lg md:text-xl">
                          {block.numbered_list_item?.rich_text.map((text, index) => (
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
                          onContextMenu={(e) => e.preventDefault()}
                          draggable="false"
                          className="w-full"
                        />
                      );
                    case "video": {
                      if (block.video?.type === 'file') {
                        return (
                          <video
                            key={block.id}
                            src={block.video?.file?.url || ""}
                            onContextMenu={(e) => e.preventDefault()}
                            draggable="false"
                            autoPlay
                            loop
                            className="w-full"
                          >
                            Your browser does not support the video tag.
                          </video>
                        );
                      } else if (block.video?.type === 'external') {
                        const url = block.video?.external?.url;
                        let videoId = "";
                        if (url) {
                          try {
                            const urlObj = new URL(url);
                            videoId = urlObj.searchParams.get("v") || url.split("/").pop() || "";
                          } catch (e) {
                            console.error(e);
                          }
                        }
                        return (
                          <iframe
                            key={block.id}
                            className="w-full aspect-video"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        );
                      }
                    }
                    case "link_preview":
                      return (
                        <a key={block.id} href={block.link_preview?.url || ""}>
                          <p className="text-lg w-full font-bold underline break-words">{block.link_preview?.url}</p>
                        </a>
                      );
                    case "bookmark":
                      return (
                        <a key={block.id} href={block.bookmark?.url || ""}>
                          <span className="text-lg w-full font-bold underline break-words">{block.bookmark?.url}</span>
                        </a>
                      );
                    case "column_list":
                      return (
                        <div key={block.id} className="w-full flex flex-1 flex-col sm:flex-row gap-4">
                          {(columnListData[block.id] || []).map((column) => (
                            <div key={column.id} className="flex flex-1 flex-col gap-4">
                              {(columnChildren[column.id] || []).map((childBlock) => {
                                switch (childBlock.type) {
                                  case "paragraph":
                                    return (
                                      <p key={childBlock.id} className="text-white">
                                        {childBlock.paragraph?.rich_text.map((text, index) => (
                                          <span key={index}>{text.plain_text}</span>
                                        ))}
                                      </p>
                                    );
                                  case "image":
                                    return (
                                      <img
                                        key={childBlock.id}
                                        src={childBlock.image?.file.url || ""}
                                        alt={childBlock.image?.caption || "Image"}
                                        onContextMenu={(e) => e.preventDefault()}
                                        draggable="false"
                                        className="w-full"
                                      />
                                    );
                                  case "numbered_list_item":
                                    return (
                                      <p key={childBlock.id} className="text-white font-bold text-lg md:text-xl">
                                        {childBlock.numbered_list_item?.rich_text.map((text, index) => (
                                          <span key={index}>{text.plain_text}</span>
                                        ))}
                                      </p>
                                    );
                                  default:
                                    return null;
                                }
                              })}
                            </div>
                          ))}
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
          <div className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 my-10 xl:my-20">
              {[...new Set(data.flatMap(item => item.properties?.["카테고리"].multi_select.map(tag => tag.name)))].sort().map((tag) => (
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
                filteredData
                  .sort((a, b) => {
                    const dateA = a.properties["날짜"]?.date?.start ? new Date(a.properties["날짜"]?.date?.start) : new Date(0);
                    const dateB = b.properties["날짜"]?.date?.start ? new Date(b.properties["날짜"]?.date?.start) : new Date(0);
                    return dateB.getTime() - dateA.getTime();
                  })
                  .map((item) => (
                    <div
                      key={item.id}
                      style={{ backgroundImage: `${item.cover?.file.url ? `url(${item.cover?.file.url})` : "none"}` }}
                      className="group aspect-[7/5] bg-cover bg-center bg-white/30 backdrop-blur-md p-4 rounded-3xl cursor-pointer transform transition-transform hover:scale-[98%] flex items-center justify-center text-center"
                      onClick={() => setSelectedPage(item)}
                    >
                      <div className="absolute w-full h-full bg-black opacity-0 group-hover:opacity-60 transition-opacity duration-300"></div>
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
