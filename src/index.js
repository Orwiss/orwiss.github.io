import React, { useState } from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import About from './pages/About'
import Title from './pages/Title'
import Notion from './pages/Notion'
import Link from './pages/Link'
import Head from './Head'
import reportWebVitals from './reportWebVitals'

const FadeContainer = ({ fadeState, children }) => {
  const fadeStyles = {
    transition: 'opacity 0.5s ease',
    opacity: fadeState === 'fade-out' ? 0 : 1,
    position: 'absolute',
    width: '100%',
    height: '100%',
    pointerEvents: 'none'
  };

  return <div style={fadeStyles}>{children}</div>;
};

export default function Main() {
  const [level, setLevel] = useState(0);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [fadeState, setFadeState] = useState('fade-in');
  const [currentComponent, setCurrentComponent] = useState(<Title titleText="ASCII Wave" fadeout={() => setOverlayOpacity(0)}/>);

  const components = [
    <Title titleText="ASCII Wave" fadeout={() => setOverlayOpacity(0)}/>,
    <About />,
    <Notion pageId="6d45f80728b24b719db9c224bd68d6e1" />,
    <Link />,
  ];

  const iframeStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    border: 'none',
    zIndex: 0,
    pointerEvents: 'auto'
  };

  const overlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: 'black',
    opacity: level === 2 ? 1 : overlayOpacity == 0 ? 0 : 0.5,
    transition: 'opacity 2s ease-out',
    zIndex: 1,
    pointerEvents: 'none'
  };

  const buttonStyle = {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    border: '3px solid white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48pt',
    cursor: 'pointer',
    zIndex: 2
  };
  
  const leftButtonStyle = {
    ...buttonStyle,
    position: 'absolute',
    bottom: '100px',
    left: '100px'
  };
  
  const rightButtonStyle = {
    ...buttonStyle,
    position: 'absolute',
    bottom: '100px',
    right: '100px'
  };

  const changeComponent = (newLevel) => {
    setFadeState('fade-out');
    requestAnimationFrame(() => {
      setTimeout(() => {
        setLevel(newLevel);
        setCurrentComponent(components[newLevel]);
        setFadeState('fade-in');
      }, 500); // Matches the fade transition duration
    });
  };

  const handleLeftClick = () => {
    changeComponent((level - 1 + components.length) % components.length);
    setOverlayOpacity(1);
  };

  const handleRightClick = () => {
    changeComponent((level + 1) % components.length);
    setOverlayOpacity(1);
  };

  return (
    <div className="bg" style={{ position: 'relative', height: '100vh', color: 'white' }}>
      <iframe 
        src={`${process.env.PUBLIC_URL}/sketches/sketch1/index.html`}
        style={iframeStyle} 
        title="background sketch" 
      />
      <div style={overlayStyle}></div >
      <FadeContainer fadeState={fadeState}>{currentComponent}</FadeContainer>
      <div style={leftButtonStyle} onClick={handleLeftClick}>←</div>
      <div style={rightButtonStyle} onClick={handleRightClick}>→</div>
    </div>
  );
}

const container = ReactDOM.createRoot(document.getElementById('container'));
container.render(
  <React.StrictMode>
    {/* <Head/> */}
    <Main/>
  </React.StrictMode>
)

reportWebVitals()