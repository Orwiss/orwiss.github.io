import React, {useState, useEffect} from 'react'

export default function Title() {
    const [num, setNum] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setNum(prev => {
                if (prev >= 40) {
                    clearInterval(interval)
                    return prev
                } else {
                    return prev + 0.1
                }
            })
        }, 1)
        return() => clearInterval(interval)
    }, [])

    const bound = {
        height: '100px',
        display: 'flex',
        alignItems: 'center'
    }

    const text = {
        textAlign: 'center',
        fontSize: `${36 - num / 4}pt`,
        fontWeight: 'bold',
        letterSpacing: `${num}px`,
        margin: 'auto'
    }
    
    return(
        <div style={bound}>
            <p style={text}>SUNGHUN PARK</p>
        </div>
    )
}