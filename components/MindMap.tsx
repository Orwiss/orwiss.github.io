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
  category: 380,
  projectInner: 720,
  projectOuter: 1080,
} as const;

const CATEGORY_WEIGHT_PAD = 3;

// === Custom node components ===

function HubNode({ data }: NodeProps) {
  return (
    <div className="bg-black text-white px-7 py-3.5 text-3xl whitespace-nowrap tracking-tight">
      {String(data.label)}
      <HiddenHandles />
    </div>
  );
}

function CategoryNode({ data }: NodeProps) {
  return (
    <div className="bg-[#DDD] border rounded-full border-black px-5 py-2.5 text-xl whitespace-nowrap">
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
const HALO_PAD = 130;          // px the halo extends past each node edge
const HALO_GRID = 10;          // px between dot centres
const HALO_RANGE = HALO_PAD;   // px over which dot radius decays to zero
const HALO_MAX_DOT = HALO_GRID / 2; // largest dot radius (touches neighbours at peak)
const HALO_FALLOFF = 1.7;      // exponent controlling how steeply dots shrink
const HALO_POS_JITTER = 0.35;  // ± fraction of HALO_GRID a dot can wander off its cell (at edge)
const HALO_SIZE_NOISE = 0.55;  // ± fraction by which per-cell noise modulates dot radius (at edge)
const HALO_NOISE_THRESHOLD = 0.55; // t value above which the core stays perfectly regular
                                   // (lower = more area kept clean; higher = noise reaches inward)

// Deterministic 2D hash → [0, 1). Cheap, stable per (x, y) cell so the
// pattern doesn't shimmer between renders / drags / zooms.
function hash2d(x: number, y: number): number {
  const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return s - Math.floor(s);
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
      className="relative bg-white border border-black px-4 py-2 text-lg whitespace-nowrap cursor-pointer transition-colors hover:bg-black hover:text-white"
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

  // Hook into store updates VIA a derived-string selector — React Flow
  // mutates nodeLookup in place when nodes drag, so subscribing to the Map
  // reference alone never re-renders. The selector body runs on every store
  // tick; we return a fingerprint of project-node geometry (positions +
  // sizes bucketed to 0.5px). Whenever the string differs from last tick,
  // useStore triggers a re-render. Selection / viewport / other unrelated
  // store changes leave the fingerprint identical → no re-render.
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

  // Direct access to the live Map for the heavy work below.
  const nodeLookup = useStore((s) => s.nodeLookup);

  // Heavy work — grid intensity accumulation + path string assembly — gated
  // by signature. All ~3000 dots are baked into a SINGLE SVG <path> with
  // multi-subpath `d`; one DOM node instead of thousands cuts React
  // reconciliation and browser paint dramatically while preserving full
  // vector fidelity (so canvas zoom stays crisp).
  const halo = useMemo(() => {
    type Rect = { x: number; y: number; w: number; h: number };
    const rects: Rect[] = [];
    nodeLookup.forEach((node, id) => {
      if (!id.startsWith(PROJ_PREFIX)) return;
      const w = node.measured?.width;
      const h = node.measured?.height;
      if (!w || !h) return;
      rects.push({ x: node.position.x, y: node.position.y, w, h });
    });
    if (rects.length === 0) return null;

    const intensity = new Map<string, number>();
    let worldMinX = Infinity;
    let worldMinY = Infinity;
    let worldMaxX = -Infinity;
    let worldMaxY = -Infinity;

    for (const rect of rects) {
      const cx = rect.x + rect.w / 2;
      const cy = rect.y + rect.h / 2;
      const halfW = rect.w / 2;
      const halfH = rect.h / 2;

      const haloMinX = rect.x - HALO_PAD;
      const haloMinY = rect.y - HALO_PAD;
      const haloMaxX = rect.x + rect.w + HALO_PAD;
      const haloMaxY = rect.y + rect.h + HALO_PAD;

      if (haloMinX < worldMinX) worldMinX = haloMinX;
      if (haloMinY < worldMinY) worldMinY = haloMinY;
      if (haloMaxX > worldMaxX) worldMaxX = haloMaxX;
      if (haloMaxY > worldMaxY) worldMaxY = haloMaxY;

      const cgxStart = Math.floor(haloMinX / HALO_GRID);
      const cgxEnd = Math.ceil(haloMaxX / HALO_GRID);
      const cgyStart = Math.floor(haloMinY / HALO_GRID);
      const cgyEnd = Math.ceil(haloMaxY / HALO_GRID);

      for (let cgy = cgyStart; cgy < cgyEnd; cgy += 1) {
        const gy = (cgy + 0.5) * HALO_GRID;
        for (let cgx = cgxStart; cgx < cgxEnd; cgx += 1) {
          const gx = (cgx + 0.5) * HALO_GRID;
          const dx = Math.abs(gx - cx) - halfW;
          const dy = Math.abs(gy - cy) - halfH;
          const outsideX = Math.max(0, dx);
          const outsideY = Math.max(0, dy);
          const dist = Math.sqrt(outsideX * outsideX + outsideY * outsideY);
          if (dist > HALO_RANGE) continue;
          const t = 1 - dist / HALO_RANGE;
          const key = `${cgx},${cgy}`;
          const prev = intensity.get(key);
          if (prev === undefined || t > prev) intensity.set(key, t);
        }
      }
    }

    const svgX = Math.floor(worldMinX / HALO_GRID) * HALO_GRID;
    const svgY = Math.floor(worldMinY / HALO_GRID) * HALO_GRID;
    const svgW = Math.ceil((worldMaxX - svgX) / HALO_GRID) * HALO_GRID;
    const svgH = Math.ceil((worldMaxY - svgY) / HALO_GRID) * HALO_GRID;

    // Build one big path `d` string instead of thousands of <circle>s. Each
    // dot is encoded as a M + two relative arc commands — a self-contained
    // subpath that draws a full circle. Concatenated subpaths render as
    // independent shapes inside one <path>.
    const segments: string[] = [];
    intensity.forEach((t, key) => {
      const commaIdx = key.indexOf(",");
      const cgx = Number(key.slice(0, commaIdx));
      const cgy = Number(key.slice(commaIdx + 1));
      const gx = (cgx + 0.5) * HALO_GRID;
      const gy = (cgy + 0.5) * HALO_GRID;

      const edgeFactor = Math.max(0, 1 - t / HALO_NOISE_THRESHOLD);

      const nDrop = hash2d(gx + 53, gy + 7);
      const nSize = hash2d(gx + 17, gy + 31);
      const nX = hash2d(gx, gy);
      const nY = hash2d(gx + 91, gy + 19);

      if (edgeFactor > 0 && nDrop > Math.min(1, t / HALO_NOISE_THRESHOLD)) {
        return;
      }

      const sizeNoiseAmt = HALO_SIZE_NOISE * edgeFactor;
      const sizeMul = 1 - sizeNoiseAmt + nSize * (2 * sizeNoiseAmt);
      const r = Math.pow(t, HALO_FALLOFF) * HALO_MAX_DOT * sizeMul;
      if (r < 0.35) return;

      const jitter = HALO_GRID * HALO_POS_JITTER * edgeFactor;
      const px = gx + (nX * 2 - 1) * jitter;
      const py = gy + (nY * 2 - 1) * jitter;

      // Truncate to 2 decimals — sub-pixel precision below that is invisible
      // and keeps the path string shorter / faster to parse.
      const cxStr = (px - svgX).toFixed(2);
      const cyStr = (py - svgY).toFixed(2);
      const rStr = r.toFixed(2);
      const dStr = (r * 2).toFixed(2);
      // Whitespace-safe subpath: a full circle drawn as two semicircular arcs.
      // Spaces between every token avoid any parser ambiguity at digit/letter
      // transitions (some Chromium versions are finicky about `0a`-style
      // contiguous tokens in multi-subpath strings).
      segments.push(
        `M ${cxStr} ${cyStr} m -${rStr} 0 a ${rStr} ${rStr} 0 1 0 ${dStr} 0 a ${rStr} ${rStr} 0 1 0 -${dStr} 0`,
      );
    });

    return {
      svgX,
      svgY,
      svgW,
      svgH,
      d: segments.join(" "),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionsKey]);

  if (!domNode) return null;
  const viewport = domNode.querySelector<HTMLElement>(".react-flow__viewport");
  if (!viewport) return null;
  if (!halo) {
    return createPortal(<div aria-hidden style={{ display: "none" }} />, viewport);
  }

  return createPortal(
    <svg
      aria-hidden
      width={halo.svgW}
      height={halo.svgH}
      viewBox={`0 0 ${halo.svgW} ${halo.svgH}`}
      style={{
        position: "absolute",
        left: halo.svgX,
        top: halo.svgY,
        pointerEvents: "none",
        zIndex: -1,
        display: "block",
      }}
    >
      <path d={halo.d} fill={HALO_NEON_COLOR} />
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

export default function MindMap({ projects }: { projects: Project[] }) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <MindMapInner projects={projects} />
      </ReactFlowProvider>
    </div>
  );
}
