import React from 'react'
import styled from 'styled-components'

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
    pointerEvents: 'none'
  }

  const Infos = styled.div`
    margin-top: 20px;
  `

  return (
    <div style={style}>
      <h1 style={{ color: 'white' }}>박성훈</h1>
      <Infos>2000.09.25</Infos>
      <Infos>Generative Art</Infos>
      <Infos>Creative Coding</Infos>
      <Infos>Interactive Media Art</Infos>
    </div>
  )
}

export default About