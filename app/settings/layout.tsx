// app/studio/layout.tsx
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Settings - Ceflix Tv",
  description:
    "Manage your Ceflix Tv studio: Settings videos, track views, subscribers, and control.",
  openGraph: {
    title: "Settings - Ceflix Tv",
    description: "Ceflix Tv.",
    type: "website",
  },
};

export default function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
