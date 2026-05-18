"use client";

import { SmoothLink } from "./SmoothLink";

type View = "map" | "list";

// Map/list toggle only changes the search param — same pathname both
// ways — so SmoothLink/navigate() will short-circuit the halftone
// transition and just call router.push. The Switcher re-renders the
// view in place.
export function ViewToggle({ current }: { current: View }) {
  return (
    <nav className="fixed top-4 right-4 z-[1000] flex gap-1 font-mono text-sm uppercase tracking-wider">
      <SmoothLink
        href="/"
        className={`px-3 py-1.5 border border-black transition-colors ${
          current === "map"
            ? "bg-black text-white"
            : "bg-white hover:bg-black hover:text-white"
        }`}
      >
        map
      </SmoothLink>
      <SmoothLink
        href="/?view=list"
        className={`px-3 py-1.5 border border-black transition-colors ${
          current === "list"
            ? "bg-black text-white"
            : "bg-white hover:bg-black hover:text-white"
        }`}
      >
        list
      </SmoothLink>
    </nav>
  );
}
