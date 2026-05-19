"use client";

import { useEffect, useRef, useState } from "react";

// Contact menu items, in slide-in order (top → bottom).
// Email kept readable + clickable as mailto:; the rest open in a new tab.
const CONTACT_ITEMS = [
  {
    label: "orwiss.design@gmail.com",
    href: "mailto:orwiss.design@gmail.com",
    Icon: MailIcon,
  },
  {
    label: "dv5e1n",
    href: "https://instagram.com/dv5e1n",
    Icon: InstagramIcon,
  },
  {
    label: "orwissdesign",
    href: "https://linkedin.com/in/orwissdesign",
    Icon: LinkedInIcon,
  },
] as const;

const STAGGER_MS = 90;
const SLIDE_MS = 450;
// Halo open/close are tied to the items so they feel like one motion.
//   - Open: halo and the first-in item (i=0) start together at t=0
//     and both take SLIDE_MS, so they "arrive" together. The rest of
//     the items cascade in via stagger and trail behind.
//   - Close: items leave in reverse order, so item 0 leaves LAST at
//     exit-delay = (N-1) * STAGGER_MS. We give the halo close the
//     same delay so it starts shrinking together with the last item
//     and both disappear in sync. Without this delay the halo would
//     vanish while the last item was still mid-flight, which read as
//     "circle leaves first and the text catches up awkwardly."
const HALO_MS = SLIDE_MS;
const HALO_CLOSE_DELAY_MS = (CONTACT_ITEMS.length - 1) * STAGGER_MS;

