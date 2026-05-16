"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  ReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  useInternalNode,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useStore,
  useStoreApi,
  type Node,
  type Edge,
  type NodeProps,
  type EdgeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  categories,
  HUB_LABEL,
  type CategoryId,
  type Project,
} from "@/lib/projects";

const HUB_ID = "hub";
const CAT_PREFIX = "cat:";
const PROJ_PREFIX = "proj:";

const RADIUS = {
  category: 440,
  projectInner: 840,
  projectOuter: 1240,
} as const;

const CATEGORY_WEIGHT_PAD = 3;

// === Custom node components ===

function HubNode({ data }: NodeProps) {
  return (
    <div className="bg-black text-white px-9 py-4 text-4xl whitespace-nowrap tracking-tight">
      {String(data.label)}
      <HiddenHandles />
    </div>
  );
}

function CategoryNode({ data }: NodeProps) {
  return (
    <div className="bg-[#DDD] border rounded-full border-black px-7 py-3 text-2xl whitespace-nowrap">
      {String(data.label)}
      <HiddenHandles />
    </div>
  );
}

// Hover preview dimensions (used for viewport-edge fitting math).
// Width comes from w-[26rem] = 416px. Height is image (aspect-video on a
// 392px content box = ~221px) + title ~50px + padding 24px ≈ 295px. Padded.
const PREVIEW_WIDTH = 416;
const PREVIEW_HEIGHT = 320;
const PREVIEW_GAP = 16;
const VIEWPORT_MARGIN = 12;

// === Neon halftone halo (SVG, true halftone) =============================
// Dots are laid out on a uniform grid around the node. Each dot's radius is
// a function of its distance from the nearest point on the node's bounding
// rectangle: dots adjacent to the node are at full size and shrink smoothly
// toward zero at the halo's outer reach. Dots are full circles — never
// clipped — which is the defining property a CSS mask can't give us.
const HALO_NEON_COLOR = "#39ff14";
const HALO_PAD = 220;          // SCREEN-px BASE reach (range over which dot radius decays to zero)
                               // — modulated per node by HALO_AMP, see geometry below.
                               // Kept in screen px so the visible halo area stays
                               // constant across zoom AND the cell-count stays
                               // bounded (canvas-px reach scales 1/zoom alongside
                               // grid spacing, leaving cells-per-node invariant).
const HALO_GRID = 11;          // SCREEN-px between dot centres (constant across zoom)
const HALO_MAX_DOT = HALO_GRID / 2; // largest dot radius in SCREEN px
const HALO_FALLOFF = 1.7;      // exponent controlling how steeply dots shrink
const HALO_POS_JITTER = 0.35;  // ± fraction of HALO_GRID a dot can wander off its cell (at edge)
const HALO_SIZE_NOISE = 0.55;  // ± fraction by which per-cell noise modulates dot radius (at edge)
const HALO_NOISE_THRESHOLD = 0.55; // t value above which the core stays perfectly regular
                                   // (lower = more area kept clean; higher = noise reaches inward)

// Per-node area-glow oscillation. Each project node gets `reach(t) =
// HALO_PAD * (1 + HALO_AMP * sin(t * freq + phase))`. Phase + freq are
// derived from hashString(id) so each node breathes on its own clock and
// nodes drift in and out of sync. The whole intensity field is recomputed
// every animation tick — there is no masking; new dots emerge at the edge
// at small radii as reach grows, then shrink as reach retracts. The
// halftone rules (falloff, edge noise, jitter, size gating) all operate
// on the resulting per-cell intensity, so they stay intact.
const HALO_AMP = 0.32;             // ±32% modulation of HALO_PAD per node
const HALO_MAX_MUL = 1 + HALO_AMP; // used for sizing the SVG viewBox so the
                                   // outermost breathing frame never clips
const HALO_FREQ_MIN = 0.18;        // Hz — slowest breathing cycle (~5.5s)
const HALO_FREQ_MAX = 0.42;        // Hz — fastest breathing cycle (~2.4s)
// Render cap. Frame budget for the per-tick path build below — we still
// regenerate the field every frame, but skip frames if we're consistently
// running over budget (set via PROFILE_HALO=true to log).
const HALO_TARGET_FPS = 30;

