'use client'

import { useEffect, useRef } from 'react'

export default function GlassCursor() {
  const glassRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glassRef.current) {
        const size = glassRef.current.getBoundingClientRect()
        glassRef.current.style.left = `${e.clientX - size.width / 2}px`
        glassRef.current.style.top = `${e.clientY - size.height / 2}px`
      }
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <>
      <div ref={glassRef} className="glassDiv" />

      <svg style={{ display: 'none' }}>
        <filter id="container-glass" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.012" numOctaves="2" seed="92" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="0.02" result="blur" />
          <feDisplacementMap in="SourceGraphic" in2="blur" scale="77" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
    </>
  )
}
