import React from 'react';

interface ButtonProps {
  level: number;
  pages: number;
  changeComponent: (newLevel: number) => void;
  /*setOverlayOpacity: (opacity: number) => void;*/
}

const Nav: React.FC<ButtonProps> = ({ level, pages, changeComponent/*, setOverlayOpacity*/ }) => {
  const handleLeftClick = () => {
    changeComponent((level - 1 + pages) % pages);
    //setOverlayOpacity(1);
  };

  const handleRightClick = () => {
    changeComponent((level + 1) % pages);
    //setOverlayOpacity(1);
  };

  return (
    <div>
      <div
        className="absolute bottom-[100px] left-[100px] w-[100px] h-[100px] rounded-full border-4 border-white hover:bg-white hover:text-black flex items-center justify-center text-[48pt] cursor-pointer z-10 transition-colors duration-300"
        onClick={handleLeftClick}
      >
        ←
      </div>
      <div
        className="absolute bottom-[100px] right-[100px] w-[100px] h-[100px] rounded-full border-4 border-white hover:bg-white hover:text-black flex items-center justify-center text-[48pt] cursor-pointer z-10 transition-colors duration-300"
        onClick={handleRightClick}
      >
        →
      </div>
    </div>
  );
};

export default Nav;
