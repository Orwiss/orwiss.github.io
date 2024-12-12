import React from 'react'
// import { Link } from 'react-router-dom'
import styled from 'styled-components'

const Items = styled.div`
    font-weight: light;
    font-size: 16pt;
`

const EndItem = styled(Items)`
    margin-right: 4vw;
`

export default function Nav() {
    const box = {
        width: 'clamp(280px, 32%, 520px)',
        display: 'flex',
        justifyContent: 'space-between'
    }

    return(
        <div style={box}>
            <Items as='a' href='/about'>About</Items>
            <Items as='a' href='.'>Projects</Items>
            <EndItem as='a' href='.'>Contact</EndItem>
        </div>
    )
}