// Deterministic 2D hash → [0, 1). Cheap, stable per (x, y) cell so the
// pattern doesn't shimmer between renders / drags / zooms.
function hash2d(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

// Deterministic string hash → [0, 1). Used to assign each project node a
// stable, unique phase + period for its glow animation.
function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

// (per-node NeonHalftoneHalo removed — HaloLayer now renders the full halo
// field globally; see further down.)

function ProjectNode({ data }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const notionId = (data.notionId as string | undefined) ?? "";
  const label = String(data.label);

  // Compute popup placement at hover time. We render via a portal to
  // document.body (see below) so the popup escapes React Flow's transform tree
  // — its size stays constant regardless of canvas zoom, and z-index works
  // without lifting wrapper stacking contexts.
  const handleEnter = () => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    // Vertical: prefer above; flip below if above is tight.
    const roomAbove = rect.top - VIEWPORT_MARGIN;
    const roomBelow = window.innerHeight - rect.bottom - VIEWPORT_MARGIN;
    const needV = PREVIEW_HEIGHT + PREVIEW_GAP;
    const placeAbove =
      roomAbove >= needV ? true : roomBelow >= needV ? false : roomAbove >= roomBelow;

    const top = placeAbove
      ? rect.top - PREVIEW_GAP - PREVIEW_HEIGHT
      : rect.bottom + PREVIEW_GAP;

    // Horizontal: center on node, then clamp to viewport.
    const centerX = rect.left + rect.width / 2;
    let left = centerX - PREVIEW_WIDTH / 2;
    left = Math.max(
      VIEWPORT_MARGIN,
      Math.min(window.innerWidth - VIEWPORT_MARGIN - PREVIEW_WIDTH, left),
    );

    setPopupPos({ top, left });
    setHovered(true);
  };

  const handleLeave = () => {
    setHovered(false);
    setCoverFailed(false);
    setPopupPos(null);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative bg-white border border-black px-5 py-2.5 text-xl whitespace-nowrap cursor-pointer transition-colors hover:bg-black hover:text-white"
    >
      {label}
      <HiddenHandles />
      {hovered && notionId && popupPos && typeof document !== "undefined"
        ? createPortal(
            <div
              className="fixed z-[10000] pointer-events-none border border-black bg-white p-3 w-[26rem] text-black shadow-[0_4px_0_0_#000]"
              style={{ top: `${popupPos.top}px`, left: `${popupPos.left}px` }}
            >
              {!coverFailed ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/notion/cover/${notionId}`}
                  alt=""
                  className="w-full aspect-video object-cover block"
                  draggable={false}
                  onError={() => setCoverFailed(true)}
                />
              ) : (
                <div className="w-full aspect-video bg-black/[0.05] flex items-center justify-center">
                  <span className="text-[1.2rem] opacity-50 font-mono">no cover</span>
                </div>
              )}
              <p className="mt-3 text-[1.4rem] font-semibold leading-tight break-keep whitespace-normal">
                {label}
              </p>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// React Flow needs handles to anchor edges; rendered invisible at node center.
function HiddenHandles() {
  return (
    <>
      <Handle
        type="source"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none", top: "50%", left: "50%" }}
      />
      <Handle
        type="target"
        position={Position.Top}
        id="t"
        style={{ opacity: 0, pointerEvents: "none", top: "50%", left: "50%" }}
      />
    </>
  );
}

// === Floating edge ===

type MeasuredNode = {
  position: { x: number; y: number };
  measured?: { width?: number; height?: number };
};

function boundaryPoint(node: MeasuredNode, towards: { x: number; y: number }) {
  const w = node.measured?.width ?? 120;
  const h = node.measured?.height ?? 32;
  const cx = node.position.x + w / 2;
  const cy = node.position.y + h / 2;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };
  const halfW = w / 2;
  const halfH = h / 2;
  const tx = dx === 0 ? Infinity : halfW / Math.abs(dx);
  const ty = dy === 0 ? Infinity : halfH / Math.abs(dy);
  const t = Math.min(tx, ty);
  return { x: cx + dx * t, y: cy + dy * t };
}

// Stadium / pill boundary intersection. Used for nodes with `rounded-full`
// (category nodes) so edges anchor flush to the curved edge instead of
// overshooting the rectangular bounding box at the rounded corners.
function pillBoundary(node: MeasuredNode, towards: { x: number; y: number }) {
  const w = node.measured?.width ?? 120;
  const h = node.measured?.height ?? 32;
  const cx = node.position.x + w / 2;
  const cy = node.position.y + h / 2;
  const dx = towards.x - cx;
  const dy = towards.y - cy;
  if (dx === 0 && dy === 0) return { x: cx, y: cy };

  const r = h / 2;                          // pill end radius
  const rectHalfW = Math.max(0, w / 2 - r); // half-width of the flat midsection

  // First check whether the ray hits the flat top/bottom band (y = ±r within
  // the rectangular midsection). If it does, that's the boundary point.
  if (dy !== 0) {
    const tFlat = Math.abs(r / dy);
    const xAtFlat = dx * tFlat;
    if (Math.abs(xAtFlat) <= rectHalfW) {
      return { x: cx + xAtFlat, y: cy + Math.sign(dy) * r };
    }
  }

  // Otherwise the ray exits through one of the semicircular caps centred at
  // (±rectHalfW, 0). Solve |t·d − (sideX, 0)| = r for t.
  const sideX = dx >= 0 ? rectHalfW : -rectHalfW;
  const a = dx * dx + dy * dy;
  const b = -2 * dx * sideX;
  const c = sideX * sideX - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return { x: cx, y: cy }; // shouldn't happen geometrically
  const t = (-b + Math.sqrt(disc)) / (2 * a);
  return { x: cx + t * dx, y: cy + t * dy };
}

function center(node: MeasuredNode) {
  const w = node.measured?.width ?? 120;
  const h = node.measured?.height ?? 32;
  return { x: node.position.x + w / 2, y: node.position.y + h / 2 };
}

function FloatingEdge({ id, source, target, style }: EdgeProps) {
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  if (!sourceNode || !targetNode) return null;

  // Category nodes are pills (rounded-full); everyone else is a sharp box.
  // Dispatch boundary calc per node shape so edges land on the visible edge.
  const sourceFn = source.startsWith(CAT_PREFIX) ? pillBoundary : boundaryPoint;
  const targetFn = target.startsWith(CAT_PREFIX) ? pillBoundary : boundaryPoint;
  const s = sourceFn(sourceNode as MeasuredNode, center(targetNode as MeasuredNode));
  const t = targetFn(targetNode as MeasuredNode, center(sourceNode as MeasuredNode));

  return (
    <path
      id={id}
      d={`M${s.x},${s.y} L${t.x},${t.y}`}
      className="react-flow__edge-path"
      style={{ stroke: "#000", strokeWidth: 1.5, fill: "none", ...style }}
    />
  );
}

const nodeTypes = {
  hub: HubNode,
  category: CategoryNode,
  project: ProjectNode,
};

const edgeTypes = {
  floating: FloatingEdge,
};

// === Halo layer ==========================================================
// One global halftone field rendered as a single SVG, portalled into
// .react-flow__viewport at z-index -1. Render order ends up:
//   halo field (back) → edges → nodes (front)
//
// Key shift from the per-node version: every project node contributes
// intensity into a SHARED world-anchored grid (cell positions are functions
// of world coords, not of any individual node). For each grid cell we take
// the MAX intensity contributed by any nearby node. Overlapping halos blend
// into one continuous denser cluster instead of two clashing grids — and
// because the grid is locked to world space, dragging a node "uncovers"
// dots at fixed world positions instead of carrying its own pattern around.

function HaloLayer() {
  const domNode = useStore((s) => s.domNode);

  // Position fingerprint — see comment above. React Flow mutates the
  // nodeLookup Map in place, so we must derive a string that changes
  // when geometry changes (and only then).
  const positionsKey = useStore((s) => {
    const parts: string[] = [];
    s.nodeLookup.forEach((node, id) => {
      if (!id.startsWith(PROJ_PREFIX)) return;
      const w = node.measured?.width;
      const h = node.measured?.height;
      if (!w || !h) return;
      parts.push(
        `${id}:${Math.round(node.position.x * 2)},${Math.round(node.position.y * 2)},${Math.round(w * 2)},${Math.round(h * 2)}`,
      );
    });
    return parts.sort().join("|");
  });

  const nodeLookup = useStore((s) => s.nodeLookup);
  // Subscribe to a bucketed zoom (0.2 steps) instead of the raw zoom value.
  // Smooth zoom tweens (+/- buttons, wheel) fire many small zoom deltas; if
  // we subscribed to raw zoom every one of them re-rendered HaloLayer, which
  // tore through a fresh path-string + DOM diff each step. Bucketing means
  // React only re-renders on bucket boundary crossings (~3 per zoom gesture)
  // while the per-frame RAF tick keeps the dot sizes/positions current via
  // the live zoom read inside `pathD` below.
  const zoomBucket = useStore((s) =>
    Math.max(0.001, Math.round(s.transform[2] * 5) / 5),
  );
  // Store handle for the cull pass + live zoom read below — we read transform
  // + zoom + container dimensions inside the per-frame animation pass
  // without subscribing, so pan and fractional zoom events don't trigger
  // extra re-renders. The RAF tick already drives recomputation; these
  // reads just pull the latest values when it runs.
  const storeApi = useStoreApi();

  // RAF tick — drives the per-node area-glow oscillation. We tick a
  // monotonically-increasing seconds value, throttled to ~HALO_TARGET_FPS
  // so the per-frame field rebuild stays bounded. Pause when the tab is
  // hidden (no point animating into a black screen).
  const [tickSec, setTickSec] = useState(0);
  useEffect(() => {
    let raf = 0;
    let lastEmit = -Infinity;
    const minDelta = 1000 / HALO_TARGET_FPS;
    const loop = (now: number) => {
      if (now - lastEmit >= minDelta) {
        lastEmit = now;
        setTickSec(now / 1000);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVisible = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(loop);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // === Geometry pass (cached) ===========================================
  // For each cell that any node's MAX-reach halo could possibly touch,
  // record per-node distance. Recomputed only when node positions change
  // or we cross a zoom bucket. Per-tick animation work below reuses this
  // distance table.
  const geometry = useMemo(() => {
    type Rect = {
      id: string;
      cx: number;
      cy: number;
      halfW: number;
      halfH: number;
      freq: number; // rad/s
      phase: number; // rad
    };
    const rects: Rect[] = [];
    nodeLookup.forEach((node, id) => {
      if (!id.startsWith(PROJ_PREFIX)) return;
      const w = node.measured?.width;
      const h = node.measured?.height;
      if (!w || !h) return;
      const h01 = hashString(id);
      const freqHz = HALO_FREQ_MIN + h01 * (HALO_FREQ_MAX - HALO_FREQ_MIN);
      rects.push({
        id,
        cx: node.position.x + w / 2,
        cy: node.position.y + h / 2,
        halfW: w / 2,
        halfH: h / 2,
        freq: 2 * Math.PI * freqHz,
        phase: h01 * 2 * Math.PI,
      });
    });
    if (rects.length === 0) return null;

    const gridCanvas = HALO_GRID / zoomBucket;
    const padCanvas = HALO_PAD / zoomBucket;
    const maxReach = padCanvas * HALO_MAX_MUL;

    // Cell record: position in canvas px + flat per-rect distance list.
    // Using parallel arrays (rectIdx, dist) keeps the per-tick loop
    // tight and GC-quiet.
    type Cell = {
      gx: number;
      gy: number;
      rectIdx: Uint16Array;
      dist: Float32Array;
    };
    const tmpIdx: number[] = [];
    const tmpDist: number[] = [];
    const cells: Cell[] = [];

    let worldMinX = Infinity;
    let worldMinY = Infinity;
    let worldMaxX = -Infinity;
    let worldMaxY = -Infinity;
    for (const r of rects) {
      worldMinX = Math.min(worldMinX, r.cx - r.halfW - maxReach);
      worldMinY = Math.min(worldMinY, r.cy - r.halfH - maxReach);
      worldMaxX = Math.max(worldMaxX, r.cx + r.halfW + maxReach);
      worldMaxY = Math.max(worldMaxY, r.cy + r.halfH + maxReach);
    }

    const cgxMin = Math.floor(worldMinX / gridCanvas);
    const cgxMax = Math.ceil(worldMaxX / gridCanvas);
    const cgyMin = Math.floor(worldMinY / gridCanvas);
    const cgyMax = Math.ceil(worldMaxY / gridCanvas);

    for (let cgy = cgyMin; cgy < cgyMax; cgy += 1) {
      const gy = (cgy + 0.5) * gridCanvas;
      for (let cgx = cgxMin; cgx < cgxMax; cgx += 1) {
        const gx = (cgx + 0.5) * gridCanvas;
        tmpIdx.length = 0;
        tmpDist.length = 0;
        for (let i = 0; i < rects.length; i += 1) {
          const r = rects[i];
          const dx = Math.abs(gx - r.cx) - r.halfW;
          const dy = Math.abs(gy - r.cy) - r.halfH;
          const ox = dx > 0 ? dx : 0;
          const oy = dy > 0 ? dy : 0;
          const d = Math.sqrt(ox * ox + oy * oy);
          if (d > maxReach) continue;
          tmpIdx.push(i);
          tmpDist.push(d);
        }
        if (tmpIdx.length === 0) continue;
        cells.push({
          gx,
          gy,
          rectIdx: Uint16Array.from(tmpIdx),
          dist: Float32Array.from(tmpDist),
        });
      }
    }

    const svgX = Math.floor(worldMinX / gridCanvas) * gridCanvas;
    const svgY = Math.floor(worldMinY / gridCanvas) * gridCanvas;
    const svgW = Math.ceil((worldMaxX - svgX) / gridCanvas) * gridCanvas;
    const svgH = Math.ceil((worldMaxY - svgY) / gridCanvas) * gridCanvas;

    return { rects, cells, svgX, svgY, svgW, svgH, gridCanvas, padCanvas };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey, zoomBucket]);

  // === Animation pass (per RAF tick) =====================================
  // Cheap: walk cached cells, compute per-cell t from currently-modulated
  // per-node reach, apply halftone rules, emit one <path d=...>.
  const pathD = useMemo(() => {
    if (!geometry) return "";
    const { rects, cells, svgX, svgY, padCanvas } = geometry;

    // Read live transform + viewport size once for the whole pass. We
    // don't SUBSCRIBE to transform — the RAF tick already drives this
    // useMemo via `tickSec`, and avoiding the subscription means pan +
    // sub-bucket zoom events don't kick off extra React re-renders /
    // path-string rebuilds.
    const { transform, width: vpW, height: vpH } = storeApi.getState();
    const tx = transform[0];
    const ty = transform[1];
    const safeZoom = Math.max(0.001, transform[2]);

    // Viewport cull bounds in canvas coords. Generous margin = max dot
    // radius + max jitter so a cell whose CENTER sits just past the
    // viewport edge but whose dot still paints across it doesn't pop out.
    const cullMarginCanvas =
      (HALO_MAX_DOT + HALO_GRID * HALO_POS_JITTER + 2) / safeZoom;
    const viewMinX = -tx / safeZoom - cullMarginCanvas;
    const viewMaxX = (vpW - tx) / safeZoom + cullMarginCanvas;
    const viewMinY = -ty / safeZoom - cullMarginCanvas;
    const viewMaxY = (vpH - ty) / safeZoom + cullMarginCanvas;

    // Per-node reach for THIS tick, in canvas px. padCanvas already
    // incorporates the zoom bucket (HALO_PAD screen-px / zoomBucket),
    // so visible halo radius stays roughly constant across zoom while
    // cell-count per node stays bounded.
    const reach = new Float32Array(rects.length);
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i];
      reach[i] = padCanvas * (1 + HALO_AMP * Math.sin(tickSec * r.freq + r.phase));
    }

    const segments: string[] = [];
    for (const cell of cells) {
      // Cheap rejection FIRST — skips ~50%+ of cells when zoomed in.
      if (cell.gx < viewMinX || cell.gx > viewMaxX) continue;
      if (cell.gy < viewMinY || cell.gy > viewMaxY) continue;
      // Max-blend t across contributing nodes using time-varying reach.
      let t = 0;
      for (let k = 0; k < cell.rectIdx.length; k += 1) {
        const idx = cell.rectIdx[k];
        const reachI = reach[idx];
        if (reachI <= 0) continue;
        const d = cell.dist[k];
        if (d >= reachI) continue;
        const ti = 1 - d / reachI;
        if (ti > t) t = ti;
      }
      if (t <= 0) continue;

      const { gx, gy } = cell;
      // Edge-only noise (gating on t means the core stays clean — exactly
      // the regression the user flagged previously).
      const edgeFactor = t < HALO_NOISE_THRESHOLD ? 1 - t / HALO_NOISE_THRESHOLD : 0;
      const nDrop = hash2d(gx + 53, gy + 7);
      const nSize = hash2d(gx + 17, gy + 31);
      const nX = hash2d(gx, gy);
      const nY = hash2d(gx + 91, gy + 19);

      if (edgeFactor > 0 && nDrop > Math.min(1, t / HALO_NOISE_THRESHOLD)) continue;

      const sizeNoiseAmt = HALO_SIZE_NOISE * edgeFactor;
      const sizeMul = 1 - sizeNoiseAmt + nSize * (2 * sizeNoiseAmt);
      // Radius in SCREEN px (constant across zoom).
      const rScreen = Math.pow(t, HALO_FALLOFF) * HALO_MAX_DOT * sizeMul;
      if (rScreen < 0.35) continue;
      // Convert back to canvas px — the SVG itself sits inside the React
      // Flow viewport transform that scales by `zoom`, so dividing here
      // cancels that out and the final visible radius is rScreen.
      const rCanvas = rScreen / safeZoom;

      // Jitter is also a SCREEN-px quantity → divide by zoom for canvas.
      const jitterCanvas = (HALO_GRID * HALO_POS_JITTER * edgeFactor) / safeZoom;
      const px = gx + (nX * 2 - 1) * jitterCanvas;
      const py = gy + (nY * 2 - 1) * jitterCanvas;

      const cxStr = (px - svgX).toFixed(2);
      const cyStr = (py - svgY).toFixed(2);
      const rStr = rCanvas.toFixed(2);
      const dStr = (rCanvas * 2).toFixed(2);
      segments.push(
        `M ${cxStr} ${cyStr} m -${rStr} 0 a ${rStr} ${rStr} 0 1 0 ${dStr} 0 a ${rStr} ${rStr} 0 1 0 -${dStr} 0`,
      );
    }
    return segments.join(" ");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, tickSec]);

  if (!domNode) return null;
  const viewport = domNode.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) return null;
  if (!geometry) {
    return createPortal(<div aria-hidden style={{ display: "none" }} />, viewport);
  }

  return createPortal(
    <svg
      aria-hidden
      width={geometry.svgW}
      height={geometry.svgH}
      viewBox={`0 0 ${geometry.svgW} ${geometry.svgH}`}
      style={{
        position: "absolute",
        left: geometry.svgX,
        top: geometry.svgY,
        pointerEvents: "none",
        zIndex: -1,
        display: "block",
      }}
    >
      <path d={pathD} fill={HALO_NEON_COLOR} />
    </svg>,
    viewport,
  );
}

// === Graph construction ===

function buildInitialGraph(projects: Project[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [
    { id: HUB_ID, type: "hub", data: { label: HUB_LABEL }, position: { x: 0, y: 0 } },
    ...categories.map((c) => ({
      id: `${CAT_PREFIX}${c.id}`,
      type: "category",
      data: { label: c.label },
      position: { x: 0, y: 0 },
    })),
    ...projects.map((p) => ({
      id: `${PROJ_PREFIX}${p.id}`,
      type: "project",
      data: { label: p.title, notionId: p.id },
      position: { x: 0, y: 0 },
    })),
  ];

  const edges: Edge[] = [
    ...categories.map((c) => ({
      id: `e:hub-${c.id}`,
      source: HUB_ID,
      target: `${CAT_PREFIX}${c.id}`,
      type: "floating",
    })),
    ...projects.map((p) => ({
      id: `e:${p.categoryId}-${p.id}`,
      source: `${CAT_PREFIX}${p.categoryId}`,
      target: `${PROJ_PREFIX}${p.id}`,
      type: "floating",
    })),
  ];

  return { nodes, edges };
}

// === Randomised radial layout (constrained) ===
// Same skeleton — categories weight-share the circle, projects fan within each
// slice on two alternating rings — but five sources of variation make every
// page load produce a different arrangement:
//   1. Random whole-graph rotation (cursor starts at a random angle)
//   2. Random category order around the circle
//   3. Random project order within each slice
//   4. Random inner-or-outer start for the ring alternation
//   5. Small angular jitter (±15% of per-project arc) for organic feel
// Hard constraints kept so the graph cannot fold over itself:
//   - alternating inner/outer rings → no tangential label collisions
//   - jitter clamped to a tight window → no boundary spillage between slices
//   - category nodes stay at slice midpoint → tree shape stays readable

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function computePositions(projects: Project[]): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  positions.set(HUB_ID, { x: 0, y: 0 });

  const projectsByCategory = new Map<CategoryId, Project[]>();
  categories.forEach((c) => projectsByCategory.set(c.id, []));
  projects.forEach((p) => {
    projectsByCategory.get(p.categoryId)?.push(p);
  });

  const TWO_PI = Math.PI * 2;
  const projMid = (RADIUS.projectInner + RADIUS.projectOuter) / 2;

  // (1) random rotation + (2) random category order
  let cursor = Math.random() * TWO_PI;
  const orderedCategories = shuffle(categories);

  const weights = orderedCategories.map(
    (c) => (projectsByCategory.get(c.id)?.length ?? 0) + CATEGORY_WEIGHT_PAD,
  );
  const totalWeight = weights.reduce((a, b) => a + b, 0);

  orderedCategories.forEach((cat, ci) => {
    const kids = projectsByCategory.get(cat.id) ?? [];
    const sliceWidth = (weights[ci] / totalWeight) * TWO_PI;
    const sliceMid = cursor + sliceWidth / 2;

    positions.set(`${CAT_PREFIX}${cat.id}`, {
      x: Math.cos(sliceMid) * RADIUS.category,
      y: Math.sin(sliceMid) * RADIUS.category,
    });

    // (3) random project order, (4) random alternation start
    const shuffledKids = shuffle(kids);
    const ringStart = Math.random() < 0.5 ? 0 : 1;

    shuffledKids.forEach((p, i) => {
      const baseFrac =
        shuffledKids.length === 1 ? 0.5 : (i + 0.5) / shuffledKids.length;
      // (5) angular jitter ±15% of per-project arc, clamped to slice interior
      const jitterRange =
        shuffledKids.length === 1 ? 0 : (1 / shuffledKids.length) * 0.3;
      const frac = Math.max(
        0.06,
        Math.min(0.94, baseFrac + (Math.random() - 0.5) * jitterRange),
      );
      const angle = cursor + frac * sliceWidth;
      const r =
        shuffledKids.length >= 3
          ? (i + ringStart) % 2 === 0
            ? RADIUS.projectInner
            : RADIUS.projectOuter
          : projMid;
      positions.set(`${PROJ_PREFIX}${p.id}`, {
        x: Math.cos(angle) * r,
        y: Math.sin(angle) * r,
      });
    });

    cursor += sliceWidth;
  });

  return positions;
}

// === MindMap component ===

// Breakpoint where we switch from "fit the whole graph" to "focus inner ring".
// Below this width labels become illegible if we try to fit ~1700px of content.
const MOBILE_BREAKPOINT = 768;

function MindMapInner({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const { fitView } = useReactFlow();

  const initialData = useMemo(() => {
    const { nodes, edges } = buildInitialGraph(projects);
    const positions = computePositions(projects);
    return {
      nodes: nodes.map((n) => ({
        ...n,
        position: positions.get(n.id) ?? { x: 0, y: 0 },
      })),
      edges,
    };
  }, [projects]);

  const [nodes, , onNodesChange] = useNodesState(initialData.nodes);
  const [edges, , onEdgesChange] = useEdgesState(initialData.edges);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith(PROJ_PREFIX)) {
        const notionId = node.id.slice(PROJ_PREFIX.length);
        router.push(`/project/${notionId}`);
      }
    },
    [router],
  );

  // Pick a viewport strategy based on screen width.
  //   Desktop (>=768): fit the whole graph, clamp zoom so a huge monitor
  //                    doesn't zoom in past 1.0 and a small laptop doesn't
  //                    shrink past 0.45 (labels stay readable).
  //   Mobile  (<768) : fit just hub + the category ring. Project nodes hang
  //                    off-screen but are reachable by panning, and labels
  //                    stay legible.
  const focusViewport = useCallback(() => {
    if (typeof window === "undefined") return;
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    if (isMobile) {
      const innerRing = [
        { id: HUB_ID },
        ...categories.map((c) => ({ id: `${CAT_PREFIX}${c.id}` })),
      ];
      fitView({
        nodes: innerRing,
        padding: 0.25,
        maxZoom: 0.95,
        duration: 200,
      });
    } else {
      // minZoom raised so the initial fit is comfortably zoomed in even on
      // larger viewports — full-graph view becomes a deliberate zoom-out the
      // user has to make rather than the default.
      fitView({
        padding: 0.15,
        minZoom: 0.75,
        maxZoom: 1.1,
        duration: 200,
      });
    }
  }, [fitView]);

  useEffect(() => {
    window.addEventListener("resize", focusViewport);
    return () => window.removeEventListener("resize", focusViewport);
  }, [focusViewport]);

  // Toggle `will-change: transform` on the viewport via an `is-moving` class —
  // ONLY while the user is panning/zooming, removed 200ms after the last
  // movement event. Per xyflow#4617 a persistent will-change actually
  // produces the thin-line afterimage trails we're trying to kill.
  const movingTimerRef = useRef<number | null>(null);
  const setMovingFlag = useCallback((moving: boolean) => {
    const vp = document.querySelector<HTMLElement>(".react-flow__viewport");
    if (!vp) return;
    if (moving) {
      vp.classList.add("is-moving");
    } else {
      vp.classList.remove("is-moving");
    }
  }, []);

  const handleMoveStart = useCallback(() => {
    if (movingTimerRef.current !== null) {
      window.clearTimeout(movingTimerRef.current);
      movingTimerRef.current = null;
    }
    setMovingFlag(true);
  }, [setMovingFlag]);

  const handleMoveEnd = useCallback(() => {
    if (movingTimerRef.current !== null) {
      window.clearTimeout(movingTimerRef.current);
    }
    movingTimerRef.current = window.setTimeout(() => {
      setMovingFlag(false);
      movingTimerRef.current = null;
    }, 200);
  }, [setMovingFlag]);

  useEffect(() => {
    return () => {
      if (movingTimerRef.current !== null) {
        window.clearTimeout(movingTimerRef.current);
      }
    };
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onInit={focusViewport}
      onMoveStart={handleMoveStart}
      onMoveEnd={handleMoveEnd}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      minZoom={0.55}
      maxZoom={2}
      nodesConnectable={false}
      proOptions={{ hideAttribution: true }}
      style={{ background: "transparent" }}
    >
      <HaloLayer />
    </ReactFlow>
  );
}

// Bottom-centre zoom indicator. Rendered as a sibling of <ReactFlow> (still
// inside <ReactFlowProvider>) so it lives outside the viewport's CSS
// transform — fixed positioning works correctly and the readout doesn't
// scale with the canvas.
function ZoomIndicator() {
  const { zoomIn, zoomOut } = useReactFlow();
  const zoom = useStore((s) => s.transform[2]);
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[1000] flex items-stretch border border-black bg-white text-sm select-none">
      <button
        type="button"
        onClick={() => zoomOut({ duration: 150 })}
        className="px-3 py-1.5 border-r border-black hover:bg-black hover:text-white transition-colors"
        aria-label="Zoom out"
      >
        −
      </button>
      <div className="px-4 py-1.5 min-w-[64px] text-center tabular-nums">
        {Math.round(zoom * 100)}%
      </div>
      <button
        type="button"
        onClick={() => zoomIn({ duration: 150 })}
        className="px-3 py-1.5 border-l border-black hover:bg-black hover:text-white transition-colors"
        aria-label="Zoom in"
      >
        +
      </button>
    </div>
  );
}

export default function MindMap({ projects }: { projects: Project[] }) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <MindMapInner projects={projects} />
        <ZoomIndicator />
      </ReactFlowProvider>
    </div>
  );
}
