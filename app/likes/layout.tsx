// app/studio/layout.tsx
import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Liked Videos - Ceflix Tv",
  description:
    "Manage your Ceflix Tv studio: upload videos, track views, subscribers, and control your Liked Videos.",
  openGraph: {
    title: "Liked Videos - Ceflix Tv",
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
