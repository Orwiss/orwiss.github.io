import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sunghun Park",
  description: "Website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}

        <svg style={{ display: 'none' }}>
          <filter id="container-glass" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.016 0.016" numOctaves="2" seed="92" result="noise" />
            <feGaussianBlur in="noise" stdDeviation="0.02" result="blur" />
            <feDisplacementMap in="SourceGraphic" in2="blur" scale="70" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      </body>      
    </html>
  );
}
