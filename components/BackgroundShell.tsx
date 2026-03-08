"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import FadeEffect from "@/components/Fade";
import GlassEffect from "@/components/GlassEffect";
import { trackClarityEvent } from "@/lib/clarity";

type BackgroundContextValue = {
  blackOff: () => void;
  projectNum: number | null;
};

const BackgroundContext = createContext<BackgroundContextValue>({
  blackOff: () => {},
  projectNum: null,
});

export const useBackground = () => useContext(BackgroundContext);

const projects = ["ASCII Wave", "Magnetic Packing", "Glass Breaker"];
const sections = ["title", "about", "project", "link"];
const routes = ["/", "/about", "/project", "/link"];
const gradientMaxScales = [1.06, 1.09, 1.07] as const;

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;

type Point = { x: number; y: number };
type PointPercent = { x: number; y: number };
type Range = { min: number; max: number };
type Drift = { x: number; y: number };

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const clampSize = (min: number, preferred: number, max: number) => clampValue(preferred, min, max);

const getGradientDiameters = (viewportWidth: number) => ({
  gp1: clampSize(720, viewportWidth * 0.58, 1300),
  gp2: clampSize(500, viewportWidth * 0.36, 560),
  gp3: clampSize(350, viewportWidth * 0.28, 420),
});

const getPlacementDiameters = (diameters: number[]) =>
  diameters.map((diameter, index) => diameter * (gradientMaxScales[index] ?? 1));

const getRandomPaletteHues = (): [number, number, number] => {
  const base = randomInt(0, 359);
  const paletteModes: [number, number, number][] = [
    [0, 120, 240],
    [0, 140, 220],
    [0, 90, 210],
    [0, 30, 70],
    [0, 50, 180],
    [0, 160, 300],
    [0, 75, 285],
  ];
  const mode = paletteModes[randomInt(0, paletteModes.length - 1)];
  const jitter = () => randomInt(-18, 18);

  return [
    (base + mode[0] + jitter() + 360) % 360,
    (base + mode[1] + jitter() + 360) % 360,
    (base + mode[2] + jitter() + 360) % 360,
  ];
};

const randomInRange = (min: number, max: number) => {
  if (max <= min) return min;
  return randomFloat(min, max);
};

const getAxisRange = (
  viewportSize: number,
  diameter: number,
  driftAllowance: number,
  visibleRatio: number
): Range => {
  // Keep at least `visibleRatio` of a circle visible during drift.
  const min = -(1 - visibleRatio) * diameter + driftAllowance;
  const max = viewportSize - visibleRatio * diameter - driftAllowance;

  if (max >= min) {
    return { min, max };
  }

  const centered = (viewportSize - diameter) / 2;
  return { min: centered, max: centered };
};

const isNonOverlapping = (points: Point[], diameters: number[]) => {
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const c1x = points[i].x + diameters[i] / 2;
      const c1y = points[i].y + diameters[i] / 2;
      const c2x = points[j].x + diameters[j] / 2;
      const c2y = points[j].y + diameters[j] / 2;
      const distance = Math.hypot(c1x - c2x, c1y - c2y);
      const radiusSum = (diameters[i] + diameters[j]) / 2;
      if (distance < radiusSum) {
        return false;
      }
    }
  }
  return true;
};

const pickDistributedPoints = (
  viewportWidth: number,
  viewportHeight: number,
  diameters: number[]
): PointPercent[] => {
  const driftAllowances = [
    { x: viewportWidth * 0.09, y: viewportHeight * 0.07 },
    { x: viewportWidth * 0.07, y: viewportHeight * 0.08 },
    { x: viewportWidth * 0.1, y: viewportHeight * 0.05 },
  ];
  const visibilityRatios = [0.7, 0.66, 0.62, 0.58, 0.54, 0.5];
  const maxRestarts = 1400;
  const maxSamplesPerPoint = 500;

  for (const visibleRatio of visibilityRatios) {
    const ranges = diameters.map((diameter, index) => {
      const drift: Drift = driftAllowances[index] ?? { x: 0, y: 0 };
      return {
        x: getAxisRange(viewportWidth, diameter, drift.x, visibleRatio),
        y: getAxisRange(viewportHeight, diameter, drift.y, visibleRatio),
      };
    });

    for (let restart = 0; restart < maxRestarts; restart += 1) {
      const points: Point[] = [];
      let placedAll = true;

      for (let i = 0; i < diameters.length; i += 1) {
        let placed = false;
        for (let sample = 0; sample < maxSamplesPerPoint; sample += 1) {
          const candidate = {
            x: randomInRange(ranges[i].x.min, ranges[i].x.max),
            y: randomInRange(ranges[i].y.min, ranges[i].y.max),
          };

          const nextPoints = [...points, candidate];
          const nextDiameters = diameters.slice(0, nextPoints.length);
          if (isNonOverlapping(nextPoints, nextDiameters)) {
            points.push(candidate);
            placed = true;
            break;
          }
        }

        if (!placed) {
          placedAll = false;
          break;
        }
      }

      if (placedAll && isNonOverlapping(points, diameters)) {
        return points.map((point) => ({
          x: (point.x / viewportWidth) * 100,
          y: (point.y / viewportHeight) * 100,
        }));
      }
    }
  }

  // Final fallback: keep sampling in a very wide area until non-overlap is found.
  while (true) {
    const points = diameters.map((diameter) => ({
      x: randomInRange(-0.55 * diameter, viewportWidth - 0.45 * diameter),
      y: randomInRange(-0.55 * diameter, viewportHeight - 0.45 * diameter),
    }));
    if (isNonOverlapping(points, diameters)) {
      return points.map((point) => ({
        x: (point.x / viewportWidth) * 100,
        y: (point.y / viewportHeight) * 100,
      }));
    }
  }
};

