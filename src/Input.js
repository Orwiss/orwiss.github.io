import React, { useState } from 'react';

export default function Input() {
    const [text, set] = useState('')

    const change = (e) => {
        set(e.target.value)
    }

    const inputBound = {
        textAlign: 'center',
        margin: '50px auto 50px auto'
    }

    const inputStyle = {
        width: '80%',
        maxWidth: '400px',
        height: '40px'
    }

    return(
        <div style={inputBound}>
            <input onChange={change} style={inputStyle}/>
            <div>
                <h3>{text}</h3>
            </div>
        </div>
    )
}