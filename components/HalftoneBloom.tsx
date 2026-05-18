"use client";

import { useEffect, useRef } from "react";

// Standalone halftone bloom for loading screens. Same visual language as
// the mind-map hub halo (regular grid + dot-size-from-intensity + wavy
// boundary via smooth 2D noise), but free-standing: own canvas, own RAF
// loop, single "node" at viewport centre. Mounted by loading.tsx route
// segments + HomeClient's dynamic-import fallback; unmounts when the
// real page is ready.

const NEON = "#39ff14";
const GRID = 11;             // SCREEN-px between dot centres
const MAX_DOT = GRID / 2;    // largest dot radius (SCREEN-px)
const FALLOFF = 1.7;         // exponent for distance → size falloff
const REACH = 320;           // SCREEN-px target halo reach
// Bloom factor lifecycle:
//   1. RISE phase (0 → BLOOM_RISE_DURATION): bloom 0 → 1, the initial
//      halo blooming into view from nothing.
//   2. PULSE phase (after rise, until exit): bloom oscillates between
//      BLOOM_OSC_LOW and BLOOM_OSC_HIGH with period BLOOM_OSC_PERIOD.
//      Cosine-driven so it starts at HIGH (matching where the rise
//      ended), dips to LOW, swings back. This gives the breathing
//      effect the user asked for (0→1, then 1↔0.5↔1↔…).
//   3. EXIT phase (when `exiting` prop flips true): bloom interpolates
//      from its current value to 0 over EXIT_DURATION. Dots retreat
//      to the centre.
const BLOOM_RISE_DURATION = 0.45;
const BLOOM_OSC_PERIOD = 1.6;
const BLOOM_OSC_LOW = 0.5;
const BLOOM_OSC_HIGH = 1.0;
const EXIT_DURATION = 0.55;
const BREATH_FREQ = 0.12;    // Hz — slow ambient breathing
const BREATH_AMP = 0.3;      // ± modulation of REACH
const NOISE_WL = 70;         // SCREEN-px noise wavelength
const NOISE_AMP = 0.42;      // ± t shift at iso-contour
const NOISE_THRESHOLD = 0.45;// gate noise to outer rim only
const NOISE_DRIFT = 0.05;    // slow morph

