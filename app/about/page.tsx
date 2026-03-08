import type { Metadata } from "next";
import About from "@/components/About";

export const metadata: Metadata = {
  title: "About",
  description:
    "Background, education, exhibitions, and selected work by Sunghun Park (Orwiss).",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return <About />;
}
