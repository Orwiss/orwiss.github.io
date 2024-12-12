import React from 'react';
import styled from 'styled-components';

const About = () => {
  const style = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '24pt',
    zIndex: '1',
    pointerEvents: 'none',
  };

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
    'Projection Mapping'
  ];

  const skills = [
    'p5.js',
    'Touchdesigner',
    'Unity',
    'Network',
    'Arduino',
    'Web',
    'Ableton Live',
  ];

  // 무한 스크롤 애니메이션을 적용한 Wrapper
  const ScrollWrapper = styled.div`
    display: flex;
    animation: scroll 20s linear infinite;
    min-width: 100%; /* 화면 너비만큼 최소 크기 설정 */

    @keyframes scroll {
      0% {
        transform: translateX(0);
      }
      100% {
        transform: translateX(-100%); /* 화면 크기만큼 스크롤 */
      }
    }
  `;

  // 아이템이 화면을 채우지 못할 경우 복제하여 화면 채우기
  const fillScrollItems = (items) => {
    const totalWidth = window.innerWidth;
    const itemWidth = 120; // 각 아이템의 대략적인 너비 (간격 포함)
    const requiredItems = Math.ceil(totalWidth / itemWidth); // 필요한 아이템 개수

    const extendedItems = [];
    while (extendedItems.length < requiredItems) {
      extendedItems.push(...items);
    }

    return extendedItems;
  };

  // 아이템 스타일
  const ScrollItem = styled.div`
    margin-right: 40px; /* 아이템 간 간격 */
    font-size: 20px;
    display: inline-block;
    border-radius: 30px; /* 둥근 모서리 */
    background-color: rgba(255, 255, 255, 0.5);
    padding: 10px 20px;
    backdrop-filter: blur(10px);
    color: black;
    white-space: nowrap; /* 텍스트가 줄 바꿈 되지 않도록 */
  `;

  // Infos를 가로로 스크롤하는 바 스타일
  const ScrollBar = styled.div`
    display: flex;
    width: 100%;
    overflow: hidden;
    white-space: nowrap;
    margin: 60px 0;
  `;

  const Infos = styled.div`
    margin: 10px 0;
     display: flex;
    flex-direction: column; /* 내부 항목들을 세로로 정렬 */
    align-items: center; /* 중앙 정렬 */
    text-align: center; /* 텍스트도 중앙 정렬 */

    p {
      font-size: 16pt;
      margin-bottom: 4px;
    }

    span {
      font-size: 18pt;
      margin-bottom: 30px;
    }
  `

  return (
    <div style={style}>
      <h1>박성훈</h1>
      <p>2000.09.25</p>
      
      <ScrollBar>
        <ScrollWrapper>
          {fillScrollItems(interests).map((item, index) => (
            <ScrollItem key={index}>{item}</ScrollItem>
          ))}
          {fillScrollItems(interests).map((item, index) => (
            <ScrollItem key={index + interests.length}>{item}</ScrollItem>
          ))}
        </ScrollWrapper>
      </ScrollBar>

      <h3 style={{ marginTop: '60px', marginBottom: '20px' }}>Education</h3>
      <Infos>
        <p>2019.03 - Now</p>
        <span>홍익대학교 디자인컨버전스학부</span>
      </Infos>

      <h3 style={{ marginTop: '60px', marginBottom: '20px' }}>Projects</h3>
      <Infos>
        <p>2023.09.19 - 09.23</p>
        <span>2023 세종시 문화지원사업 전시 &lt;거울에서 도망치기&gt;</span>
        <p>2023.10.20 - 11.05</p>
        <span>2023 세종시 신도시-읍·면 지역간 연계 프로그램 전시 &lt;From the Town&gt;</span>
        <p>2024.11.14 - 11.17</p>
        <span>2024 서울디자인페스티벌 홍익대학교 디자인컨버전스학부 &lt;온실(On-Sil)&gt;</span>
      </Infos>

      {/* <h3 style={{ marginTop: '80px' }}>Skills</h3>
      <ScrollBar>
        <ScrollWrapper>
          {fillScrollItems(skills).map((item, index) => (
            <ScrollItem key={index}>{item}</ScrollItem>
          ))}
          {fillScrollItems(skills).map((item, index) => (
            <ScrollItem key={index + skills.length}>{item}</ScrollItem>
          ))}
        </ScrollWrapper>
      </ScrollBar> */}
    </div>
  );
};

export default About;
