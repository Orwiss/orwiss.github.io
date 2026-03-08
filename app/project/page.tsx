import type { Metadata } from "next";
import Projects from "@/components/Notion";

export const revalidate = 300;
export const metadata: Metadata = {
  title: "Projects",
  description:
    "Interactive art, generative experiments, and design projects by Sunghun Park (Orwiss).",
  alternates: {
    canonical: "/project",
  },
};

export default function ProjectPage() {
  return <Projects />;
}
