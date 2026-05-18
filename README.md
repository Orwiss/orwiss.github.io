# hyperreach

Sunghun Park portfolio renewal built with Next.js, Notion, React Flow, and a custom halftone visual system.

This branch also contains a reusable Notion page renderer. If you only want to copy the Notion components into another Next.js app, start with the section below.

## Reusing The Notion Renderer

The renderer is not packaged as a library yet. Treat it as copyable source code.

Copy these files first:

```text
components/notion/Block.tsx
components/notion/PageHeader.tsx
components/notion/RichText.tsx
lib/projectNotion.ts
lib/notion.ts
lib/http.ts
```

If you want the built-in API proxy and cover-image proxy, copy these routes too:

```text
app/api/notion/route.ts
app/api/notion/page/[pageId]/route.ts
app/api/notion/block/[blockId]/route.ts
app/api/notion/cover/[pageId]/route.ts
```

Install the Notion client:

```bash
npm install @notionhq/client
```

Set environment variables:

```bash
NOTION_API_KEY=
NOTION_DATABASE_ID=
# Optional, recommended for Notion API 2025 data-source projects:
NOTION_DATA_SOURCE_ID=

# Optional local/proxy fallback:
NEXT_PUBLIC_SITE_URL=
NOTION_DEV_PROXY_ORIGIN=
```

`lib/projectNotion.ts` contains project-specific Notion database property names. Change these constants to match your database:

```ts
export const PROJECT_TITLE_PROPERTY = "...";
export const PROJECT_DATE_PROPERTY = "...";
export const PROJECT_CATEGORY_PROPERTY = "...";
export const PROJECT_TOOLS_PROPERTY = "...";
export const PROJECT_PARTICIPANTS_PROPERTY = "...";
```

Minimal App Router page:

```tsx
import { notFound } from "next/navigation";
import { getProjectDetailData } from "@/lib/projectNotion";
import { PageHeader } from "@/components/notion/PageHeader";
import { NotionBlocks } from "@/components/notion/Block";

type Props = {
  params: Promise<{ pageId: string }>;
};

export default async function Page({ params }: Props) {
  const { pageId } = await params;
  const { page, blocks, error } = await getProjectDetailData(pageId);

  if (error) {
    return <main>{error}</main>;
  }

  if (!page) {
    notFound();
  }

  return (
    <main>
      <PageHeader page={page} />
      <article>
        <NotionBlocks blocks={blocks} />
      </article>
    </main>
  );
}
```

Supported block coverage:

- Paragraphs, headings, rich text annotations, links
- Bulleted and numbered lists, including consecutive-list grouping
- Todos, toggles, quotes, callouts, dividers
- Code, equations, tables, columns
- Images, videos, audio, files, PDFs, embeds/bookmarks
- Child pages, child databases, synced blocks, unsupported fallbacks
- Nested container blocks are hydrated recursively up to a bounded depth

Notes before copying:

- The components use Tailwind classes. If your app does not use Tailwind, replace the `className` values with your own CSS.
- `PageHeader.tsx` is portfolio-specific. You can skip it and use only `NotionBlocks` if you only need body rendering.
- Notion file URLs expire. Keep the cover proxy route if you display Notion-hosted cover images.
- The renderer intentionally ignores Notion color annotations in this prototype to keep the design monochrome. Reintroduce color handling in `components/notion/RichText.tsx` if needed.
- The code uses Next App Router conventions and server components.

## Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Main App Structure

```text
app/page.tsx                       Home data load
app/HomeClient.tsx                 Map/list view switcher
components/MindMap.tsx             React Flow portfolio map
components/ListView.tsx            Category-grouped list view
components/HalftoneBloom.tsx       Loading bloom canvas
components/MinLoader.tsx           Minimum-duration loader wrapper
components/notion/*                Notion page renderer
lib/projectNotion.ts               Notion project/page data access
lib/projectMap.ts                  Notion page -> local project model
lib/projects.ts                    Static portfolio categories
```
