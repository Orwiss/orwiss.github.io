import type { Metadata } from "next";
import Script from "next/script";
import BackgroundShell from "@/components/BackgroundShell";

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
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;

  return (
    <html lang="ko">
      <body>
        {clarityId ? (
          <Script
            id="clarity-script"
            strategy="afterInteractive"
          >{`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}</Script>
        ) : null}
        <BackgroundShell>{children}</BackgroundShell>

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
