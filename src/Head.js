import React from 'react'
import Nav from './Nav'

export default function Head() {
    const box = {
        width: '100%',
        height: '70px',
        position: 'fixed',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
    }

    const logo = {
        margin: '0',
        marginLeft: '4vw'
    }

    return(
        <div style={box}>
            <h2 style={logo}><a href='.'>SH</a></h2>
            <Nav/>
        </div>
    )
}