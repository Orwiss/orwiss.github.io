"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ListView } from "@/components/ListView";
import { ViewToggle } from "@/components/ViewToggle";
import type { Project } from "@/lib/projects";

// Loading fallback while the MindMap chunk downloads. Visually
// identical to app/loading.tsx so the transition from "route
// loading" → "chunk loading" → "MindMap fading in" reads as one
// continuous wait, not three different placeholders.
const MindMap = dynamic(() => import("@/components/MindMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <div className="text-sm tracking-wide opacity-50 select-none">
        <span>loading</span>
        <span className="inline-block animate-pulse">…</span>
      </div>
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
