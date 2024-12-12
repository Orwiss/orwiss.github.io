import React, { useState, useEffect, useRef } from 'react'

export default function Title() {
    const [num, setNum] = useState(0)
    const title = useRef(null)
    const mobile = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent)

    useEffect(() => {
        const max = mobile? 18:30

        const interval = setInterval(() => {
            setNum(prev => {
                const currentWidth = title.current? title.current.offsetWidth:0
                if (prev >= max || currentWidth > window.innerWidth - 20) {
                    
                    return prev
                }
                else return prev + (max - prev) * 0.01
            })
        }, 1)
        return() => clearInterval(interval)
    }, [mobile])

    const box = {
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    }

    const textStyle = {
        textAlign: 'center',
        fontFamily: "'Pretendard Variable', sans-serif",
        fontWeight: "900",
        fontSize: 'clamp(32pt, 6vw, 64pt)',
        fontWeight: 'bold',
        whiteSpace: 'pre-wrap',
        letterSpacing: `${num}px`,
        margin: 'auto',
        zIndex: 10,
    }

    const text = mobile? 'SUNGHUN\nPARK':'SUNGHUN PARK'
    
    return(
        <div style={box}>
            <p style={textStyle} ref={title}>{text}</p>
        </div>
    )
}