"use client";

import Link from "next/link";

type View = "map" | "list";

export function ViewToggle({ current }: { current: View }) {
  return (
    <nav className="fixed top-4 right-4 z-[1000] flex gap-1 font-mono text-sm uppercase tracking-wider">
      <Link
        href="/"
        className={`px-3 py-1.5 border border-black transition-colors ${
          current === "map"
            ? "bg-black text-white"
            : "bg-white hover:bg-black hover:text-white"
        }`}
      >
        map
      </Link>
      <Link
        href="/?view=list"
        className={`px-3 py-1.5 border border-black transition-colors ${
          current === "list"
            ? "bg-black text-white"
            : "bg-white hover:bg-black hover:text-white"
        }`}
      >
        list
      </Link>
    </nav>
  );
}
