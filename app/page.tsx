'use client';

import { useState, useEffect } from "react";
import Title from '@/components/Title';
import About from '@/components/About';
import Projects from '@/components/Notion';
import LinkPage from '@/components/Link';
import FadeEffect from '@/components/Fade';
import Nav from '@/components/Nav';

const projects = ['ASCII Wave', 'Magnetic Packing', 'SkeleTypo'];

export default function Home() {
  const [level, setLevel] = useState(0);
  const [fadeState, setFadeState] = useState<'fade-in' | 'fade-out'>('fade-in');
  const [black, setBlack] = useState<'black' | 'none'>('black');
  const [projectNum, setProjectNum] = useState<number | null>(null);
  const blackOff = () => setBlack('none');

  const components = [
    <Title key={0} titleText={projectNum !== null? projects[projectNum]:''} blackoff={blackOff}/>, 
    <About key={1}/>, 
    <Projects key={2}/>, 
    <LinkPage key={3}/>
  ];

  useEffect(() => {
    setProjectNum(Math.floor(Math.random() * projects.length));
  }, []);

  const changeComponent = (newLevel: number) => {
    setFadeState('fade-out');
    setTimeout(() => {
      setLevel(newLevel);
      setBlack('black');
      setFadeState('fade-in');
    }, 500);
  };

  return (
    <div className="relative h-dvh text-white bg-black overflow-hidden overscroll-none">
      {projectNum !== null && <iframe
        key={`${projectNum + 1}`}
        src={`/sketches/sketch${projectNum + 1}/index.html`}
        className='absolute top-0 left-0 z-0 w-full h-full border-none'
        title="background sketch"
        allow="accelerometer; gyroscope;"
        sandbox="allow-scripts allow-same-origin"
      />}
      <div className={`absolute top-0 left-0 z-0 w-full h-full select-none pointer-events-none bg-black ${((level == 0) && (black == 'none'))? 'bg-opacity-0':'bg-opacity-80'} transition-all duration-500`}></div>
      <FadeEffect fadeState={fadeState}>{components[level]}</FadeEffect>
      <Nav level={level} changeComponent={changeComponent} pages={components.length} direction="left"/>
      <Nav level={level} changeComponent={changeComponent} pages={components.length} direction="right"/>
    </div>
  );
}