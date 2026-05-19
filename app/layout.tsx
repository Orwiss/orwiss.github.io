import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TransitionProvider } from "@/components/Transition";
import { ContactButton } from "@/components/ContactButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sunghun Park",
  description: "Portfolio of Sunghun Park",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        {/* Single TransitionProvider survives all SPA navigations so
            the halftone overlay is one persistent canvas rather than
            two short-lived instances (route loading.tsx → MinLoader)
            that used to remount and visibly jitter. */}
        <TransitionProvider>{children}</TransitionProvider>
        {/* ContactButton is a sibling of TransitionProvider so it's
            always available across pages. z-1001 keeps it above page
            content but BELOW the halftone overlay (z-2000), which
            covers it during route transitions like everything else. */}
        <ContactButton />
      </body>
    </html>
  );
}
