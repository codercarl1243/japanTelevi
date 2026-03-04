import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "video.js/dist/video-js.css";
import "@silvermine/videojs-chromecast/dist/silvermine-videojs-chromecast.css";
import Script from "next/script"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "テレビ — Televi",
  description: "Japanese IPTV streams and programme guide. Watch live Japanese television with an electronic programme guide.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png" }],
  },
  themeColor: "#c8a97e",
  openGraph: {
    title: "テレビ — Televi",
    description: "Japanese IPTV streams and programme guide.",
    locale: "ja_JP",
    alternateLocale: "en_AU",
    type: "website",
    images: [
      {
        url: "/streams2.png",      // video playing — best first impression
        alt: "Televi — live Japanese TV stream playing",
      },
      {
        url: "/streams1.png",      // stream selection screen
        alt: "Televi — Japanese IPTV stream list",
      },
      {
        url: "/channels.png",      // programme guide
        alt: "Televi — Japanese TV programme guide",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <div id="tooltip-portal" />
        <Script
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
