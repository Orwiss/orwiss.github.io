import type { Metadata } from "next";
import LinkSection from "@/components/Link";

export const metadata: Metadata = {
  title: "Links",
  description:
    "External links for Sunghun Park (Orwiss), including Instagram, OpenProcessing, GitHub, and CV.",
  alternates: {
    canonical: "/link",
  },
};

export default function LinkRoute() {
  return <LinkSection />;
}
