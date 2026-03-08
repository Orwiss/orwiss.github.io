"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  PROJECT_DETAIL_ERROR_LABEL,
  PROJECT_LIST_LABEL,
  PROJECT_LOADING_LABEL,
  ProjectBlock,
  ProjectPage,
  getProjectParticipants,
  getProjectTitle,
  getProjectTools,
} from "@/lib/projectNotion";

type ProjectDetailProps = {
  pageId: string;
};

type ProjectPagePayload = {
  page?: ProjectPage;
  blocks?: ProjectBlock[];
  error?: string;
};

type ProjectBlockPayload = {
  blocks?: ProjectBlock[];
  error?: string;
};

function renderRichText(texts?: { plain_text: string }[]) {
  return texts?.map((text, index) => <span key={index}>{text.plain_text}</span>) ?? null;
}

function renderVideo(block: ProjectBlock) {
  if (block.video?.type === "file") {
    return (
      <video
        key={block.id}
        src={block.video.file?.url || ""}
        onContextMenu={(event) => event.preventDefault()}
        draggable="false"
        autoPlay
        loop
        className="w-full"
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  if (block.video?.type === "external") {
    const url = block.video.external?.url;
    let videoId = "";

    if (url) {
      try {
        const urlObject = new URL(url);
        videoId = urlObject.searchParams.get("v") || url.split("/").pop() || "";
      } catch (error) {
        console.error(error);
      }
    }

    return (
      <iframe
        key={block.id}
        className="w-full aspect-video"
        src={`https://www.youtube.com/embed/${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return null;
}

function renderBlock(
  block: ProjectBlock,
  columnListData: Record<string, ProjectBlock[]>,
  columnChildren: Record<string, ProjectBlock[]>
) {
  switch (block.type) {
    case "heading_1":
      return (
        <h1 key={block.id} className="text-3xl xl:text-4xl font-bold text-white">
          {renderRichText(block.heading_1?.rich_text)}
        </h1>
      );
    case "heading_2":
      return (
        <h2 key={block.id} className="text-2xl xl:text-3xl font-bold text-white">
          {renderRichText(block.heading_2?.rich_text)}
        </h2>
      );
    case "heading_3":
      return (
        <h3 key={block.id} className="text-xl xl:text-2xl font-bold text-white">
          {renderRichText(block.heading_3?.rich_text)}
        </h3>
      );
    case "paragraph":
      return (
        <p key={block.id} className="text-white">
          {renderRichText(block.paragraph?.rich_text)}
        </p>
      );
    case "numbered_list_item":
      return (
        <p key={block.id} className="text-white font-bold text-lg md:text-xl">
          {renderRichText(block.numbered_list_item?.rich_text)}
        </p>
      );
    case "image":
      return (
        <img
          key={block.id}
          src={block.image?.file?.url || ""}
          alt={block.image?.caption || "Image"}
          onContextMenu={(event) => event.preventDefault()}
          draggable="false"
          className="w-full"
        />
      );
    case "video":
      return renderVideo(block);
    case "link_preview":
      return (
        <a key={block.id} href={block.link_preview?.url || ""} target="_blank" rel="noopener noreferrer">
          <p className="text-lg w-full font-bold underline break-words">{block.link_preview?.url}</p>
        </a>
      );
    case "bookmark":
      return (
        <a key={block.id} href={block.bookmark?.url || ""} target="_blank" rel="noopener noreferrer">
          <span className="text-lg w-full font-bold underline break-words">{block.bookmark?.url}</span>
        </a>
      );
    case "divider":
      return <hr key={block.id} className="w-full border-t-2 border-dashed border-white/30" />;
    case "column_list":
      return (
        <div key={block.id} className="w-full flex flex-1 flex-col sm:flex-row gap-4">
          {(columnListData[block.id] || []).map((column) => (
            <div key={column.id} className="flex flex-1 flex-col gap-4">
              {(columnChildren[column.id] || []).map((childBlock) =>
                renderBlock(childBlock, columnListData, columnChildren)
              )}
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}

export default function ProjectDetail({ pageId }: ProjectDetailProps) {
  const [page, setPage] = useState<ProjectPage | null>(null);
  const [blocks, setBlocks] = useState<ProjectBlock[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [columnListData, setColumnListData] = useState<Record<string, ProjectBlock[]>>({});
  const [columnChildren, setColumnChildren] = useState<Record<string, ProjectBlock[]>>({});

  const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      try {
        setPageError(null);
        setBlocks([]);
        setPage(null);

        const response = await fetch(`/api/notion/page/${pageId}`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as ProjectPagePayload;

        if (!response.ok) {
          throw new Error(payload.error || PROJECT_DETAIL_ERROR_LABEL);
        }

        if (!cancelled) {
          setPage(payload.page ?? null);
          setBlocks(payload.blocks || []);
        }
      } catch (error) {
        console.error("Error fetching page blocks:", error);

        if (!cancelled) {
          setBlocks([]);
          setPage(null);
          setPageError(getErrorMessage(error, PROJECT_DETAIL_ERROR_LABEL));
        }
      }
    };

    loadPage();

    return () => {
      cancelled = true;
    };
  }, [pageId]);

  useEffect(() => {
    setColumnListData({});
    setColumnChildren({});

    blocks.forEach((block) => {
      if (block.type === "column_list") {
        fetch(`/api/notion/block/${block.id}`)
          .then(async (response) => {
            const payload = (await response.json()) as ProjectBlockPayload;

            if (!response.ok) {
              throw new Error(payload.error || "Failed to fetch column list.");
            }

            setColumnListData((previous) => ({ ...previous, [block.id]: payload.blocks || [] }));
            (payload.blocks || []).forEach((column) => {
              if (column.has_children && !columnChildren[column.id]) {
                fetch(`/api/notion/block/${column.id}`)
                  .then(async (childResponse) => {
                    const childPayload = (await childResponse.json()) as ProjectBlockPayload;

                    if (!childResponse.ok) {
                      throw new Error(childPayload.error || "Failed to fetch column.");
                    }

                    setColumnChildren((previous) => ({
                      ...previous,
                      [column.id]: childPayload.blocks || [],
                    }));
                  })
                  .catch((error) => console.error("Error fetching column children:", error));
              }
            });
          })
          .catch((error) => console.error("Error fetching column_list children:", error));
      }
    });
  }, [blocks]);

  return (
    <div className="flex justify-center h-full">
      <div
        className="w-[70vw] h-full flex flex-col items-center overflow-y-auto overscroll-none"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="w-full flex flex-col items-center pt-12 text-white pointer-events-auto">
          <div className="w-full flex flex-col items-center gap-3 xl:gap-4 mb-12">
            <Link
              href="/project"
              className="fixed min-w-[120px] md:left-[15vw] px-7 py-3 rounded-full z-20 pointer-events-auto"
            >
              <div className="absolute inset-0 bg-black/10 glassEffect z-[-1] rounded-full" />
              {PROJECT_LIST_LABEL}
            </Link>
            <h2 className="text-3xl xl:text-5xl font-bold mt-24 md:mt-0 text-center break-keep">
              {page ? getProjectTitle(page) : "No Title"}
            </h2>
            <p className="text-md xl:text-lg whitespace-pre-wrap text-center break-keep">
              {page ? getProjectParticipants(page)[0]?.plain_text || "No Content" : ""}
            </p>
            <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
              {page
                ? getProjectTools(page).map((tag) => (
                    <span key={tag.id} className="relative text-xs xl:text-sm px-4 py-2 rounded-full">
                      <div className="absolute inset-0 bg-black/10 glassEffect z-[-1] rounded-full" />
                      {tag.name}
                    </span>
                  ))
                : null}
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full xl:w-[800px] mb-24">
            {pageError ? (
              <p className="text-gray-300">{pageError}</p>
            ) : blocks.length > 0 ? (
              blocks.map((block) => renderBlock(block, columnListData, columnChildren))
            ) : (
              <p className="text-gray-300">{PROJECT_LOADING_LABEL}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
