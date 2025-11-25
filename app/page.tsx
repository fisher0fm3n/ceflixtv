// app/page.tsx (example protected home)
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./components/AuthProvider";
import HeroSlider, { Slide } from "./components/HeroSlider";

import psvBg from "./assets/images/homepage/psv-bg.png";
import psvLogo from "./assets/images/homepage/psv-logo.png";

import godeeper from "./assets/images/homepage/godeeper.webp";
import greatwonders from "./assets/images/homepage/greatwonders.webp";
import guessthegmo from "./assets/images/homepage/guessthegmo.webp";
import singwith from "./assets/images/homepage/singwith.png";
import travelvlog from "./assets/images/homepage/travelvlog.jpg";
import wordinthestreet from "./assets/images/homepage/wordinthestreet.webp";
import trueto from "./assets/images/homepage/trueto.png";

import RowSlider from "./components/RowSlider";
import InitialHomeGrid from "./components/HomeGrid";

const SLIDES: Slide[] = [
  {
    id: "psv",
    background: psvBg,
    logo: psvLogo,
    ageRating: "G",
    meta: "Sub | Dub • Faith, Lifestyle",
    description:
      "A raw and honest look into my glow up journey and how growing closer to God helped me discover my true self. Sharing how this transformation strengthened my faith and shaped my mindset. Reflecting on the impact it had on my relationships with family and friends. A journey of healing, purpose, and becoming who I was always meant to be.",
    primaryCta: "Watch Episode 1",
    secondaryCta: "Add to Watchlist",
  },
];

const FEATURED_SHOWS = [
  {
    id: "godeeper",
    title: "Go Deeper",
    image: godeeper,
    subtitle: "Talk • 1 Season",
    meta: "Faith • Inspiration",
    tags: ["Talk Show", "Inspiration"],
  },
  {
    id: "greatwonders",
    title: "Great Wonders",
    image: greatwonders,
    subtitle: "Documentary • Series",
    meta: "Exploration • Travel",
    tags: ["Documentary", "Wonders"],
  },
  {
    id: "guessthegmo",
    title: "Guess The GMO",
    image: guessthegmo,
    subtitle: "Game Show",
    meta: "Fun • Interactive",
    tags: ["Game Show", "Family"],
  },
  {
    id: "singwith",
    title: "Sing With",
    image: singwith,
    subtitle: "Music • Performances",
    meta: "Worship • Live",
    tags: ["Music", "Live"],
  },
  {
    id: "travelvlog",
    title: "Travel Vlog",
    image: travelvlog,
    subtitle: "Vlog • Series",
    meta: "Travel • Lifestyle",
    tags: ["Travel", "Vlog"],
  },
  {
    id: "wordinthestreet",
    title: "Word In The Street",
    image: wordinthestreet,
    subtitle: "Street Interviews",
    meta: "Faith • Conversations",
    tags: ["Interviews", "Street"],
  },
  {
    id: "trueto",
    title: "True To The Last Bite",
    image: trueto,
    subtitle: "Series • Food",
    meta: "Series • Food",
    tags: ["Interviews", "Street"],
  },
];

export default function HomePage() {
  const { token, user, initialized, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return; // ⏳ wait until we know
    // if (!token) {
    //   router.push("/login?next=/");
    // }
  }, [initialized, token, router]);

  if (!initialized) {
    // You can render a loader here while we check localStorage
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400">
        Loading…
      </div>
    );
  }

  // if (!token) {
  //   // While redirecting, render nothing (or a small spinner)
  //   return null;
  // }

  return (
    <main className="bg-neutral-950 text-white min-h-screen mb-[10rem]">
      <InitialHomeGrid />

      {/* <h1 className="text-xl font-semibold h-[300rem]">
        Welcome, {user?.fname || user?.username || "User"} 👋
      </h1>
      <button
        onClick={logout}
        className="mt-4 rounded bg-red-600 px-4 py-2 text-sm font-semibold"
      >
        Log out
      </button> */}
      {/* Rest of your homepage sections here */}
    </main>
  );
}
