import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import AppShell from "./components/AppShell"; // 👈 new

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

export const metadata: Metadata = {
  title: "Ceflix Plus",
  description: "Ceflix Plus",
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
