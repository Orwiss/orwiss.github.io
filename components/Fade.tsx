'use client'

import { ReactNode } from "react";

interface FadeProps {
  fadeState: 'fade-in' | 'fade-out'
  children: ReactNode;
}

export default function FadeEffect({ fadeState, children }: FadeProps) {
  return (
    <div className={`relative z-10 w-full h-full select-none pointer-events-none transition-opacity duration-500 ${fadeState === 'fade-out'? 'opacity-0':'opacity-100'}`}>
      {children}
    </div>
  )
}