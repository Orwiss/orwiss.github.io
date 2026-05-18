"use client";

import {
  createContext,
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

const HubNode = memo(function HubNode({ data }: NodeProps) {
  // Hub is the default-state halo anchor. Hovering it is semantically
  // the same as the empty/default state, so we explicitly assert
  // HUB_ID on enter (covers the case where the cursor enters hub from
  // a category / project hover without crossing dead space first).
  const setHovered = useContext(HoverSetterContext);
  return (
    <div
      onMouseEnter={() => setHovered(HUB_ID)}
      onMouseLeave={() => setHovered(null)}
      className="bg-black text-white px-12 py-5 text-5xl sm:text-4xl sm:px-9 sm:py-4 whitespace-nowrap tracking-tight"
    >
      {String(data.label)}
      <HiddenHandles />
    </div>
  );
});

const CategoryNode = memo(function CategoryNode({ id, data }: NodeProps) {
  const setHovered = useContext(HoverSetterContext);
  return (
    <div
      onMouseEnter={() => setHovered(id)}
      onMouseLeave={() => setHovered(null)}
      className="bg-[#DDD] border rounded-full border-black px-9 py-4 text-3xl sm:text-2xl sm:px-7 sm:py-3 whitespace-nowrap"
    >
      {String(data.label)}
      <HiddenHandles />
    </div>
  );
});

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
// Per-node base reach in SCREEN px. Hub gets a much larger field since it
// is the default "attractor" halo shown when nothing else is hovered;
// categories + projects share the normal reach.
const HUB_HALO_PAD = 520;      // SCREEN-px reach for the hub's default halo
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
const HALO_FREQ_MIN = 0.07;        // Hz — slowest breathing cycle (~14s)
const HALO_FREQ_MAX = 0.16;        // Hz — fastest breathing cycle (~6.3s)
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

// === Hover state plumbing ===============================================
// Nodes report mouse enter/leave through this context; HaloLayer reads
// the current hovered id (+ derived target set) to drive its per-node
// reach interpolation. Keeping it in context means nodes don't have to
// know about HaloLayer's internals, and HaloLayer doesn't have to drill
// hover handlers through React Flow's nodeTypes plumbing.
// Hover plumbing is split into TWO contexts on purpose:
//   - HoverSetterContext exposes only the setter. React's useState
//     setter is reference-stable for the component's lifetime, so the
//     context value never changes → node consumers re-render zero
//     times when hover state moves around.
//   - HoverStateContext carries the actual hovered / dragging ids and
//     re-renders only its consumer (HaloLayer), not the 28+ nodes.
// Combined context (previous shape) churned the value object every
// hover change and cascaded a re-render through every node.
type HoverState = {
  hoveredId: string | null;
  // Set independently by React Flow's drag lifecycle; takes precedence
  // over hoveredId so that fast cursor motion outpacing the dragged
  // node (which fires mouseLeave → clears hoveredId) doesn't strip the
  // halo from the node the user is actively manipulating.
  draggingId: string | null;
};
const HoverSetterContext = createContext<(id: string | null) => void>(
  () => {},
);
const HoverStateContext = createContext<HoverState>({
  hoveredId: null,
  draggingId: null,
});

// Static lookups derived from the Notion-fed projects list. categoryProjects
// maps "cat:<id>" → array of "proj:<id>" so HaloLayer can light up an entire
// category's children on category hover. projectCategory is the inverse for
// project-hover (where we light up just the project's parent category).
type ProjectMapsCtx = {
  projectCategory: Map<string, string>;
  categoryProjects: Map<string, string[]>;
};
const ProjectMapsContext = createContext<ProjectMapsCtx>({
  projectCategory: new Map(),
  categoryProjects: new Map(),
});

const ProjectNode = memo(function ProjectNode({ id, data }: NodeProps) {
  const [hovered, setHovered] = useState(false);
  const [coverFailed, setCoverFailed] = useState(false);
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const notionId = (data.notionId as string | undefined) ?? "";
  const label = String(data.label);
  const setHoveredCtx = useContext(HoverSetterContext);

  // Compute popup placement at hover time. We render via a portal to
  // document.body (see below) so the popup escapes React Flow's transform tree
  // — its size stays constant regardless of canvas zoom, and z-index works
  // without lifting wrapper stacking contexts.
  const handleEnter = () => {
    setHoveredCtx(id);
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
    setHoveredCtx(null);
    setHovered(false);
    setCoverFailed(false);
    setPopupPos(null);
  };

  return (
    <div
      ref={ref}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative bg-white border border-black px-7 py-3 text-2xl sm:text-xl sm:px-5 sm:py-2.5 whitespace-nowrap cursor-pointer transition-colors hover:bg-black hover:text-white"
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
});

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

// Per-node bloom traversal time (seconds). Linear interpolation between
// 0 ↔ fullReach so bloom-in and bloom-out have IDENTICAL perceived speed
// (exponential approach makes the first frames much faster than the
// later ones, which read as asymmetric especially for bloom-in where
// the dots are invisible at sub-pixel sizes during the fast early phase).
// Per-node step = fullReach / DURATION so hub (520 px) and others
// (220 px) finish at the same wall-clock time even though they cover
// different absolute ranges.
const HALO_BLOOM_DURATION = 0.8;
// Below this screen-px residual reach we treat a fading-out node as
// fully gone and drop it from the active set. The animation pass
// already suppresses dots whose radius is < 0.35px, so ≤0.5px residual
// reach produces no visible dots — pruning here is invisible.
const HALO_PRUNE_REACH = 0.5;

function fullReachForId(id: string): number {
  return id === HUB_ID ? HUB_HALO_PAD : HALO_PAD;
}

// Hub's halo uses a fundamentally DIFFERENT noise mechanism from
// category/project halos. Project/category halos use per-cell random
// dropout + position jitter + size jitter (controlled, edge-only —
// they read as a clean halftone with a slightly speckled rim). Hub
// instead keeps a perfectly regular halftone grid AND clean per-dot
// sizes, but the ISO-CONTOUR itself wobbles wave-like via spatial
// coherent noise — exactly the look in image 2 of the user's feedback
// (TRIP halftone): regular dots, irregular boundary.
const HUB_BOUNDARY_NOISE_AMP = 0.42;      // t shift amplitude (±) at the iso-contour
const HUB_NOISE_WAVELENGTH = 70;          // SCREEN-px between noise peaks
const HUB_NOISE_DRIFT = 0.04;             // slow time-domain drift so the wave slowly morphs
// Gate the boundary noise to cells near the iso-contour. Cells deeper
// inside (t > this threshold) get the FULL clean halftone falloff so
// internal dot sizes never wobble; only cells in the outer rim get the
// wave-shifted t. Without this gate the screenshot the user pushed
// back on showed bright "blotches" inside the halo — that was noise
// adding to t=0.7 cells, doubling their effective intensity locally.
const HUB_NOISE_EDGE_THRESHOLD = 0.45;

function boundaryNoiseAmpForId(id: string): number {
  return id === HUB_ID ? HUB_BOUNDARY_NOISE_AMP : 0;
}
function usesBoundaryNoise(id: string): boolean {
  return id === HUB_ID;
}

// Smooth 2D value noise: bilinearly interpolated hash2d corners with a
// smoothstep weight. Returns [0, 1]. Cheap (8 floats + 5 mixes) and
// good enough for organic-looking iso-contour wobble.
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

function HaloLayer() {
  // Position fingerprint — React Flow mutates nodeLookup in place, so
  // we need a selector whose OUTPUT changes only when halo-relevant
  // geometry changes (positions + measurements of any node), without
  // forcing a re-render on every store tick.
  //
  // Implementation is a numeric hash:
  //   - zero string allocation per tick (was 28+ template strings,
  //     plus an array, plus sort, plus a join → significant churn on
  //     every drag / pan / selection / etc.)
  //   - Map iteration is insertion-order stable in modern engines, so
  //     no sort is needed for a stable fingerprint
  //   - the hash combines x/y/w/h via FNV-like rolling so any change
  //     to any field flips the value
  // The id is NOT folded in (constant per node anyway). Insertion
  // order changes would change the hash, but that only happens when
  // the actual node set changes — which IS a geometry change we want
  // to redetect, so the behaviour is correct.
  const positionsKey = useStore((s) => {
    let h = 2166136261;
    s.nodeLookup.forEach((node) => {
      const w = node.measured?.width;
      const ht = node.measured?.height;
      if (!w || !ht) return;
      h ^= ((node.position.x * 2) | 0) + 0x9e3779b9;
      h = Math.imul(h, 16777619);
      h ^= ((node.position.y * 2) | 0) + 0x9e3779b9;
      h = Math.imul(h, 16777619);
      h ^= ((w * 2) | 0) + 0x9e3779b9;
      h = Math.imul(h, 16777619);
      h ^= ((ht * 2) | 0) + 0x9e3779b9;
      h = Math.imul(h, 16777619);
    });
    return h >>> 0;
  });

  const nodeLookup = useStore((s) => s.nodeLookup);
  // Live zoom bucket subscription (0.05 step). Continuous density
  // tracking: when the user zooms, geometry rebuilds at each bucket
  // boundary so visible dot spacing stays at HALO_GRID px. Per-rebuild
  // cost is small (cells/node is bucket-invariant); the BIG cost that
  // used to make this prohibitive was the SVG `d` attribute reparse +
  // rasterization on every rebuild — that's gone in the canvas
  // renderer below.
  const zoomBucket = useStore((s) =>
    Math.max(0.001, Math.round(s.transform[2] * 20) / 20),
  );
  // Trigger canvas redraw on transform change (pan / zoom). Bucketed
  // to integer-px translation and 1% zoom so React renders at most at
  // visible-motion granularity. Within-bucket changes are sub-pixel
  // and the user can't see them anyway.
  const transformKey = useStore(
    (s) =>
      `${s.transform[0] | 0},${s.transform[1] | 0},${(s.transform[2] * 100) | 0}`,
  );
  // Trigger canvas resize on container resize.
  const containerSize = useStore(
    (s) => `${Math.round(s.width)}x${Math.round(s.height)}`,
  );
  const storeApi = useStoreApi();

  // Scratch typed arrays reused across animation ticks. Allocating
  // fresh Float32Arrays per frame was small but constant GC pressure
  // (60 typed-array allocs/sec at 30fps). Grow only when the active
  // rect count exceeds capacity; never shrink.
  const reachScratchRef = useRef<Float32Array>(new Float32Array(0));
  const bloomScratchRef = useRef<Float32Array>(new Float32Array(0));

  const { hoveredId, draggingId } = useContext(HoverStateContext);
  const { projectCategory, categoryProjects } = useContext(ProjectMapsContext);

  // === Reach state ======================================================
  // Active id = drag wins over hover (drag is the user's deliberate
  // gesture; fast mouse motion outpacing the node would otherwise drop
  // the halo via the cleared mouseLeave hoveredId). targetReach is the
  // SCREEN-px max reach per node id derived from that active id:
  // default state = hub at HUB_HALO_PAD; category active lights up the
  // category + its children at HALO_PAD; project active lights up its
  // parent category + itself at HALO_PAD.
  const activeId = draggingId ?? hoveredId;
  const targetReach = useMemo(() => {
    const m = new Map<string, number>();
    if (activeId === null || activeId === HUB_ID) {
      m.set(HUB_ID, HUB_HALO_PAD);
    } else if (activeId.startsWith(CAT_PREFIX)) {
      m.set(activeId, HALO_PAD);
      categoryProjects.get(activeId)?.forEach((pid) => m.set(pid, HALO_PAD));
    } else if (activeId.startsWith(PROJ_PREFIX)) {
      const catId = projectCategory.get(activeId);
      if (catId) m.set(catId, HALO_PAD);
      m.set(activeId, HALO_PAD);
    }
    return m;
  }, [activeId, projectCategory, categoryProjects]);

  // currentReach mutated in-place every RAF tick by the interpolation
  // loop. Seeded with hub at full so the very first paint is the default
  // state, not an unbloomed flash.
  const currentReachRef = useRef<Map<string, number>>(
    new Map([[HUB_ID, HUB_HALO_PAD]]),
  );
  const targetReachRef = useRef(targetReach);
  useEffect(() => {
    targetReachRef.current = targetReach;
  }, [targetReach]);

  // activeSetSig is a sorted "|"-joined list of node ids currently in the
  // active set (target OR still-fading-out). Changes drive geometry
  // rebuilds — when the membership shifts, we need to re-enumerate cells
  // around the new union of node rects. The RAF loop below assigns to it
  // only when the actual membership string differs, so steady-state ticks
  // do not re-render the geometry useMemo.
  const [activeSetSig, setActiveSetSig] = useState<string>(HUB_ID);

  // RAF tick — drives both (a) the per-node reach interpolation toward
  // its current target AND (b) the per-frame breathing oscillation. We
  // throttle the React re-render side via `tickSec` but always step the
  // ref-based interpolation so its temporal resolution is the browser's
  // refresh rate, not the tick rate. Pause when the tab is hidden.
  const [tickSec, setTickSec] = useState(0);
  useEffect(() => {
    let raf = 0;
    let lastEmit = -Infinity;
    let lastTime = performance.now();
    const minDelta = 1000 / HALO_TARGET_FPS;

    const loop = (now: number) => {
      // Clamp dt so a tab-resume or long pause doesn't snap reach
      // instantly past the smooth bloom.
      const dt = Math.min(0.1, Math.max(0, (now - lastTime) / 1000));
      lastTime = now;

      // Interpolate reach for every id appearing in either current or
      // target. Track which ids stay above the prune threshold; that
      // becomes the active set.
      const current = currentReachRef.current;
      const target = targetReachRef.current;
      const seen = new Set<string>();
      current.forEach((_, id) => seen.add(id));
      target.forEach((_, id) => seen.add(id));

      const activeIds: string[] = [];
      seen.forEach((id) => {
        const cur = current.get(id) ?? 0;
        const tgt = target.get(id) ?? 0;
        let next: number;
        if (cur === tgt) {
          next = cur;
        } else {
          // Linear step. maxDelta is scaled by THIS node's fullReach so
          // hub (520px) and others (220px) finish their 0↔fullReach
          // traversal in the same wall-clock HALO_BLOOM_DURATION — the
          // ratio currentReach/fullReach (used as the bloom factor in
          // pathD) advances at the same rate for every node.
          const maxDelta = (fullReachForId(id) / HALO_BLOOM_DURATION) * dt;
          const diff = tgt - cur;
          const absDiff = diff < 0 ? -diff : diff;
          const stepMag = absDiff < maxDelta ? absDiff : maxDelta;
          next = diff > 0 ? cur + stepMag : cur - stepMag;
        }
        if (next <= HALO_PRUNE_REACH && tgt === 0) {
          current.delete(id);
        } else {
          current.set(id, next);
          activeIds.push(id);
        }
      });

      // Emit tick state on the throttled cadence so the per-frame path
      // build (pathD useMemo) only runs HALO_TARGET_FPS times per sec.
      if (now - lastEmit >= minDelta) {
        lastEmit = now;
        setTickSec(now / 1000);
      }

      // Membership change → re-render so geometry useMemo can rebuild.
      activeIds.sort();
      const sig = activeIds.join("|");
      setActiveSetSig((prev) => (prev === sig ? prev : sig));

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onVisible = () => {
      if (document.hidden) cancelAnimationFrame(raf);
      else {
        lastTime = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // === Geometry pass (cached) ===========================================
  // For each cell that any ACTIVE node's MAX-reach halo could touch,
  // record per-node distance. Each rect carries its own fullReach
  // (HUB_HALO_PAD for the hub, HALO_PAD for categories/projects) so the
  // cell enumeration stays tight around small nodes and only blows up
  // around the hub when it's actually part of the active set.
  // Recomputed when:
  //   - node positions change (positionsKey)
  //   - we cross a zoom bucket boundary (zoomBucket)
  //   - the active-set membership changes (activeSetSig)
  const geometry = useMemo(() => {
    if (!activeSetSig) return null;
    const ids = activeSetSig.split("|");
    type Rect = {
      id: string;
      cx: number;
      cy: number;
      halfW: number;
      halfH: number;
      fullReachScreen: number; // SCREEN-px design max reach for this node
      maxReachCanvas: number;  // canvas-px enumeration radius incl. boundary-noise outward extension
      hasBoundaryNoise: boolean;
      freq: number;            // rad/s
      phase: number;           // rad
    };
    const rects: Rect[] = [];
    for (const id of ids) {
      const node = nodeLookup.get(id);
      if (!node) continue;
      const w = node.measured?.width;
      const h = node.measured?.height;
      if (!w || !h) continue;
      const h01 = hashString(id);
      const freqHz = HALO_FREQ_MIN + h01 * (HALO_FREQ_MAX - HALO_FREQ_MIN);
      const fullReachScreen = id === HUB_ID ? HUB_HALO_PAD : HALO_PAD;
      // For nodes using spatial boundary noise (hub), extend enumeration
      // outward by the boundary noise amplitude so cells whose t was
      // originally just below zero (d > nominal reach) can still get a
      // positive noise-shifted t and be rendered. Without the
      // extension the wave can never bulge outward, only carve inward.
      const boundaryAmp = boundaryNoiseAmpForId(id);
      const maxReachCanvas =
        (fullReachScreen / zoomBucket) * HALO_MAX_MUL * (1 + boundaryAmp);
      rects.push({
        id,
        cx: node.position.x + w / 2,
        cy: node.position.y + h / 2,
        halfW: w / 2,
        halfH: h / 2,
        fullReachScreen,
        maxReachCanvas,
        hasBoundaryNoise: usesBoundaryNoise(id),
        freq: 2 * Math.PI * freqHz,
        phase: h01 * 2 * Math.PI,
      });
    }
    if (rects.length === 0) return null;

    // NOTE: previously tried scaling gridScreen with the active rect
    // count to shrink cell count during multi-halo blooms — that
    // caused a visible snap (dots jumping to new grid positions
    // every time the active set grew). Grid stays a single constant
    // value so dot positions are stable across hover transitions.
    const gridScreen = HALO_GRID;
    const gridCanvas = gridScreen / zoomBucket;

    // Cell record: position in canvas px + flat per-rect distance list.
    type Cell = {
      gx: number;
      gy: number;
      rectIdx: Uint16Array;
      dist: Float32Array;
    };
    const cellMap = new Map<string, { gx: number; gy: number; rectIdx: number[]; dist: number[] }>();

    let worldMinX = Infinity;
    let worldMinY = Infinity;
    let worldMaxX = -Infinity;
    let worldMaxY = -Infinity;

    // Per-rect cell enumeration. Iterating the bounding box for each
    // rect (rather than a single union box for all rects) keeps the
    // total cell count proportional to active-halo area instead of
    // bounding-box-of-all-halos area — a big saving when nodes are far
    // apart (e.g. hub center + a single distant project on hover).
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i];
      const reach = r.maxReachCanvas;
      const minX = r.cx - r.halfW - reach;
      const minY = r.cy - r.halfH - reach;
      const maxX = r.cx + r.halfW + reach;
      const maxY = r.cy + r.halfH + reach;
      if (minX < worldMinX) worldMinX = minX;
      if (minY < worldMinY) worldMinY = minY;
      if (maxX > worldMaxX) worldMaxX = maxX;
      if (maxY > worldMaxY) worldMaxY = maxY;

      const cgxStart = Math.floor(minX / gridCanvas);
      const cgxEnd = Math.ceil(maxX / gridCanvas);
      const cgyStart = Math.floor(minY / gridCanvas);
      const cgyEnd = Math.ceil(maxY / gridCanvas);

      for (let cgy = cgyStart; cgy < cgyEnd; cgy += 1) {
        const gy = (cgy + 0.5) * gridCanvas;
        for (let cgx = cgxStart; cgx < cgxEnd; cgx += 1) {
          const gx = (cgx + 0.5) * gridCanvas;
          const dx = Math.abs(gx - r.cx) - r.halfW;
          const dy = Math.abs(gy - r.cy) - r.halfH;
          const ox = dx > 0 ? dx : 0;
          const oy = dy > 0 ? dy : 0;
          const d = Math.sqrt(ox * ox + oy * oy);
          if (d > reach) continue;
          const key = `${cgx},${cgy}`;
          let cell = cellMap.get(key);
          if (!cell) {
            cell = { gx, gy, rectIdx: [], dist: [] };
            cellMap.set(key, cell);
          }
          cell.rectIdx.push(i);
          cell.dist.push(d);
        }
      }
    }

    const cells: Cell[] = [];
    cellMap.forEach((c) => {
      cells.push({
        gx: c.gx,
        gy: c.gy,
        rectIdx: Uint16Array.from(c.rectIdx),
        dist: Float32Array.from(c.dist),
      });
    });

    const svgX = Math.floor(worldMinX / gridCanvas) * gridCanvas;
    const svgY = Math.floor(worldMinY / gridCanvas) * gridCanvas;
    const svgW = Math.ceil((worldMaxX - svgX) / gridCanvas) * gridCanvas;
    const svgH = Math.ceil((worldMaxY - svgY) / gridCanvas) * gridCanvas;

    return { rects, cells, svgX, svgY, svgW, svgH, gridCanvas, gridScreen };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey, zoomBucket, activeSetSig]);

  // === Animation pass (per RAF tick) =====================================
  // Imperative canvas draw. Used to emit one <path d=...> string into an
  // SVG; switched to canvas because the SVG path-attribute reparse +
  // rasterization (browser side) was costing ~10-20ms per frame at our
  // dot counts, which is what made fast zooms feel laggy. Canvas's
  // per-frame redraw is ~1-2ms regardless of dot count.
  //
  // The CANVAS is positioned in screen-pixel space (NOT inside React
  // Flow's CSS-transformed viewport). Each draw reads the live transform
  // from the store, maps each cell's canvas-coord (gx, gy) → screen-px,
  // then draws an arc at the right pixel position. Because we redraw
  // every frame at native device-pixel density, there is no pixelation
  // when the user zooms in — same crispness as the previous SVG.
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = storeApi.getState();
    const cssW = state.width;
    const cssH = state.height;
    if (!cssW || !cssH) return;

    // Size buffer at native device-pixel density so dots are crisp
    // regardless of DPR. Idempotent if size hasn't changed.
    const dpr = window.devicePixelRatio || 1;
    const wantW = Math.round(cssW * dpr);
    const wantH = Math.round(cssH * dpr);
    if (canvas.width !== wantW || canvas.height !== wantH) {
      canvas.width = wantW;
      canvas.height = wantH;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Work in CSS-px (DPR baked into the transform), then clear.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssW, cssH);

    if (!geometry) return;
    const { rects, cells, gridScreen } = geometry;

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

    // Per-node reach AND bloom factor for THIS tick.
    //   reach[i]  : canvas-px iso-contour radius — drives WHICH cells
    //               are inside the halo at all (max-blend below).
    //   bloom[i]  : 0..1 bloom progress = currentBase / fullReach.
    //   Steady state: bloom = 1 so this is a no-op overlay on the
    //   breathing modulation we already had.
    const currentReach = currentReachRef.current;
    // Reuse scratch buffers; grow if a larger active set arrived.
    let reach = reachScratchRef.current;
    let bloom = bloomScratchRef.current;
    if (reach.length < rects.length) {
      reach = new Float32Array(rects.length);
      reachScratchRef.current = reach;
    }
    if (bloom.length < rects.length) {
      bloom = new Float32Array(rects.length);
      bloomScratchRef.current = bloom;
    }
    for (let i = 0; i < rects.length; i += 1) {
      const r = rects[i];
      const baseScreen = currentReach.get(r.id) ?? 0;
      if (baseScreen <= 0) {
        reach[i] = 0;
        bloom[i] = 0;
        continue;
      }
      bloom[i] = baseScreen >= r.fullReachScreen ? 1 : baseScreen / r.fullReachScreen;
      // Reach in canvas px is locked to settled bucket so the
      // iso-contour doesn't grow/shrink within geometry's grid during
      // a live zoom — that would make dots appear/disappear randomly
      // through the zoom tween.
      const baseCanvas = baseScreen / safeZoom;
      reach[i] = baseCanvas * (1 + HALO_AMP * Math.sin(tickSec * r.freq + r.phase));
    }

    // Batch all dots into one Path2D / fill call. ctx.beginPath + N
    // ctx.arc + ctx.fill is the canonical fast pattern for many
    // small same-colour shapes — far cheaper than per-dot fillRect/fill.
    ctx.fillStyle = HALO_NEON_COLOR;
    ctx.beginPath();
    const TWO_PI = Math.PI * 2;
    for (const cell of cells) {
      // Cheap rejection FIRST — skips ~50%+ of cells when zoomed in.
      if (cell.gx < viewMinX || cell.gx > viewMaxX) continue;
      if (cell.gy < viewMinY || cell.gy > viewMaxY) continue;
      // Max-blend t across contributing nodes using time-varying reach.
      // Each contribution carries its node's bloom factor (0..1) so
      // cells belonging to a fading-in/out node get smaller t → dots
      // grow into / shrink out of existence instead of popping in at
      // full size. We also remember whether the winning rect uses the
      // spatial boundary-noise pipeline (hub) or the per-cell edge
      // dropout pipeline (category / project).
      let t = 0;
      let winnerUsesBoundaryNoise = false;
      for (let k = 0; k < cell.rectIdx.length; k += 1) {
        const idx = cell.rectIdx[k];
        const reachI = reach[idx];
        if (reachI <= 0) continue;
        const d = cell.dist[k];
        if (d >= reachI) continue;
        const ti = (1 - d / reachI) * bloom[idx];
        if (ti > t) {
          t = ti;
          winnerUsesBoundaryNoise = rects[idx].hasBoundaryNoise;
        }
      }
      if (t <= 0) continue;

      const { gx, gy } = cell;

      if (winnerUsesBoundaryNoise) {
        // === Hub: spatial coherent boundary noise =========================
        // Iso-contour wobbles wave-like via smooth 2D noise sampled in
        // SCREEN coords (so wavelength is visually constant across zoom)
        // with a slow time drift. The noise is GATED by edgeFactor — it
        // only displaces t for cells in the outer rim, leaving deeper
        // cells with their clean halftone falloff. This keeps the core
        // pattern perfectly regular while the boundary alone undulates.
        const edgeFactor =
          t < HUB_NOISE_EDGE_THRESHOLD ? 1 - t / HUB_NOISE_EDGE_THRESHOLD : 0;
        let tEffective = t;
        if (edgeFactor > 0) {
          // Use safeZoom for noise sample coords so the wave
          // pattern is locked to the canvas during a freeze; live zoom
          // would shift the wave through dots mid-tween, which would
          // shimmer instead of scaling cleanly.
          const nx = (gx * safeZoom) / HUB_NOISE_WAVELENGTH + tickSec * HUB_NOISE_DRIFT;
          const ny = (gy * safeZoom) / HUB_NOISE_WAVELENGTH - tickSec * HUB_NOISE_DRIFT * 0.6;
          const noise = smoothNoise2d(nx, ny);
          tEffective = t + (noise - 0.5) * 2 * HUB_BOUNDARY_NOISE_AMP * edgeFactor;
          if (tEffective <= 0) continue;
        }
        const rScreen = Math.pow(tEffective, HALO_FALLOFF) * HALO_MAX_DOT;
        if (rScreen < 0.35) continue;
        // Map canvas-coord cell centre → screen-px and draw arc directly
        // at the screen-px radius. No CSS transform on the canvas means
        // no pixelation when the user zooms in.
        const screenX = gx * safeZoom + tx;
        const screenY = gy * safeZoom + ty;
        ctx.moveTo(screenX + rScreen, screenY);
        ctx.arc(screenX, screenY, rScreen, 0, TWO_PI);
        continue;
      }

      // === Category / project: edge dropout + jitter + size noise =========
      // (Original mechanism — speckled rim, clean core. Untouched.)
      const edgeFactor = t < HALO_NOISE_THRESHOLD ? 1 - t / HALO_NOISE_THRESHOLD : 0;
      const nDrop = hash2d(gx + 53, gy + 7);
      const nSize = hash2d(gx + 17, gy + 31);
      const nX = hash2d(gx, gy);
      const nY = hash2d(gx + 91, gy + 19);

      if (edgeFactor > 0 && nDrop > Math.min(1, t / HALO_NOISE_THRESHOLD)) continue;

      const sizeNoiseAmt = HALO_SIZE_NOISE * edgeFactor;
      const sizeMul = 1 - sizeNoiseAmt + nSize * (2 * sizeNoiseAmt);
      const rScreen = Math.pow(t, HALO_FALLOFF) * HALO_MAX_DOT * sizeMul;
      if (rScreen < 0.35) continue;

      // Jitter offset, kept as a constant SCREEN-px fraction of the
      // grid cell spacing (divide by safeZoom converts back to canvas
      // because gx/gy are canvas coords).
      const jitterCanvas = (gridScreen * HALO_POS_JITTER * edgeFactor) / safeZoom;
      const px = gx + (nX * 2 - 1) * jitterCanvas;
      const py = gy + (nY * 2 - 1) * jitterCanvas;

      // Map jittered canvas position → screen-px and queue arc.
      const screenX = px * safeZoom + tx;
      const screenY = py * safeZoom + ty;
      ctx.moveTo(screenX + rScreen, screenY);
      ctx.arc(screenX, screenY, rScreen, 0, TWO_PI);
    }
    ctx.fill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geometry, tickSec, transformKey, containerSize]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
      }}
    />
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
  const { setViewport } = useReactFlow();
  const storeApi = useStoreApi();
  // Subscribe to the React Flow container's measured size — this differs
  // from window.innerWidth/Height when a scrollbar is present or the
  // container doesn't fill the viewport, and using the wrong dimension
  // was why the hub landed slightly off-centre on first paint.
  const containerSize = useStore(
    (s) => `${Math.round(s.width)}x${Math.round(s.height)}`,
  );
  // Also subscribe to the hub's measured box so we re-focus once React
  // Flow has actually measured it — the node `position` is the
  // TOP-LEFT corner, so without the half-W/half-H offset the hub
  // lands down-right of the viewport centre.
  const hubMeasureKey = useStore((s) => {
    const hub = s.nodeLookup.get(HUB_ID);
    const w = hub?.measured?.width;
    const h = hub?.measured?.height;
    return w && h ? `${Math.round(w)}x${Math.round(h)}` : "";
  });

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

  // Static parent ↔ children maps for the hover-driven halo logic. Built
  // from the same Notion-fed projects list React Flow already has, so
  // they update in lockstep with the graph.
  const projectMaps = useMemo<ProjectMapsCtx>(() => {
    const projectCategory = new Map<string, string>();
    const categoryProjects = new Map<string, string[]>();
    for (const p of projects) {
      const projId = `${PROJ_PREFIX}${p.id}`;
      const catId = `${CAT_PREFIX}${p.categoryId}`;
      projectCategory.set(projId, catId);
      const arr = categoryProjects.get(catId);
      if (arr) arr.push(projId);
      else categoryProjects.set(catId, [projId]);
    }
    return { projectCategory, categoryProjects };
  }, [projects]);

  // Hovered-node state. null = default (hub halo only). Set by nodes via
  // HoverContext below; HaloLayer reads it to compute target reach per id.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // Drag state — set by React Flow's node-drag lifecycle below. Drives
  // the halo independently from hoveredId so that a fast drag (which
  // makes the cursor leave the node's DOM mid-gesture and clear
  // hoveredId) still keeps the halo lit on the manipulated node.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  // Only the state pair is memoized — `setHoveredId` is reference-stable
  // by React's useState contract, so it's passed straight to its own
  // context provider with no wrapper that would force re-renders.
  const hoverState = useMemo<HoverState>(
    () => ({ hoveredId, draggingId }),
    [hoveredId, draggingId],
  );

  const handleNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setDraggingId(node.id);
    },
    [],
  );
  const handleNodeDragStop = useCallback(() => {
    setDraggingId(null);
  }, []);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (node.id.startsWith(PROJ_PREFIX)) {
        const notionId = node.id.slice(PROJ_PREFIX.length);
        router.push(`/project/${notionId}`);
      }
    },
    [router],
  );

  // Viewport math is driven directly off the viewport size rather than
  // React Flow's fitView: we want the hub to ALWAYS land at the visible
  // centre on first paint regardless of how the random project layout's
  // bbox happens to skew. setViewport with tx/ty = vp/2 + zoom*0 maps
  // canvas (0,0) → screen centre by construction.
  //
  // Zoom is picked so the category ring (RADIUS.category) + a bit of
  // label slack fits inside the SHORT dimension at ~80% width. Caps:
  //   mobile (<MOBILE_BREAKPOINT): zoom clamped to [0.4, 0.9] so small
  //     phones don't end up zoomed in past the category labels; large
  //     phones in landscape get a comfortable mid-range view.
  //   desktop: clamped to [0.65, 1.1] so huge monitors don't blow up to
  //     close-up zoom and tiny laptops still see the full inner ring.
  // Track first ever successful focusViewport so we can (a) snap the
  // initial placement without a 200ms tween (which is what the user
  // saw as "things visibly sliding into position on load") and (b)
  // fade the canvas in only AFTER nodes are at their final spots.
  const firstFocusDoneRef = useRef(false);
  const [isReady, setIsReady] = useState(false);

  const focusViewport = useCallback(() => {
    const state = storeApi.getState();
    const vpW = state.width;
    const vpH = state.height;
    if (!vpW || !vpH) return;
    const hub = state.nodeLookup.get(HUB_ID);
    const hubW = hub?.measured?.width ?? 0;
    const hubH = hub?.measured?.height ?? 0;
    // Defer the first focus until the hub is actually measured —
    // otherwise we'd compute a translate with hubW/hubH=0 and the hub
    // would land at the wrong spot, only to snap again once measurement
    // arrives (which is exactly the "shifting" the user reported).
    if (!firstFocusDoneRef.current && (!hubW || !hubH)) return;

    const isMobile = vpW < MOBILE_BREAKPOINT;
    const minDim = Math.min(vpW, vpH);
    const innerRadius = RADIUS.category + 90;
    const fitZoom = (0.8 * minDim) / (2 * innerRadius);
    const initialZoom = isMobile
      ? Math.min(0.9, Math.max(0.4, fitZoom))
      : Math.min(1.1, Math.max(0.65, fitZoom));

    const tx = vpW / 2 - (hubW / 2) * initialZoom;
    const ty = vpH / 2 - (hubH / 2) * initialZoom;

    const isFirst = !firstFocusDoneRef.current;
    setViewport(
      { x: tx, y: ty, zoom: initialZoom },
      { duration: isFirst ? 0 : 200 },
    );
    if (isFirst) {
      firstFocusDoneRef.current = true;
      // One animation frame for the viewport transform to actually
      // commit before we fade the canvas in.
      requestAnimationFrame(() => setIsReady(true));
    }
  }, [storeApi, setViewport]);

  // Re-centre whenever React Flow's measured container size or the hub
  // node's measured box changes. Container measurement happens on mount
  // and resize; the hub measurement lands on the first render right
  // after that, and we need both to compute the correct translate.
  useEffect(() => {
    focusViewport();
  }, [containerSize, hubMeasureKey, focusViewport]);

  // minZoom must be low enough that mobile users can zoom out to see
  // the OUTER project ring (RADIUS.projectOuter + label slack) — the
  // user reported that at the old fixed minZoom=0.55 a phone only saw
  // a handful of nodes. Compute the zoom that makes the full graph
  // diameter equal the viewport short-dim; cap above at 0.55 so
  // desktops keep the existing comfortable lower bound.
  const [minZoom, setMinZoom] = useState(0.55);
  useEffect(() => {
    const state = storeApi.getState();
    if (!state.width || !state.height) return;
    const minDim = Math.min(state.width, state.height);
    const outerRadius = RADIUS.projectOuter + 140;
    const fitAllZoom = minDim / (2 * outerRadius);
    setMinZoom(Math.min(0.55, fitAllZoom));
  }, [containerSize, storeApi]);

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
    <ProjectMapsContext.Provider value={projectMaps}>
      <HoverSetterContext.Provider value={setHoveredId}>
        <HoverStateContext.Provider value={hoverState}>
        <div
          className={`relative w-full h-full transition-opacity duration-300 ease-out ${
            isReady ? "opacity-100" : "opacity-0"
          }`}
        >
        {/* Canvas paints first (DOM order) → halo sits behind React Flow's
            nodes + edges without any z-index gymnastics. HaloLayer lives
            outside the React Flow viewport's CSS transform so its pixels
            are never CSS-stretched — that was the cause of the previous
            canvas-attempt's pixelation when zoomed in. */}
        <HaloLayer />
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          onNodeDragStart={handleNodeDragStart}
          onNodeDragStop={handleNodeDragStop}
          onInit={focusViewport}
          onMoveStart={handleMoveStart}
          onMoveEnd={handleMoveEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          minZoom={minZoom}
          maxZoom={2}
          nodesConnectable={false}
          proOptions={{ hideAttribution: true }}
          style={{ background: "transparent" }}
        />
        </div>
        </HoverStateContext.Provider>
      </HoverSetterContext.Provider>
    </ProjectMapsContext.Provider>
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
