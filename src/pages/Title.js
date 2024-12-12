import React, { useState, useEffect, useRef } from 'react';

export default function Title({ titleText, fadeout }) {
    const [num, setNum] = useState(0);
    const [opacity, setOpacity] = useState(1); // opacity 상태 추가
    const title = useRef(null);
    const mobile = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

    useEffect(() => {
        const max = mobile ? 18 : 30;

        const interval = setInterval(() => {
            setNum(prev => {
                const currentWidth = title.current ? title.current.offsetWidth : 0;
                if (prev >= max - 0.1 || currentWidth > window.innerWidth - 20) {
                    if (opacity == 1) {
                        setTimeout(() => {
                            setOpacity(0);
                        }, 2000);
                    }
                    return prev;
                } else {
                    return prev + (max - prev) * 0.01;
                }
            });
        }, 1);
        
        return () => clearInterval(interval);
    }, [mobile, opacity]);

    useEffect(() => {
        if (opacity === 0 && fadeout) {
            fadeout();
        }
    }, [opacity, fadeout]);

    const box = {
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    };

    const textStyle = {
        textAlign: 'center',
        fontFamily: "'Pretendard Variable', sans-serif",
        fontWeight: "900",
        fontSize: 'clamp(32pt, 6vw, 64pt)',
        whiteSpace: 'pre-wrap',
        letterSpacing: `${num}px`,
        margin: 'auto',
        zIndex: 10,
        opacity: opacity, // opacity 상태 값 반영
        transition: 'opacity 2s ease-out', // 서서히 사라지도록 애니메이션 추가
    };

    const text = titleText || (mobile ? 'SUNGHUN\nPARK' : 'SUNGHUN PARK');
    
    return (
        <div style={box}>
            <p style={textStyle} ref={title}>{text}</p>
        </div>
    );
}
