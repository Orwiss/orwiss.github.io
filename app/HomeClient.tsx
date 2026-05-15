"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ListView } from "@/components/ListView";
import { ViewToggle } from "@/components/ViewToggle";
import type { Project } from "@/lib/projects";

const MindMap = dynamic(() => import("@/components/MindMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center">
      <span className="text-sm text-neutral-500">loading…</span>
    </div>
  ),
});

function Switcher({ projects }: { projects: Project[] }) {
  const search = useSearchParams();
  const view: "map" | "list" = search.get("view") === "list" ? "list" : "map";

  return (
    <>
      <ViewToggle current={view} />
      {view === "list" ? (
        <ListView projects={projects} />
      ) : (
        <MindMap projects={projects} />
      )}
    </>
  );
}

export default function HomeClient({ projects }: { projects: Project[] }) {
  return (
    <main className="h-full w-full overflow-hidden relative">
      <Suspense fallback={<MindMap projects={projects} />}>
        <Switcher projects={projects} />
      </Suspense>
    </main>
  );
}
