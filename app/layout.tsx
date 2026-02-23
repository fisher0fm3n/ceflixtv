// app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "./styles.scss";

import { Providers } from "./providers";
import AppShell from "./components/AppShell";

import "@splidejs/react-splide/css";
import "plyr-react/plyr.css";

const avenir = localFont({
  src: [
    { path: "./fonts/Avenir-Light.ttf", weight: "300", style: "normal" },
    { path: "./fonts/Avenir-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/Avenir-Heavy.ttf", weight: "700", style: "normal" },
    { path: "./fonts/Avenir-Black.ttf", weight: "900", style: "normal" },
  ],
  variable: "--font-avenir",
});

const title = "Home - Ceflix Tv";
const description =
  "Watch. Share. Shine – Only on CeFlix Live TV. Showcase your talents and watch your dreams take center stage on CeFlix Live TV.";

export const metadata: Metadata = {
  metadataBase: new URL("https://ceflixtv.netlify.app"), // make sure this matches your real domain
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "Ceflix Tv",
    type: "website",
    images: [
      {
        url: "/og-image.jpg", // put this file in /public/og-image.jpg
        width: 1200,
        height: 630,
        alt: "CeFlix Live TV preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={avenir.className}>
      <body className="antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
