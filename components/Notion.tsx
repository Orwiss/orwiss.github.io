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
  heading_1?: { rich_text: RichText[] };
  heading_2?: { rich_text: RichText[] };
  heading_3?: { rich_text: RichText[] };
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
    <div className="flex justify-center h-full">
      <div className="w-[70vw] h-full flex flex-col items-center overflow-y-auto overscroll-none" style={{ WebkitOverflowScrolling: 'touch' }}>
        {selectedPage ? (
          <div className="w-full flex flex-col items-center pt-12 text-white pointer-events-auto">
            <div className="w-full flex flex-col items-center gap-3 xl:gap-4 mb-12">
              {/* <div className="fixed md:left-[15vw] px-7 py-2 z-10 rounded-full text-transparent bg-white/15 glassEffect">← 목록</div> */}
              <button className="fixed min-w-[120px] md:left-[15vw] px-7 py-3 rounded-full z-20" onClick={() => setSelectedPage(null)}>
                <div className="absolute inset-0 bg-white/10 glassEffect z-[-1] rounded-full"/>
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
                  <span key={tag.id} className="relative text-xs xl:text-sm px-4 py-2 rounded-full">
                    <div className="absolute inset-0 bg-white/10 glassEffect z-[-1] rounded-full" />
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4 w-full xl:w-[800px] mb-24">
              {blocks.length > 0 ? (
                blocks.map((block) => {
                  switch (block.type) {
                    case "heading_1":
                      return (
                        <h1 key={block.id} className="text-3xl xl:text-4xl font-bold text-white">
                          {block.heading_1?.rich_text.map((text, index) => (
                            <span key={index}>{text.plain_text}</span>
                          ))}
                        </h1>
                      );
                    case "heading_2":
                      return (
                        <h2 key={block.id} className="text-2xl xl:text-3xl font-bold text-white">
                          {block.heading_2?.rich_text.map((text, index) => (
                            <span key={index}>{text.plain_text}</span>
                          ))}
                        </h2>
                      );
                    case "heading_3":
                      return (
                        <h3 key={block.id} className="text-xl xl:text-2xl font-bold text-white">
                          {block.heading_3?.rich_text.map((text, index) => (
                            <span key={index}>{text.plain_text}</span>
                          ))}
                        </h3>
                      );
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
                        <a key={block.id} href={block.link_preview?.url || ""} target="_blank">
                          <p className="text-lg w-full font-bold underline break-words">{block.link_preview?.url}</p>
                        </a>
                      );
                    case "bookmark":
                      return (
                        <a key={block.id} href={block.bookmark?.url || ""} target="_blank">
                          <span className="text-lg w-full font-bold underline break-words">{block.bookmark?.url}</span>
                        </a>
                      );
                    case "divider":
                      return (
                        <hr key={block.id} className="w-full border-t-2 border-dashed border-white/30" />
                      );
                    case "column_list":
                      return (
                        <div key={block.id} className="w-full flex flex-1 flex-col sm:flex-row gap-4">
                          {(columnListData[block.id] || []).map((column) => (
                            <div key={column.id} className="flex flex-1 flex-col gap-4">
                              {(columnChildren[column.id] || []).map((childBlock) => {
                                switch (childBlock.type) {
                                  case "heading_1":
                                    return (
                                      <h1 key={childBlock.id} className="text-3xl xl:text-4xl font-bold text-white">
                                        {childBlock.heading_1?.rich_text.map((text, index) => (
                                          <span key={index}>{text.plain_text}</span>
                                        ))}
                                      </h1>
                                    );
                                  case "heading_2":
                                    return (
                                      <h2 key={childBlock.id} className="text-2xl xl:text-3xl font-bold text-white">
                                        {childBlock.heading_2?.rich_text.map((text, index) => (
                                          <span key={index}>{text.plain_text}</span>
                                        ))}
                                      </h2>
                                    );
                                  case "heading_3":
                                    return (
                                      <h3 key={childBlock.id} className="text-xl xl:text-2xl font-bold text-white">
                                        {childBlock.heading_3?.rich_text.map((text, index) => (
                                          <span key={index}>{text.plain_text}</span>
                                        ))}
                                      </h3>
                                    );
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
                <p className="text-gray-300">로딩 중...</p>
              )}
            </div>
          </div>
        ) : (
          <div className="w-full">
            <div className="flex flex-col sm:flex-row gap-4 my-10 xl:my-20">
              {[...new Set(data.flatMap(item => item.properties?.["카테고리"].multi_select.map(tag => tag.name)))].sort().map((tag) => (
                <button
                  key={tag}
                  className={`relative min-w-[120px] px-4 py-3 xl:px-6 rounded-full text-xs md:text-sm xl:text-lg font-light text-white border-0 hover:translate-y-[-4px] ${filter === tag ? 'bg-white/30' : 'bg-transparent text-black'} pointer-events-auto`}
                  onClick={() => setFilter(filter === tag ? null : tag)}
                >
                  <div className="absolute inset-0 bg-white/10 glassEffect z-[-1] rounded-full" />
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
                      className="group relative aspect-[7/5] p-4 rounded-3xl cursor-pointer transition-transform hover:scale-[98%] flex items-center justify-center text-center overflow-hidden"
                      onClick={() => setSelectedPage(item)}
                    >
                      <div className="absolute inset-0 bg-cover bg-center rounded-3xl" style={{ backgroundImage: item.cover?.file.url ? `url(${item.cover.file.url})` : "none" }}></div>
                      {!item.cover?.file.url && ( <div className="absolute inset-0 bg-white/10 glassEffect z-[-1] rounded-3xl" /> )}
                      <div className="absolute w-full h-full group-hover:bg-white/15 transition-opacity duration-500"></div>
                      
                      <h3 className="text-lg md:text-xl lg:text-2xl 2xl:text-3xl font-semibold text-transparent group-hover:text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.6)] break-words leading-tight text-center">
                        {item.properties.이름.title[0]?.plain_text || "No Name"}
                      </h3>
                    </div>
                  ))
              ) : (
                <p className="text-gray-300 col-span-full text-center">로딩 중...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
