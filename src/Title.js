import React, {useState, useEffect} from 'react'

export default function Title() {
    const [num, setNum] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setNum(prev => {
                if (prev >= 30) return prev
                else return prev + (30 - prev) * 0.01
            })
        }, 1)
        return() => clearInterval(interval)
    }, [])

    const box = {
        height: '100%',
        display: 'flex',
        alignItems: 'center'
    }

    const text = {
        textAlign: 'center',
        fontSize: `clamp(32pt, 3vw, 64pt)`,
        fontWeight: 'bold',
        letterSpacing: `${num}px`,
        margin: 'auto'
    }
    
    return(
        <div style={box}>
            <p style={text}>SUNGHUN PARK</p>
        </div>
    )
}