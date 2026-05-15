import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  PROJECT_LIST_LABEL,
  getProjectDetailData,
} from "@/lib/projectNotion";
import { PageHeader } from "@/components/notion/PageHeader";
import { NotionBlocks } from "@/components/notion/Block";

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

  return (
    <main className="h-full w-full overflow-y-auto">
      <PageHeader page={page} />
      <article className="max-w-3xl mx-auto px-6 pb-24 pt-2">
        <NotionBlocks blocks={blocks} />
      </article>
    </main>
  );
}
