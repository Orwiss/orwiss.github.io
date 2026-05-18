import Link from "next/link";
import type { ProjectBlock, RichTextItem } from "@/lib/projectNotion";
import { optimizedImageUrl } from "@/lib/imageOptimize";
import { RichText, richToPlainText } from "./RichText";

type AnyRecord = Record<string, unknown>;

function payload(block: ProjectBlock): AnyRecord {
  return (block[block.type] as AnyRecord) ?? {};
}

function readRich(p: AnyRecord): RichTextItem[] {
  return (p.rich_text as RichTextItem[] | undefined) ?? [];
}

function readFileUrl(p: AnyRecord): string {
  const file = p.file as { url?: string } | undefined;
  const external = p.external as { url?: string } | undefined;
  return file?.url ?? external?.url ?? "";
}

// === List grouping ===
// Notion returns consecutive bulleted/numbered items as separate blocks.
// We group them into a single <ul> / <ol> so semantics + spacing are correct.

type GroupedBlock =
  | { kind: "single"; block: ProjectBlock }
  | { kind: "list"; listType: "bulleted" | "numbered"; items: ProjectBlock[] };

function groupBlocks(blocks: ProjectBlock[]): GroupedBlock[] {
  const groups: GroupedBlock[] = [];
  let current: { listType: "bulleted" | "numbered"; items: ProjectBlock[] } | null = null;

  const flush = () => {
    if (current) {
      groups.push({ kind: "list", listType: current.listType, items: current.items });
      current = null;
    }
  };

  for (const block of blocks) {
    const listType: "bulleted" | "numbered" | null =
      block.type === "bulleted_list_item"
        ? "bulleted"
        : block.type === "numbered_list_item"
          ? "numbered"
          : null;

    if (listType) {
      if (current && current.listType === listType) {
        current.items.push(block);
      } else {
        flush();
        current = { listType, items: [block] };
      }
    } else {
      flush();
      groups.push({ kind: "single", block });
    }
  }
  flush();
  return groups;
}

// === Top-level renderer ===
//
// `priorityImageUrls`: Set of URLs the parent has decided count as
// above-the-fold. Image blocks whose url is in this set render eagerly
// (and the project page preloads them); everything else renders with
// loading="lazy" so it doesn't compete for bandwidth on first paint
// and doesn't block the TransitionProvider's image-await gate.

type BlocksProps = {
  blocks: ProjectBlock[];
  priorityImageUrls?: Set<string>;
};

export function NotionBlocks({ blocks, priorityImageUrls }: BlocksProps) {
  const groups = groupBlocks(blocks);
  return (
    <>
      {groups.map((g, i) => {
        if (g.kind === "list") {
          return (
            <ListGroup
              key={i}
              listType={g.listType}
              items={g.items}
              priorityImageUrls={priorityImageUrls}
            />
          );
        }
        return (
          <SingleBlock
            key={g.block.id}
            block={g.block}
            priorityImageUrls={priorityImageUrls}
          />
        );
      })}
    </>
  );
}

