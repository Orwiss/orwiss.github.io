"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import FadeEffect from "@/components/Fade";
import Nav from "@/components/Nav";
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

const getLevelFromPath = (pathname: string) => {
  const index = routes.indexOf(pathname);
  return index === -1 ? 0 : index;
};

export default function BackgroundShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [level, setLevel] = useState(() => getLevelFromPath(pathname));
  const [fadeState, setFadeState] = useState<"fade-in" | "fade-out">("fade-in");
  const [black, setBlack] = useState<"black" | "none">("black");
  const [projectNum, setProjectNum] = useState<number | null>(null);
  const initialLoad = useRef(true);

  useEffect(() => {
    setProjectNum(Math.floor(Math.random() * projects.length));
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

  const changeComponent = (newLevel: number) => {
    setFadeState("fade-out");
    setTimeout(() => {
      router.push(routes[newLevel]);
    }, 500);
  };

  return (
    <BackgroundContext.Provider
      value={{
        blackOff: () => setBlack("none"),
        projectNum,
      }}
    >
      <div className="relative h-dvh text-white bg-black overflow-hidden overscroll-none">
        {projectNum !== null && (
          <iframe
            key={`${projectNum + 1}`}
            src={`/sketches/sketch${projectNum + 1}/index.html`}
            className="absolute top-0 left-0 z-0 w-full h-full border-none"
            title="background sketch"
            {...(projectNum + 1 === 3 ? { allow: "accelerometer; gyroscope;" } : {})}
          />
        )}
        <div
          className={`absolute top-0 left-0 z-0 w-full h-full select-none pointer-events-none bg-black ${
            level === 0 && black === "none" ? "bg-opacity-0" : "bg-opacity-70"
          } transition-all duration-500`}
        ></div>
        <FadeEffect fadeState={fadeState}>{children}</FadeEffect>
        <Nav
          level={level}
          changeComponent={changeComponent}
          pages={routes.length}
          direction="left"
          sections={sections}
        />
        <Nav
          level={level}
          changeComponent={changeComponent}
          pages={routes.length}
          direction="right"
          sections={sections}
        />

        <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center pointer-events-none">
          <GlassEffect blurStdDev={4} maskScale={0.7} className=" top-10 z-10 text-white pointer-events-none">
            <div></div>
          </GlassEffect>
        </div>
      </div>
    </BackgroundContext.Provider>
  );
}
