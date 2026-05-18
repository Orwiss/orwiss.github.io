"use client";

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { ListView } from "@/components/ListView";
import { ViewToggle } from "@/components/ViewToggle";
import type { Project } from "@/lib/projects";

// Cheap equality check used to skip a re-render when the
// background-refreshed projects list matches the server-rendered one.
// We compare id / title / categoryId / year / tag count — anything
// finer would force a full deep compare on every cell of every tag
// array, which isn't worth the bookkeeping. If a tag was renamed the
// refresh just re-renders, which is fine.
function projectsEqual(a: Project[], b: Project[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.id !== y.id ||
      x.title !== y.title ||
      x.categoryId !== y.categoryId ||
      x.year !== y.year ||
      x.tags.length !== y.tags.length
    ) {
      return false;
    }
  }
  return true;
}

// Loading fallback while the MindMap chunk downloads. Minimal: the
// global TransitionProvider's halftone is already overlaid on top
// during the initial arriving phase, so a separate halftone here
// would just be a second canvas competing for the same space.
const MindMap = dynamic(() => import("@/components/MindMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
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

export default function HomeClient({
  projects: initialProjects,
}: {
  projects: Project[];
}) {
  const [projects, setProjects] = useState(initialProjects);

  // Background-refresh Notion during the MinLoader window so the user
  // sees the latest content as soon as the bloom fades, even when the
  // page was served from the 1hr ISR cache. The state swap happens
  // BEFORE MinLoader lifts most of the time (Notion fetch ≈ 200–500ms,
  // bloom min ≈ 750ms), so any layout reshuffle (e.g. MindMap's
  // randomised positions when projects[] reference changes) is hidden
  // behind the loader. If the fetch overshoots the window it'd still
  // update silently — projectsEqual skips the re-render when content
  // is unchanged, which is the common case.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/projects", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: { projects?: Project[] } | null) => {
        if (cancelled || !payload?.projects) return;
        setProjects((prev) =>
          projectsEqual(prev, payload.projects!) ? prev : payload.projects!,
        );
      })
      .catch(() => {
        // Network / Notion failure → keep the server-rendered list.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="h-full w-full overflow-hidden relative">
      {/* The global TransitionProvider in app/layout.tsx now owns the
          halftone overlay. We just render content underneath; the
          provider handles bloom-in on leave and bloom-out on arrive.
          Suspense fallback is minimal — useSearchParams normally
          resolves synchronously on the client. */}
      <Suspense fallback={<div className="h-full w-full" />}>
        <Switcher projects={projects} />
      </Suspense>
    </main>
  );
}
