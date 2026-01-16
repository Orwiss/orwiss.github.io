"use client";

import Title from "@/components/Title";
import { useBackground } from "@/components/BackgroundShell";

const projects = ["ASCII Wave", "Magnetic Packing", "Glass Breaker"];
const guides = ["눌러서 파동 만들기", "큰 원을 움직이기", "눌러서 유리 깨기"];

export default function Home() {
  const { blackOff, projectNum } = useBackground();

  return (
    <Title
      titleText={projectNum !== null ? projects[projectNum] : ""}
      guideText={projectNum !== null ? guides[projectNum] : ""}
      blackoff={blackOff}
    />
  );
}
