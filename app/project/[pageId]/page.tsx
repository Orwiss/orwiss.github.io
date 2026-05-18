import Link from "next/link";
import { notFound } from "next/navigation";
import { preload } from "react-dom";
import type { Metadata } from "next";
import {
  PROJECT_LIST_LABEL,
  getProjectDetailData,
  type ProjectBlock,
} from "@/lib/projectNotion";
import { PageHeader } from "@/components/notion/PageHeader";
import { NotionBlocks } from "@/components/notion/Block";
import { optimizedImageUrl } from "@/lib/imageOptimize";

// Walk the block tree, collect every image URL we'll end up rendering.
// Server-side only — used solely to emit <link rel="preload"> hints
// into the HTML stream so the browser starts pulling the project's
// images IN PARALLEL with the halftone transition (which usually runs
// ~1.3s end-to-end). By the time the halftone retreats, most images
// are already in cache and the page reveals fully painted instead of
// popping in image-by-image after the user can see the layout.
function collectImageUrls(blocks: ProjectBlock[]): string[] {
  const urls: string[] = [];
  const walk = (list: ProjectBlock[]) => {
    for (const b of list) {
      if (b.type === "image") {
        const p = b[b.type] as
          | {
              file?: { url?: string };
              external?: { url?: string };
            }
          | undefined;
        const url = p?.file?.url ?? p?.external?.url;
        if (url) urls.push(url);
      }
      if (b.children?.length) walk(b.children);
    }
  };
  walk(blocks);
  return urls;
}

type Props = {
  params: Promise<{ pageId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pageId } = await params;
  return {
    title: "Project",
    alternates: { canonical: `/project/${pageId}` },
  };
}

export default async function ProjectDetailPage({ params }: Props) {
  const { pageId } = await params;
  const { page, blocks, error } = await getProjectDetailData(pageId);

  if (error) {
    return (
      <main className="h-full w-full flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-sm">{error}</p>
        <Link href="/" className="text-xs underline">
          ← {PROJECT_LIST_LABEL}
        </Link>
      </main>
    );
  }

  if (!page) {
    notFound();
  }

  // Stream <link rel="preload" as="image"> hints for every image in
  // the body BEFORE the children render. The browser sees these in the
  // streamed HTML head and begins fetching in parallel — during the
  // halftone transition the user is already watching, so the network
  // time is fully hidden.
  //
  // We preload the OPTIMIZED url (the same /_next/image?... the
  // <img> tag will request) so the preload and the actual img load
  // collapse into one fetch. Preloading the raw Notion URL would just
  // download the multi-MB original into a cache nothing else reads.
  for (const url of collectImageUrls(blocks)) {
    preload(optimizedImageUrl(url), { as: "image" });
  }

  return (
    // No MinLoader wrapper anymore — the global TransitionProvider in
    // app/layout.tsx covers the page with its halftone overlay during
    // both the leaving (previous page click) and arriving (this page
    // mount) phases. The page just renders normally underneath.
    <main className="h-full w-full overflow-y-auto">
      <PageHeader page={page} />
      <article className="max-w-3xl mx-auto px-6 pb-24 pt-2">
        <NotionBlocks blocks={blocks} />
      </article>
    </main>
  );
}
