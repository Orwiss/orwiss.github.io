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

export default function Main() {
  const [level, setLevel] = useState(0);

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
    backgroundColor: `rgba(0, 0, 0, ${level === 2 ? 1 : 0.5})`,
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
  
  const handleLeftClick = () => {
    setLevel(prev => (prev - 1 < 0 ? 3: prev - 1));
  };
  
  const handleRightClick = () => {
    setLevel(prev => ((prev + 1) % 4));
  };

  return (
    <div className="bg" style={{ position: 'relative', height: '100vh', color: 'white' }}>
      <iframe 
        src={`${process.env.PUBLIC_URL}/sketches/sketch1/index.html`}
        style={iframeStyle} 
        title="background sketch" 
      />
      <div style={overlayStyle}></div>
      {level === 0 && <Title/>}
      {level === 1 && <About/>}
      {level === 2 && <Notion pageId="6d45f80728b24b719db9c224bd68d6e1" />}
      {level === 3 && <Link/>}
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