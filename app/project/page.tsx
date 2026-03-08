import type { Metadata } from "next";
import Projects from "@/components/Notion";
import { getProjectListData } from "@/lib/projectNotion";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Projects",
  description:
    "Interactive art, generative experiments, and design projects by Sunghun Park (Orwiss).",
  alternates: {
    canonical: "/project",
  },
};

export default async function ProjectPage() {
  const { results, error } = await getProjectListData();

  return <Projects initialData={results} initialError={error} />;
}
