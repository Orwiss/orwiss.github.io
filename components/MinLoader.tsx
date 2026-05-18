"use client";

import { useEffect, useState, type ReactNode } from "react";
import { HalftoneBloom } from "./HalftoneBloom";

// Guaranteed-minimum loading overlay. The route-segment loading.tsx
// flashes too briefly when server fetch is fast (sometimes < 100ms);
// this wrapper sits INSIDE the page and forces the halftone bloom to
// stay on top of the (already-rendered) content for at least `minMs`,
// so the user always perceives a deliberate transition into the page.
//
// Mechanics:
//   - children render normally underneath — no hydration skew, no
//     re-render when the loader lifts.
//   - HalftoneBloom canvas sits absolute on top. After `minMs`, we
//     flip its `exiting` prop → the bloom RETREATS to the centre
//     (reverse-bloom over EXIT_MS) instead of fading via opacity.
//     This was the user-reported "뚝 끊김" fix: the previous opacity
//     fade made the halftone vanish abruptly rather than gracefully
//     pulling back.
//   - Content cross-fades in via opacity, so the halftone exit and
//     content reveal run in parallel as one beat.
//   - After EXIT_MS we unmount the canvas wrapper entirely so its
//     RAF stops eating CPU on otherwise-idle pages.
const EXIT_MS = 550;
const ENTER_MS = 250;

export function MinLoader({
  minMs = 750,
  children,
}: {
  minMs?: number;
  children: ReactNode;
}) {
  // `mounted` drives a fade-in of the loader overlay on first mount —
  // route navigations swap the page DOM instantly, so without this the
  // MinLoader popped into view at full opacity simultaneously with the
  // previous page disappearing, which read as an abrupt cut. Two RAFs
  // ensure the initial opacity:0 paint commits BEFORE the transition
  // to opacity:1 starts (React would otherwise batch both states into
  // a single layout pass and the browser would skip the animation).
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  const [unmount, setUnmount] = useState(false);

  useEffect(() => {
    let r1 = 0;
    const r0 = requestAnimationFrame(() => {
      r1 = requestAnimationFrame(() => setMounted(true));
    });
    return () => {
      cancelAnimationFrame(r0);
      if (r1) cancelAnimationFrame(r1);
    };
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), minMs);
    return () => window.clearTimeout(t);
  }, [minMs]);

  useEffect(() => {
    if (!ready) return;
    const t = window.setTimeout(() => setUnmount(true), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [ready]);

  return (
    <div className="relative h-full w-full">
      <div
        className="h-full w-full transition-opacity ease-out"
        style={{
          opacity: ready ? 1 : 0,
          transitionDuration: `${EXIT_MS}ms`,
        }}
      >
        {children}
      </div>
      {!unmount && (
        <div
          aria-hidden
          className="absolute inset-0 transition-opacity ease-out"
          style={{
            opacity: mounted ? 1 : 0,
            transitionDuration: `${ENTER_MS}ms`,
            pointerEvents: ready ? "none" : "auto",
          }}
        >
          <HalftoneBloom exiting={ready} />
        </div>
      )}
    </div>
  );
}