export function ContactButton() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close on outside click + Esc. Pointerdown so we win against the
  // links' own click handler when they're clicked outside on accident.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      {/* Trigger — same chrome language as ViewToggle / ZoomIndicator
          (black border, white bg, inverts on hover). Paper plane SVG
          is hand-drawn so it inherits currentColor on hover. */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Contact"
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[1001] flex items-center justify-center w-10 h-10 border border-black bg-white hover:bg-black hover:text-white transition-colors"
      >
        <PaperPlaneIcon />
      </button>

      {/* Blurred halo behind the contact items.
          A solid-white circle with a heavy `filter: blur` applied
          to ITSELF — i.e. layer blur, not backdrop-blur. The centre
          fully covers the busy page content so the link text reads
          clearly; the edges fade smoothly into transparency.
          Positioning: anchored at the viewport's right edge with
          the circle's centre pushed HALF off-screen (translate-x-1/2)
          so only the left hemisphere bleeds into the viewport.
          Animation: scale-from-right + opacity, so on open the
          halo "blooms" out of the wall rather than just fading in
          at full size. transform-origin is the right edge of the
          element (which sits past the viewport's right edge), so
          scaling pivots beyond the wall — at scale 0.7 the inner
          element's left edge is exactly at viewport_right (the
          blob is just off-screen), at scale 1 it bleeds in as far
          as it should.
          z-[999]: below items (1000) and trigger button (1001),
          above page content. pointer-events none so it doesn't
          intercept clicks. */}
      <div
        aria-hidden
        className="fixed top-1/2 z-[999] pointer-events-none"
        style={{
          // A wide pill (rounded-full on the inner) sized so a
          // narrow band bleeds into the viewport. Width 1800,
          // height 380, right -1500 (= ~83% of width off-screen)
          // leaves ~300px visible at the right edge — wide enough
          // that the visible portion's straight body fully backs
          // the contact items vertically while the semicircle cap
          // contributes the soft left edge.
          // (Earlier wider variants either dominated narrow
          // viewports or read as "no change" because their visible
          // width stayed constant across config tweaks.)
          //
          // Width/height inline (not Tailwind `w-[]` / `h-[]`) to
          // bypass any Tailwind v4 JIT issues with large arbitrary
          // pixel values.
          //
          // Inline `right` + `transform` (vs Tailwind `right-N` +
          // `translate-x-N`) because in Tailwind v4 the standalone
          // `translate` CSS property + `right` positioning weren't
          // composing into the intended offset reliably here.
          width: "1200px",
          height: "400px",
          right: "-920px",
          transform: "translateY(-50%)",
        }}
      >
        <div
          className="w-full h-full bg-white blur-3xl"
          style={{
            transformOrigin: "100% 50%",
            // scale boundary = 1500/1800 ≈ 0.833: at scale 0.833
            // the inner element's left edge sits exactly at
            // viewport_right.
            //
            // rounded-full (pill, not true ellipse): with a wide
            // element border-radius caps at min(w/2, h/2) = h/2,
            // so the shape is a rectangle with full-height
            // semicircle caps on each end. The visible left slice
            // is the WHOLE left semicircle cap (190px wide × 380
            // tall at its center) plus 110px of straight body
            // (full 380 tall). This gives the visible portion
            // enough vertical extent to back the contact items —
            // an earlier `rounded-[50%]` (true ellipse) attempt
            // tapered the leftmost slice to a thin point and
            // didn't cover the labels.
            transform: open ? "scale(1)" : "scale(0.833)",
            opacity: open ? 1 : 0,
            transitionProperty: "transform, opacity",
            transitionDuration: `${HALO_MS}ms`,
            transitionDelay: open ? "0ms" : `${HALO_CLOSE_DELAY_MS}ms`,
            transitionTimingFunction: "ease-in-out",
          }}
        />
      </div>

      {/* Panel — floats a touch inward from the right edge at viewport
          vertical centre (right-6 so the rightmost item's hover state
          has breathing room from the wall). Items slide in one by one
          from outside the viewport; on close they slide back out in
          reverse order so the last one in is the first one out.
          Closed-state offset uses a translate that clears the panel's
          own width + the right gap, so items disappear fully off-screen
          instead of peeking at the edge. */}
      <div
        ref={panelRef}
        className="fixed right-6 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 pointer-events-none"
        aria-hidden={!open}
      >
        {CONTACT_ITEMS.map((item, i) => {
          // Same delay for open AND close: items always cascade in
          // top-to-bottom order. On close the bottom item (linkedin)
          // is the last to leave, which lines up with the halo's
          // close delay so the final item and the halo disappear in
          // sync. Earlier this was reversed on close (bottom-out-
          // first), which felt inconsistent with the entry order.
          const delay = i * STAGGER_MS;
          const isExternal = item.href.startsWith("http");
          const Icon = item.Icon;
          return (
            <a
              key={item.label}
              href={item.href}
              {...(isExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              tabIndex={open ? 0 : -1}
              className="pointer-events-auto flex items-center gap-2 self-end px-2 py-1 font-mono text-base tracking-wide text-black transition-colors hover:bg-[#39FF14] hover:text-black"
              style={{
                // Fixed translate distance (not % of item width) so
                // every item travels the same distance over the same
                // duration → consistent apparent speed regardless of
                // label length. 360px is wide enough to fully clear
                // the longest label (orwiss.design@gmail.com) past
                // the right viewport edge with a comfortable buffer.
                transform: open ? "translateX(0)" : "translateX(360px)",
                // Inline transition overrides the Tailwind
                // `transition-colors` class — include both color and
                // background-color so the ListView-matched neon
                // hover fades in instead of snapping.
                transitionProperty: "transform, color, background-color",
                transitionDuration: `${SLIDE_MS}ms, 150ms, 150ms`,
                transitionDelay: `${delay}ms, 0ms, 0ms`,
                transitionTimingFunction: "ease-out",
              }}
            >
              <Icon />
              <span>{item.label}</span>
            </a>
          );
        })}
      </div>
    </>
  );
}

// Shared sizing for the per-item icons — slightly smaller than the
// trigger's plane so the label reads as the primary affordance.
const ITEM_ICON_PROPS = {
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

function MailIcon() {
  // Envelope: rectangle + flap polyline.
  return (
    <svg {...ITEM_ICON_PROPS}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m3.5 6 8.5 7 8.5-7" />
    </svg>
  );
}

function InstagramIcon() {
  // Rounded square + lens + corner dot — the Instagram glyph.
  return (
    <svg {...ITEM_ICON_PROPS}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedInIcon() {
  // 'in' mark: 'i' dot + stem, 'n' arch. Drawn with strokes to match
  // the rest of the icon set (no filled glyph).
  return (
    <svg {...ITEM_ICON_PROPS}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="7.5" cy="8" r="0.6" fill="currentColor" stroke="none" />
      <path d="M7.5 10.5v7" />
      <path d="M11 17.5v-7" />
      <path d="M11 13.5c0-1.7 1.2-3 2.75-3s2.75 1.3 2.75 3v4" />
    </svg>
  );
}

function PaperPlaneIcon() {
  // 20px paper plane. strokeWidth 1.5 to match the edge thickness
  // of the surrounding ViewToggle pill border at this size.
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21.5 2.5 2.5 11l7.5 2.5L21.5 2.5z" />
      <path d="M21.5 2.5 13.5 21.5l-3.5-8" />
    </svg>
  );
}
