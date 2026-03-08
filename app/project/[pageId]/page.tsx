import type { Metadata } from "next";
import ProjectDetail from "@/components/ProjectDetail";

type ProjectDetailPageProps = {
  params: {
    pageId: string;
  };
};

export async function generateMetadata({ params }: ProjectDetailPageProps): Promise<Metadata> {
  return {
    title: "Project",
    description: "Project details for Sunghun Park (Orwiss).",
    alternates: {
      canonical: `/project/${params.pageId}`,
    },
  };
}

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  return <ProjectDetail pageId={params.pageId} />;
}
