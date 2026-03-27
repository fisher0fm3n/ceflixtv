// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { useAuth } from "./components/AuthProvider";

import InitialHomeGrid, { type Section } from "./components/HomeGrid";
import ChannelSlider from "./components/ChannelSlider";
import HeroSlider, { type Slide as HeroSlide } from "./components/HeroSlider";
import CeflixTvMini from "./components/CeflixTvMini";
import PopupPlayer from "./components/LivePopUpPlayer";
import CeClipsComponent from "./ceclips/[[...id]]/page";
import ShortsShelf from "./components/ShortsShelf";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type SubscriptionChannel = {
  id: number;
  channel: string;
  filename: string;
  urlprefix: string;
  slug?: string | null;
  url?: string | null;
};

type PopupLanguage = {
  id: string | number;
  url: string;
  video_id?: string | number;
  translation: string;
};

type PopupData = {
  id?: string | number;
  title: string;
  url: string;
  videoID?: string | number;
  thumbnail?: string | null;
  languages?: PopupLanguage[];
};

// ---- small helpers: localStorage cache ----
function readLS<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / private mode issues
  }
}

// ---- fetchers ----
async function homepageFetcher(url: string) {
  const res = await fetch(url, { method: "GET" });
  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.error || "Failed to load home feed.");
  }
  if (json?.ok === false) {
    throw new Error(json?.error || "Failed to load home feed.");
  }

  // Support both shapes:
  // A) { ok: true, data: { data: [], stations: [], homeSlides: [] } }
  // B) { homeSlides: [], sections: [], stations: [] }
  const sections = (json?.data?.data ??
    json?.data?.sections ??
    json?.sections ??
    []) as Section[];
  const stations = (json?.data?.stations ?? json?.stations ?? []) as any[];
  const homeSlides = (json?.data?.homeSlides ??
    json?.homeSlides ??
    []) as HeroSlide[];

  return { sections, stations, homeSlides };
}

async function fetchHomePlayer() {
  const res = await fetch(`${API_BASE}home/player`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Application-Key": APP_KEY,
    },
    cache: "no-store",
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) return null;
  return json as any;
}

async function fetchVideoLanguages(videoId: string | number) {
  const res = await fetch(`${API_BASE}video/languages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Application-Key": APP_KEY,
    },
    body: JSON.stringify({ video: videoId }),
  });

  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) return [];
  return (json.data || []) as PopupLanguage[];
}

export default function HomePage() {
  const { token, initialized } = useAuth();

  // ---- CACHED: homepage ----
  const HOME_LS_KEY = "ceflix:homepage:v1";
  const homeFallback = useMemo(
    () =>
      readLS<{
        sections: Section[];
        stations: any[];
        homeSlides: HeroSlide[];
      }>(HOME_LS_KEY),
    [],
  );

  const {
    data: homeData,
    error: homeErr,
    isLoading: homeLoading,
  } = useSWR("/api/homepage", homepageFetcher, {
    fallbackData: homeFallback,
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
    keepPreviousData: true,
    onSuccess: (data) => writeLS(HOME_LS_KEY, data),
  });

  const homeSections = homeData?.sections ?? [];
  const stations = homeData?.stations ?? [];
  const slides = homeData?.homeSlides ?? [];
  const homeError = homeErr ? "Unable to load videos right now." : null;

  // ---- Popup player state ----
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupData, setPopupData] = useState<PopupData | null>(null);
  const didShowPopupRef = useRef(false);

  // ---- Count view helpers (kept OUTSIDE Popup component) ----
  async function countViewLoggedIn(
    videoId?: string | number,
    language?: string | null,
  ) {
    if (!token || !videoId) return;

    // If AuthProvider exposes user.email, use that.
    // Otherwise fallback to legacy localStorage to preserve behavior.
    let email: string | null = null;
    try {
      const raw =
        typeof window !== "undefined"
          ? window.localStorage.getItem("ceflix.user")
          : null;
      if (raw) email = JSON.parse(raw)?.email ?? null;
    } catch {
      email = null;
    }

    await fetch(`${API_BASE}countvideoview`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
        "X-TOKEN": token,
      },
      body: JSON.stringify({
        email,
        video: String(videoId),
        language: language ?? null,
      }),
    }).catch(() => {});
  }

  async function countViewGuest(videoId?: string | number) {
    if (!videoId) return;

    await fetch(`${API_BASE}video/offline-view-count`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({
        video: String(videoId),
        device:
          typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      }),
    }).catch(() => {});
  }

  // ---- Load home popup player (same flow as old app) ----
  useEffect(() => {
    if (!initialized) return;

    // Only run once per mount (avoid SWR rerenders / state loops)
    if (didShowPopupRef.current) return;
    didShowPopupRef.current = true;

    (async () => {
      const player = await fetchHomePlayer();
      if (!player?.status) return;

      const videoId = player.videoID ?? player.videoId ?? player.id;
      const title = player.videoTitle ?? player.title ?? "Now Playing";
      const url = player.url;
      const thumbnail = player.thumbnail ?? null;

      if (!videoId || !url) return;

      const languages = await fetchVideoLanguages(videoId);

      setPopupData({
        id: videoId,
        videoID: videoId,
        title,
        url,
        thumbnail,
        languages,
      });

      // Count view when popup triggers on home (old behavior)
      if (token) await countViewLoggedIn(videoId, null);
      else await countViewGuest(videoId);

      setPopupOpen(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, token]);

  if (!initialized) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 text-sm">
          Loading your experience…
        </div>
      </main>
    );
  }

  return (
    <main className="bg-neutral-950 text-white min-h-screen mb-[10rem] w-full max-w-[1800px] mx-auto px-4 sm:px-6">
      {" "}
      {/* Home popup player */}
      <PopupPlayer
        open={popupOpen}
        data={popupData}
        onClose={() => setPopupOpen(false)}
        onCountView={({ videoId, language }) => {
          if (token) void countViewLoggedIn(videoId, language ?? null);
          else void countViewGuest(videoId);
        }}
      />
      {/* <div className="overflow-hidden">
        <HeroSlider slides={slides} autoAdvanceMs={8000} />
      </div>
      <section className="mt-6">
        <ChannelSlider title={"Live Stations"} items={stations} />
      </section> */}
      <section className="mt-6">
        <ShortsShelf />
      </section>
      <InitialHomeGrid
        sections={homeSections}
        loading={homeLoading}
        error={homeError}
      />
      <CeflixTvMini />
    </main>
  );
}
