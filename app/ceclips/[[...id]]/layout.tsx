// app/ceclips/layout.tsx
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "CeClips - Ceflix Tv",
  description:
    "Watch CeClips on Ceflix TV. Discover short videos, share moments, and follow creators.",
  openGraph: {
    title: "CeClips - Ceflix Tv",
    description:
      "Watch CeClips on Ceflix TV. Discover short videos, share moments, and follow creators.",
    type: "website",
  },
};

export default function CeClipsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}