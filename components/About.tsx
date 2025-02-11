import React from 'react';

interface ScrollItemProps {
  items: string[];
}

const About = () => {
  // 여러 개의 배열을 관리
  const interests = [
    'Generative Art',
    'Creative Coding',
    'Interactive Media Art',
    'Immersive Media',
    'Audio Visualization',
    'Extended Reality',
    'Data Visualization',
    'Physical Computation',
    'Projection Mapping',
  ];

  // const skills = [
  //   'p5.js',
  //   'Touchdesigner',
  //   'Unity',
  //   'Network',
  //   'Arduino',
  //   'Web',
  //   'Ableton Live',
  // ];

  const ScrollItems = (items: string[]) => {
    const extendedItems: string[] = [];
    for (let i = 0; i < 2; i++) extendedItems.push(...items);

    return extendedItems;
  };

  const ScrollGroups = ({ items }: ScrollItemProps) => {
    return (
      <div className='animate-scroll'>
        {ScrollItems(items).map((item, index) => (
          <div
            key={index}
            className="inline-block px-5 py-2 mr-10 text-lg text-black bg-white bg-opacity-50 rounded-3xl backdrop-blur-sm whitespace-nowrap"
          >
            {item}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center overflow-hidden w-full h-full text-2xl text-white pointer-events-none">
      <h1 className="text-6xl font-bold">박성훈</h1>
      <p className="text-3xl">2000.09.25</p>

      <div className="flex my-12 whitespace-nowrap">
        <ScrollGroups items={interests}/>
        <ScrollGroups items={interests}/>
      </div>

      <h3 className="mt-16 mb-8 text-3xl font-bold">Education</h3>
      <div className="flex flex-col items-center text-center">
        <p className="mb-1 text-2xl font-light">2019.03 - 2025.02</p>
        <span className="mb-8 text-3xl font-medium">홍익대학교 디자인컨버전스학부</span>
        <p className="mb-1 text-2xl font-light">2025.03 - </p>
        <span className="mb-8 text-3xl font-medium">국민대학교 테크노디자인전문대학원 융합디자인학과</span>
      </div>

      <h3 className="mt-16 mb-8 text-3xl font-bold">Projects</h3>
      <div className="flex flex-col items-center text-center">
        <p className="mb-1 text-2xl font-light">2023.09.19 - 09.23</p>
        <span className="mb-8 text-3xl font-medium">2023 세종시 문화지원사업 전시 &lt;거울에서 도망치기&gt;</span>
        <p className="mb-1 text-2xl font-light">2023.10.20 - 11.05</p>
        <span className="mb-8 text-3xl font-medium">2023 세종시 신도시-읍·면 지역간 연계 프로그램 전시 &lt;From the Town&gt;</span>
        <p className="mb-1 text-2xl font-light">2024.11.14 - 11.17</p>
        <span className="mb-8 text-3xl font-medium">2024 서울디자인페스티벌 홍익대학교 디자인컨버전스학부 &lt;온실(On-Sil)&gt;</span>
      </div>
    </div>
  );
};

export default About;