function hash2d(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function smoothNoise2d(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const v00 = hash2d(ix, iy);
  const v10 = hash2d(ix + 1, iy);
  const v01 = hash2d(ix, iy + 1);
  const v11 = hash2d(ix + 1, iy + 1);
  const u = fx * fx * (3 - 2 * fx);
  const v = fy * fy * (3 - 2 * fy);
  const a = v00 + (v10 - v00) * u;
  const b = v01 + (v11 - v01) * u;
  return a + (b - a) * v;
}

export function HalftoneBloom({ exiting = false }: { exiting?: boolean } = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Ref-driven exit signal so the RAF closure (set up once) can pick
  // up state changes without re-creating the loop.
  const exitingRef = useRef(false);
  const exitStartRef = useRef<number | null>(null);
  // Bloom value the draw loop last computed — captured at exit start
  // so the retreat tween starts from wherever the pulse happened to
  // be, not always from 1 (avoids a visible jump when the user dismisses
  // the loader during the LOW half of the oscillation).
  // Defaults to 1 so that mounting with exiting=true (e.g. initial
  // page transition where we want the halftone to "land" at full
  // then retreat) does not produce a bloom=0 frame before the draw
  // loop has had a chance to write a real value.
  const lastBloomRef = useRef(1);
  const exitFromBloomRef = useRef(1);
  useEffect(() => {
    exitingRef.current = exiting;
    if (exiting && exitStartRef.current === null) {
      exitStartRef.current = performance.now();
      exitFromBloomRef.current = lastBloomRef.current;
    }
  }, [exiting]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    let lastSize = "";
    let lastDraw = -Infinity;
    // 30fps throttle: the bloom is a slow breathing animation, full
    // 60fps is wasteful and competes with hydration / route mount work
    // on initial paint — which is exactly when the user reported the
    // halo looking jittery.
    const minDelta = 1000 / 30;

    const draw = (now: number) => {
      if (now - lastDraw < minDelta) {
        raf = requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const cssW = window.innerWidth;
      const cssH = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      const sizeKey = `${cssW}x${cssH}x${dpr}`;
      if (sizeKey !== lastSize) {
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        canvas.style.width = `${cssW}px`;
        canvas.style.height = `${cssH}px`;
        lastSize = sizeKey;
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      const sec = (now - start) / 1000;
      // Bloom factor over time:
      //   RISE:  0 → 1 over BLOOM_RISE_DURATION
      //   PULSE: oscillates HIGH ↔ LOW with period BLOOM_OSC_PERIOD,
      //          starting at HIGH (continuous with the end of RISE).
      //   EXIT:  current value → 0 over EXIT_DURATION (smoothstep).
      let bloom: number;
      if (exitingRef.current && exitStartRef.current !== null) {
        const exitSec = (now - exitStartRef.current) / 1000;
        const exitT = Math.min(1, exitSec / EXIT_DURATION);
        const eased = exitT * exitT * (3 - 2 * exitT);
        bloom = exitFromBloomRef.current * (1 - eased);
      } else if (sec < BLOOM_RISE_DURATION) {
        // Ease-in via smoothstep so the very first frames aren't flat.
        const t = sec / BLOOM_RISE_DURATION;
        bloom = t * t * (3 - 2 * t);
      } else {
        const phase = (sec - BLOOM_RISE_DURATION) / BLOOM_OSC_PERIOD;
        const mid = (BLOOM_OSC_HIGH + BLOOM_OSC_LOW) / 2;
        const half = (BLOOM_OSC_HIGH - BLOOM_OSC_LOW) / 2;
        bloom = mid + half * Math.cos(2 * Math.PI * phase);
      }
      lastBloomRef.current = bloom;
      // Breathing reach modulation (matches mind-map hub halo cadence).
      const reach =
        REACH * bloom * (1 + BREATH_AMP * Math.sin(sec * 2 * Math.PI * BREATH_FREQ));
      if (reach <= 0.5) {
        raf = requestAnimationFrame(draw);
        return;
      }

      const cx = cssW / 2;
      const cy = cssH / 2;

      // Enumerate cells within (reach + margin) of centre; outside the
      // viewport they're harmlessly off-screen.
      const margin = NOISE_AMP * reach + MAX_DOT;
      const minX = Math.max(0, cx - reach - margin);
      const maxX = Math.min(cssW, cx + reach + margin);
      const minY = Math.max(0, cy - reach - margin);
      const maxY = Math.min(cssH, cy + reach + margin);

      const cgxMin = Math.floor(minX / GRID);
      const cgxMax = Math.ceil(maxX / GRID);
      const cgyMin = Math.floor(minY / GRID);
      const cgyMax = Math.ceil(maxY / GRID);

      ctx.fillStyle = NEON;
      ctx.beginPath();
      const TWO_PI = Math.PI * 2;

      for (let cgy = cgyMin; cgy < cgyMax; cgy += 1) {
        const gy = (cgy + 0.5) * GRID;
        const dy = gy - cy;
        for (let cgx = cgxMin; cgx < cgxMax; cgx += 1) {
          const gx = (cgx + 0.5) * GRID;
          const dx = gx - cx;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d >= reach) continue;
          const t = (1 - d / reach) * bloom;
          if (t <= 0) continue;

          // Wavy boundary noise — gate to outer rim, same trick as the
          // hub halo to keep the inner pattern a clean grid.
          const edgeFactor =
            t < NOISE_THRESHOLD ? 1 - t / NOISE_THRESHOLD : 0;
          let tEff = t;
          if (edgeFactor > 0) {
            const nx = gx / NOISE_WL + sec * NOISE_DRIFT;
            const ny = gy / NOISE_WL - sec * NOISE_DRIFT * 0.6;
            const noise = smoothNoise2d(nx, ny);
            tEff = t + (noise - 0.5) * 2 * NOISE_AMP * edgeFactor;
            if (tEff <= 0) continue;
          }
          const r = Math.pow(tEff, FALLOFF) * MAX_DOT;
          if (r < 0.35) continue;
          ctx.moveTo(gx + r, gy);
          ctx.arc(gx, gy, r, 0, TWO_PI);
        }
      }
      ctx.fill();

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="absolute inset-0 pointer-events-none"
    />
  );
}
