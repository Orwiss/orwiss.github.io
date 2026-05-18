"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { HalftoneBloom } from "./HalftoneBloom";

// Global page-transition orchestrator. Lives once in the root layout so
// it's NEVER unmounted across navigations — that's what lets the
// halftone overlay span both the leaving and the arriving page without
// a remount + restart-from-zero jitter.
//
// Sequence on link click:
//   1. navigate(href) is called via context (custom <SmoothLink> or
//      the MindMap node click handler).
//   2. phase → "leaving". HalftoneBloom mounts on top and BLOOMS IN
//      from 0 → 1 over its RISE duration, covering the current page.
//   3. After LEAVE_MS, router.push(href) actually starts the route
//      change. This lag is what makes the bloom-in feel intentional
//      instead of racing with the new page mount.
//   4. usePathname() picks up the new URL. The effect below sees the
//      pathname change and flips phase → "arriving". HalftoneBloom
//      gets exiting=true and reverse-blooms from wherever it landed.
//   5. After ARRIVE_MS the halftone retreat is complete; phase → "idle"
//      and the overlay unmounts.
//
// On initial hard page load the provider starts in "arriving" so the
// user sees the same halftone-then-reveal cadence as for a SPA nav.
//
// Same-pathname navigations (e.g. ?view=list ↔ ?view=map) skip the
// halftone entirely — pathname doesn't change so the effect doesn't
// fire, and navigate() short-circuits to a direct router.push.
type Phase = "idle" | "leaving" | "arriving";

const LEAVE_MS = 350;
const ARRIVE_MS = 600;
// How fast the OUTGOING page itself opacity-fades during the leaving
// phase. Deliberately quicker than LEAVE_MS / the halftone RISE so the
// user sees the previous page clearly disappear, then the halftone
// take over.
const CONTENT_LEAVE_MS = 180;
// Pure safety cap: if a broken / never-loading image hangs out forever
// we still reveal the page. Real loads finish dynamically via the
// load/error listeners well before this fires.
const IMAGE_WAIT_CAP_MS = 5000;

const NavContext = createContext<(href: string) => void>(() => {});
export function useNavigate() {
  return useContext(NavContext);
}

export function TransitionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  // Default `leaving` so the halftone is up from the very first frame
  // on initial mount; the pathname effect below transitions it to
  // `arriving` once the page's images have loaded (with a cap).
  const [phase, setPhase] = useState<Phase>("leaving");
  const settledPathRef = useRef(pathname);
  const navTimerRef = useRef<number | null>(null);

  // Image-await + arrive trigger. Runs on:
  //   - Initial mount (pathname becomes set)
  //   - SPA navigation (pathname changes)
  // Strategy (purely event-driven, no minimum hold):
  //   1. Wait one RAF so the just-mounted page DOM has rendered <img>
  //      tags with their src attributes.
  //   2. Find all <img> still loading and listen for load/error events.
  //   3. The MOMENT the last one settles → transition to arriving.
  //      No page → reveal immediately (next tick).
  //   4. Pure-safety cap at IMAGE_WAIT_CAP_MS so a broken / never-
  //      loading image can't block the reveal indefinitely.
  useEffect(() => {
    settledPathRef.current = pathname;

    let cancelled = false;
    let arrived = false;

    const transitionToArriving = () => {
      if (cancelled || arrived) return;
      arrived = true;
      setPhase("arriving");
    };

    const raf = requestAnimationFrame(() => {
      if (cancelled) return;
      const imgs = Array.from(document.querySelectorAll("img"));
      const pending = imgs.filter((img) => Boolean(img.src) && !img.complete);

      if (pending.length === 0) {
        transitionToArriving();
        return;
      }

      let remaining = pending.length;
      const onSettled = () => {
        remaining -= 1;
        if (remaining <= 0) transitionToArriving();
      };
      pending.forEach((img) => {
        img.addEventListener("load", onSettled, { once: true });
        img.addEventListener("error", onSettled, { once: true });
      });
      window.setTimeout(transitionToArriving, IMAGE_WAIT_CAP_MS);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [pathname]);

  // Auto-exit arriving after ARRIVE_MS (covers the halftone retreat
  // animation duration).
  useEffect(() => {
    if (phase !== "arriving") return;
    const t = window.setTimeout(() => setPhase("idle"), ARRIVE_MS);
    return () => window.clearTimeout(t);
  }, [phase]);

  const navigate = useCallback(
    (href: string) => {
      // Same-pathname → skip the overlay; React re-renders for the
      // search-param change anyway.
      let nextPath = href;
      try {
        const url = new URL(href, window.location.origin);
        nextPath = url.pathname;
      } catch {
        // relative href: leave as-is
      }
      if (nextPath === pathname) {
        router.push(href);
        return;
      }
      // Cancel any pending router.push from a rapid prior click so we
      // don't stack navigations.
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
      }
      setPhase("leaving");
      navTimerRef.current = window.setTimeout(() => {
        navTimerRef.current = null;
        router.push(href);
      }, LEAVE_MS);
    },
    [pathname, router],
  );

  // Clean up any pending nav timer on unmount.
  useEffect(() => {
    return () => {
      if (navTimerRef.current !== null) {
        window.clearTimeout(navTimerRef.current);
        navTimerRef.current = null;
      }
    };
  }, []);

  // HalftoneBloom should be mounted across the entire transition, then
  // unmounted shortly after the retreat completes so its RAF can stop.
  const showOverlay = phase !== "idle";
  // exiting flips true the moment we're in "arriving" so the bloom
  // retreats instead of continuing to pulse.
  const overlayExiting = phase === "arriving";

  // Content opacity:
  //   - leaving:  1 → 0 fast (CONTENT_LEAVE_MS) so the previous page
  //               clearly disappears under the bloom.
  //   - arriving: stays at 1 (the halftone retreat handles reveal).
  //               Jump from 0 → 1 happens while the halftone is still
  //               fully covering, so the snap isn't visible.
  //   - idle:     1.
  const contentOpacity = phase === "leaving" ? 0 : 1;
  const contentTransitionMs = phase === "leaving" ? CONTENT_LEAVE_MS : 0;

  return (
    <NavContext.Provider value={navigate}>
      <div
        className="h-full w-full"
        style={{
          opacity: contentOpacity,
          transition: `opacity ${contentTransitionMs}ms ease-out`,
        }}
      >
        {children}
      </div>
      {showOverlay && (
        <div
          aria-hidden
          className="fixed inset-0 z-[2000]"
          style={{ pointerEvents: overlayExiting ? "none" : "auto" }}
        >
          <HalftoneBloom exiting={overlayExiting} />
        </div>
      )}
    </NavContext.Provider>
  );
}
