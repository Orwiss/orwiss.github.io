import { Fragment } from "react";
import type { RichTextItem } from "@/lib/projectNotion";

// Notion colors → ignored in this monochrome prototype. Reintroduce here when
// the design system lands.
function annotationClass(ann: RichTextItem["annotations"] | undefined): string {
  if (!ann) return "";
  const parts: string[] = [];
  if (ann.bold) parts.push("font-semibold");
  if (ann.italic) parts.push("italic");
  if (ann.underline) parts.push("underline underline-offset-2");
  if (ann.strikethrough) parts.push("line-through");
  if (ann.code) {
    parts.push("font-mono text-[0.92em] bg-black/[0.06] border border-black/15 px-1");
  }
  return parts.join(" ");
}

export function RichText({ items }: { items?: RichTextItem[] }) {
  if (!items || items.length === 0) return null;

  return (
    <>
      {items.map((item, i) => {
        const text = item.plain_text;
        if (!text) return null;

        const cls = annotationClass(item.annotations);
        const inline = cls ? <span className={cls}>{text}</span> : <Fragment>{text}</Fragment>;

        const href = item.href ?? item.text?.link?.url ?? null;
        if (href) {
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-70"
            >
              {inline}
            </a>
          );
        }
        return <Fragment key={i}>{inline}</Fragment>;
      })}
    </>
  );
}

// Helper for blocks that only need the joined plain text (code blocks, equations).
export function richToPlainText(items?: RichTextItem[]): string {
  return (items ?? []).map((r) => r.plain_text).join("");
}
