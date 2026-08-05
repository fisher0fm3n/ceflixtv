import type { Metadata } from "next";
import React, { Suspense } from "react";

export const metadata: Metadata = {
  title: "Your Interests - Ceflix Tv",
  description:
    "Choose the topics your Ceflix Tv home page is built around.",
  openGraph: {
    title: "Your Interests - Ceflix Tv",
    description: "Ceflix Tv.",
    type: "website",
  },
};

export default function InterestsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // useSearchParams needs a Suspense boundary to avoid opting the whole route
  // into client-side rendering at build time.
  return <Suspense fallback={null}>{children}</Suspense>;
}
