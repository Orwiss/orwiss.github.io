import type { Metadata } from "next";
import Script from "next/script";
import BackgroundShell from "@/components/BackgroundShell";

import "./globals.css";

const siteUrl = "https://orwiss.xyz";
const siteTitle = "Orwiss | Sunghun Park";
const siteDescription =
  "Portfolio of Sunghun Park (Orwiss), featuring generative art, interactive experiments, exhibitions, and design projects.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | Orwiss",
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Orwiss",
    locale: "ko_KR",
    type: "website",
    images: ["/images/orwiss.png"],
  },
  twitter: {
    card: "summary",
    title: siteTitle,
    description: siteDescription,
    images: ["/images/orwiss.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-MPMTP5SW";

  return (
    <html lang="ko">
      <body>
        {gtmId ? (
          <>
            <Script id="gtm-script" strategy="beforeInteractive">{`
              (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${gtmId}');
            `}</Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        ) : null}
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