function ListGroup({
  listType,
  items,
  priorityImageUrls,
}: {
  listType: "bulleted" | "numbered";
  items: ProjectBlock[];
  priorityImageUrls?: Set<string>;
}) {
  const Tag = listType === "bulleted" ? "ul" : "ol";
  const listCls =
    listType === "bulleted"
      ? "list-disc pl-6 my-3 space-y-1.5"
      : "list-decimal pl-6 my-3 space-y-1.5";
  return (
    <Tag className={listCls}>
      {items.map((item) => {
        const p = payload(item);
        return (
          <li key={item.id} className="text-sm leading-relaxed marker:text-black">
            <RichText items={readRich(p)} />
            {item.children && item.children.length > 0 ? (
              <div className="mt-1.5">
                <NotionBlocks
                  blocks={item.children}
                  priorityImageUrls={priorityImageUrls}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </Tag>
  );
}

// === Per-block rendering ===

function SingleBlock({
  block,
  priorityImageUrls,
}: {
  block: ProjectBlock;
  priorityImageUrls?: Set<string>;
}) {
  const p = payload(block);
  const rich = readRich(p);

  switch (block.type) {
    case "paragraph":
      // Empty paragraphs are how authors add vertical space; preserve them.
      if (rich.length === 0 && (!block.children || block.children.length === 0)) {
        return <p className="my-3 text-sm leading-relaxed">&nbsp;</p>;
      }
      return (
        <p className="text-sm leading-relaxed my-3">
          <RichText items={rich} />
          {block.children && block.children.length > 0 ? (
            <span className="block mt-2 ml-3 border-l border-black/15 pl-3">
              <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
            </span>
          ) : null}
        </p>
      );

    case "heading_1":
      return (
        <h1 className="text-3xl font-semibold tracking-tight mt-14 mb-4">
          <RichText items={rich} />
        </h1>
      );
    case "heading_2":
      return (
        <h2 className="text-2xl font-semibold tracking-tight mt-10 mb-3">
          <RichText items={rich} />
        </h2>
      );
    case "heading_3":
      return (
        <h3 className="text-lg font-semibold tracking-tight mt-7 mb-2">
          <RichText items={rich} />
        </h3>
      );

    case "to_do": {
      const checked = Boolean(p.checked);
      return (
        <div className="text-sm leading-relaxed my-1.5 flex gap-2 items-start">
          <span className="mt-[3px] inline-block w-3.5 h-3.5 border border-black flex-shrink-0">
            {checked ? <span className="block w-full h-full bg-black" /> : null}
          </span>
          <div className="flex-1">
            <span className={checked ? "line-through opacity-60" : ""}>
              <RichText items={rich} />
            </span>
            {block.children && block.children.length > 0 ? (
              <div className="mt-1.5">
                <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
              </div>
            ) : null}
          </div>
        </div>
      );
    }

    case "toggle":
      return (
        <details className="my-3 border border-black/15 px-3 py-2 group">
          <summary className="cursor-pointer text-sm select-none list-none flex items-start gap-2">
            <span className="inline-block mt-[3px] text-[0.6rem] transition-transform group-open:rotate-90">▶</span>
            <span className="flex-1">
              <RichText items={rich} />
            </span>
          </summary>
          {block.children && block.children.length > 0 ? (
            <div className="mt-2 ml-4">
              <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
            </div>
          ) : null}
        </details>
      );

    case "quote":
      return (
        <blockquote className="border-l-2 border-black pl-4 my-5 text-sm italic">
          <RichText items={rich} />
          {block.children && block.children.length > 0 ? (
            <div className="mt-2 not-italic">
              <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
            </div>
          ) : null}
        </blockquote>
      );

    case "callout": {
      const icon = p.icon as
        | { type?: string; emoji?: string; external?: { url?: string }; file?: { url?: string } }
        | undefined;
      return (
        <aside className="border border-black my-5 p-4 flex gap-3 text-sm">
          {icon?.type === "emoji" && icon.emoji ? (
            <span className="text-base leading-none mt-[1px] flex-shrink-0">{icon.emoji}</span>
          ) : null}
          <div className="flex-1">
            <RichText items={rich} />
            {block.children && block.children.length > 0 ? (
              <div className="mt-2">
                <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
              </div>
            ) : null}
          </div>
        </aside>
      );
    }

    case "code": {
      const lang = typeof p.language === "string" ? p.language : "text";
      const code = richToPlainText(rich);
      return (
        <pre className="border border-black/20 my-5 p-4 overflow-x-auto text-xs leading-relaxed font-mono bg-black/[0.03]">
          <code data-language={lang}>{code}</code>
        </pre>
      );
    }

    case "divider":
      return <hr className="border-t border-black my-10" />;

    case "image": {
      const url = readFileUrl(p);
      const caption = richToPlainText((p.caption as RichTextItem[] | undefined) ?? []);
      if (!url) return null;
      // Above-the-fold images (set by the page server-side) load eagerly
      // and have their <link rel="preload"> hint streamed; the rest
      // render with loading="lazy" so the browser defers them until
      // scroll. TransitionProvider also skips lazy <img> in its
      // image-await gate, so they never block page reveal.
      const isPriority = priorityImageUrls?.has(url) ?? false;
      return (
        <figure className="my-6 select-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={optimizedImageUrl(url)}
            alt={caption || ""}
            decoding="async"
            loading={isPriority ? "eager" : "lazy"}
            fetchPriority={isPriority ? "high" : "auto"}
            // pointer-events-none means right-click never lands on the
            // <img> element itself — the browser falls back to the
            // parent's default context menu which doesn't include
            // "Save Image As". Pure CSS so this can stay a server
            // component (event handlers like onContextMenu would force
            // "use client" + a hydration cost on every Block).
            className="w-full block pointer-events-none"
            draggable={false}
          />
          {caption ? (
            <figcaption className="mt-2 text-xs opacity-60 text-center">{caption}</figcaption>
          ) : null}
        </figure>
      );
    }

    case "video":
      return <NotionVideo block={block} />;

    case "audio": {
      const url = readFileUrl(p);
      if (!url) return null;
      return <audio src={url} controls className="w-full my-4" />;
    }

    case "file": {
      const url = readFileUrl(p);
      const captionText = richToPlainText((p.caption as RichTextItem[] | undefined) ?? []);
      const name =
        captionText ||
        (() => {
          try {
            return new URL(url).pathname.split("/").pop() ?? "file";
          } catch {
            return "file";
          }
        })();
      if (!url) return null;
      return (
        <a
          href={url}
          className="block border border-black p-3 my-3 text-sm underline break-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          ↓ {name}
        </a>
      );
    }

    case "pdf": {
      const url = readFileUrl(p);
      if (!url) return null;
      return (
        <object
          data={url}
          type="application/pdf"
          className="w-full h-[80vh] my-5 border border-black"
        >
          <a
            href={url}
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View PDF
          </a>
        </object>
      );
    }

    case "bookmark":
    case "link_preview":
    case "embed": {
      const url = (p.url as string | undefined) ?? "";
      if (!url) return null;
      const caption = richToPlainText((p.caption as RichTextItem[] | undefined) ?? []);
      return (
        <a
          href={url}
          className="block border border-black p-3 my-3 text-sm underline break-all"
          target="_blank"
          rel="noopener noreferrer"
        >
          {caption || url}
        </a>
      );
    }

    case "equation": {
      const expr = (p.expression as string | undefined) ?? "";
      return <p className="font-mono text-sm my-4 text-center">{expr}</p>;
    }

    case "table": {
      const hasHeader = Boolean(p.has_column_header);
      const rows = block.children ?? [];
      return (
        <div className="my-5 overflow-x-auto">
          <table className="border-collapse border border-black w-full text-xs">
            <tbody>
              {rows.map((row, i) => {
                const cells =
                  ((row.table_row as { cells?: RichTextItem[][] } | undefined)?.cells) ?? [];
                const isHeader = i === 0 && hasHeader;
                return (
                  <tr key={row.id}>
                    {cells.map((cell, j) => {
                      if (isHeader) {
                        return (
                          <th
                            key={j}
                            className="border border-black px-2 py-1 text-left font-semibold bg-black/[0.05]"
                          >
                            <RichText items={cell} />
                          </th>
                        );
                      }
                      return (
                        <td key={j} className="border border-black px-2 py-1 text-left">
                          <RichText items={cell} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    case "column_list":
      return (
        <div className="flex flex-col sm:flex-row gap-6 my-5">
          {(block.children ?? []).map((col) => (
            <div key={col.id} className="flex-1 min-w-0">
              {col.children && col.children.length > 0 ? (
                <NotionBlocks
                  blocks={col.children}
                  priorityImageUrls={priorityImageUrls}
                />
              ) : null}
            </div>
          ))}
        </div>
      );

    case "column":
      return block.children && block.children.length > 0 ? (
        <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
      ) : null;

    case "child_page": {
      const title = typeof p.title === "string" ? p.title : "Untitled";
      return (
        <Link
          href={`/project/${block.id}`}
          className="block border border-black/30 px-3 py-2 my-2 text-sm underline hover:bg-black hover:text-white transition-colors"
        >
          ↳ {title}
        </Link>
      );
    }

    case "child_database": {
      const title = typeof p.title === "string" ? p.title : "untitled";
      return (
        <div className="border border-black/20 px-3 py-2 my-2 text-xs opacity-60">
          [database: {title}]
        </div>
      );
    }

    case "synced_block":
      return block.children && block.children.length > 0 ? (
        <NotionBlocks blocks={block.children} priorityImageUrls={priorityImageUrls} />
      ) : null;

    case "link_to_page": {
      const target =
        (p.page_id as string | undefined) ?? (p.database_id as string | undefined) ?? "";
      if (!target) return null;
      return (
        <Link
          href={`/project/${target}`}
          className="inline-block underline text-sm my-2"
        >
          → {target}
        </Link>
      );
    }

    // Intentionally rendered as nothing — these are navigational chrome the
    // Notion app draws and rarely useful in a portfolio detail context.
    case "breadcrumb":
    case "table_of_contents":
    case "template":
      return null;

    case "unsupported":
      return (
        <div className="border border-dashed border-black/30 my-3 px-3 py-2 text-xs opacity-50">
          [unsupported block]
        </div>
      );

    default:
      // Last-resort fallback: render rich_text if the unknown block happens
      // to carry one. Otherwise drop it.
      if (rich.length > 0) {
        return (
          <p className="text-sm leading-relaxed my-2 opacity-60">
            <RichText items={rich} />
          </p>
        );
      }
      return null;
  }
}

// === Video helper ===

function NotionVideo({ block }: { block: ProjectBlock }) {
  const p = (block.video as AnyRecord | undefined) ?? {};
  const type = typeof p.type === "string" ? p.type : "";

  if (type === "file") {
    const url = (p.file as { url?: string } | undefined)?.url ?? "";
    if (!url) return null;
    return (
      <video
        src={url}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
        controlsList="nodownload"
        // pointer-events-none routes right-click to the parent, which
        // doesn't show the video-specific "Save Video As" menu. CSS-only
        // so this stays a server component.
        className="w-full my-5 block pointer-events-none select-none"
        draggable={false}
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  if (type === "external") {
    const url = (p.external as { url?: string } | undefined)?.url ?? "";
    if (!url) return null;
    const videoId = extractYouTubeId(url);
    if (videoId) {
      return (
        <iframe
          className="w-full aspect-video my-5 border border-black"
          src={`https://www.youtube.com/embed/${videoId}?mute=1&rel=0&playsinline=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      );
    }
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="block border border-black p-3 my-3 text-sm underline break-all"
      >
        {url}
      </a>
    );
  }
  return null;
}

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      return u.pathname.split("/").filter(Boolean)[0] ?? null;
    }
    const v = u.searchParams.get("v");
    if (v) return v;
    // /embed/<id> or /shorts/<id>
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && (parts[0] === "embed" || parts[0] === "shorts")) {
      return parts[1] ?? null;
    }
    return null;
  } catch {
    return null;
  }
}