const getRandomGradientVars = (): React.CSSProperties => {
  const [h1, h2, h3] = getRandomPaletteHues();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const diameters = getGradientDiameters(viewportWidth);
  const baseDiameters = [
    diameters.gp1,
    diameters.gp2,
    diameters.gp3,
  ];
  const placementDiameters = getPlacementDiameters(baseDiameters);
  const [p1, p2, p3] = pickDistributedPoints(viewportWidth, viewportHeight, placementDiameters);

  return {
    "--gp1-hue": `${h1}`,
    "--gp2-hue": `${h2}`,
    "--gp3-hue": `${h3}`,
    "--gp1-left": `${p1.x}%`,
    "--gp1-top": `${p1.y}%`,
    "--gp2-left": `${p2.x}%`,
    "--gp2-top": `${p2.y}%`,
    "--gp3-left": `${p3.x}%`,
    "--gp3-top": `${p3.y}%`,
  } as React.CSSProperties;
};

const getLevelFromPath = (pathname: string) => {
  const index = routes.indexOf(pathname);
  return index === -1 ? 0 : index;
};

export default function BackgroundShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [level, setLevel] = useState(() => getLevelFromPath(pathname));
  const [fadeState, setFadeState] = useState<"fade-in" | "fade-out">("fade-in");
  const [black, setBlack] = useState<"black" | "none">("black");
  const [projectNum, setProjectNum] = useState<number | null>(null);
  const [gradientVars, setGradientVars] = useState<React.CSSProperties>({
    "--gp1-hue": "6",
    "--gp2-hue": "34",
    "--gp3-hue": "300",
    "--gp1-left": "20%",
    "--gp1-top": "42%",
    "--gp2-left": "50%",
    "--gp2-top": "58%",
    "--gp3-left": "72%",
    "--gp3-top": "24%",
  } as React.CSSProperties);
  const initialLoad = useRef(true);

  useEffect(() => {
    setProjectNum(Math.floor(Math.random() * projects.length));
    setGradientVars(getRandomGradientVars());
  }, []);

  useEffect(() => {
    const newLevel = getLevelFromPath(pathname);
    setLevel(newLevel);
    setBlack("black");
    setFadeState("fade-in");

    trackClarityEvent("section:view", {
      section: sections[newLevel],
      via: initialLoad.current ? "load" : "nav",
    });

    initialLoad.current = false;
  }, [pathname]);

  return (
    <BackgroundContext.Provider
      value={{
        blackOff: () => setBlack("none"),
        projectNum,
      }}
    >
      <div className="relative h-dvh text-white bg-black overflow-hidden overscroll-none">
        <div className="absolute inset-0 z-0" style={gradientVars}>
          <div className="absolute inset-0 bg-[#000000]" />
          <div className="gradient-clouds">
            <div className="gradient-point gradient-point-1" />
            <div className="gradient-point gradient-point-2" />
            <div className="gradient-point gradient-point-3" />
          </div>
          <svg
            className="absolute inset-0 h-full w-full pointer-events-none opacity-58 mix-blend-soft-light"
            aria-hidden="true"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="bg-grain">
                <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="3" seed="7" stitchTiles="stitch" />
                <feColorMatrix type="saturate" values="0" />
              </filter>
            </defs>
            <rect width="100%" height="100%" filter="url(#bg-grain)" />
          </svg>
        </div>
        <div
          className={`absolute top-0 left-0 z-0 w-full h-full select-none pointer-events-none bg-black ${
            level === 0 && black === "none" ? "bg-opacity-0" : "bg-opacity-70"
          } transition-all duration-500`}
        ></div>
        <FadeEffect fadeState={fadeState}>{children}</FadeEffect>

        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
          <GlassEffect blurStdDev={4} maskScale={0.7} className=" top-10 z-10 text-white pointer-events-none">
            <div></div>
          </GlassEffect>
        </div>
      </div>
    </BackgroundContext.Provider>
  );
}
