import React from "react";

interface NavProps {
  level: number;
  pages: number;
  changeComponent: (newLevel: number) => void;
  direction: "left" | "right";
}

const NavButton: React.FC<NavProps> = ({ level, pages, changeComponent, direction }) => {
  const handleClick = () => {
    const newLevel = direction === "left" 
      ? (level - 1 + pages) % pages 
      : (level + 1) % pages;
      
    changeComponent(newLevel);
  };

  return (
    <>
      <div className={`absolute ${direction === "left" ? "left-[4%]" : "right-[4%]"} bottom-[10%]
          w-[80px] h-[80px] xl:w-[100px] xl:h-[100px] rounded-full z-10 glassEffect`}></div>
      <div
          className={`absolute ${direction === "left" ? "left-[4%]" : "right-[4%]"} bottom-[10%]
          w-[80px] h-[80px] xl:w-[100px] xl:h-[100px] rounded-full bg-white/15 font-semibold
          hover:bg-white hover:text-black z-20 flex items-center justify-center
          text-5xl xl:text-6xl transition-colors duration-300 pointer-events-auto select-none`}
          onClick={handleClick}
        >
        
        <div>{direction === "left" ? "←" : "→"}</div>
      </div>
    </>
  );
};

export default NavButton;
