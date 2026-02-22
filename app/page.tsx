// app/page.tsx
"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { useAuth } from "./components/AuthProvider";

import InitialHomeGrid, { type Section } from "./components/HomeGrid";
import ChannelSlider from "./components/ChannelSlider";
import HeroSlider, { type Slide as HeroSlide } from "./components/HeroSlider";
import CeflixTvMini from "./components/CeflixTvMini";

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

const DEFAULT_CHANNELS: SubscriptionChannel[] = [
  {
    id: 82,
    channel: "Haven TV",
    filename: "03559-havenchan.png",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 105,
    channel: "Pastor Chris Teaching",
    filename: "d0ff1-pstchristeachingthumbnail.jpg",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 164,
    channel: "Night of Bliss",
    filename: "8579f-vlcsnap-2016-01-13-15h35m45s321.png",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 175,
    channel: "Live Events Channel",
    filename: "e02af-1.png",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 335,
    channel: "Bright Side",
    filename: "6f17b-unnamed-copy.jpg",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 380,
    channel: "CeFlix News Channel",
    filename: "21cf4-new_thmbn.jpg",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 381,
    channel: "Special Live Events",
    filename: "154575-1649768876776983320507.jpg",
    urlprefix: "https://cdnvideos.ceflix.org/channel/thumbs/",
  },
];

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

  // tolerate APIs that don't return { ok: true }
  if (!res.ok) {
    throw new Error(json?.error || "Failed to load home feed.");
  }
  if (json?.ok === false) {
    throw new Error(json?.error || "Failed to load home feed.");
  }

  // Support both shapes:
  // A) { ok: true, data: { data: [], stations: [], homeSlides: [] } }
  // B) { homeSlides: [], sections: [], stations: [] }
  const sections = (json?.data?.data ?? json?.data?.sections ?? json?.sections ?? []) as Section[];
  const stations = (json?.data?.stations ?? json?.stations ?? []) as any[];
  const homeSlides = (json?.data?.homeSlides ?? json?.homeSlides ?? []) as HeroSlide[];

  return { sections, stations, homeSlides };
}

async function subscriptionsFetcher([url, token]: [string, string]) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Application-Key": APP_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ token }),
  });

  if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

  const json = await res.json();
  return (json.data || []) as SubscriptionChannel[];
}

export default function HomePage() {
  const { token, initialized } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!initialized) return;
    // if (!token) router.push("/login?next=/");
  }, [initialized, token, router]);

  // ---- CACHED: homepage ----
  const HOME_LS_KEY = "ceflix:homepage:v1";
  const homeFallback = useMemo(
    () =>
      readLS<{
        sections: Section[];
        stations: any[];
        homeSlides: HeroSlide[];
      }>(HOME_LS_KEY),
    []
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

  // ---- CACHED: subscriptions (per user token) ----
  const SUBS_LS_KEY = token ? `ceflix:subs:v1:${token.slice(0, 12)}` : null;
  const subsFallback = useMemo(
    () => (SUBS_LS_KEY ? readLS<SubscriptionChannel[]>(SUBS_LS_KEY) : undefined),
    [SUBS_LS_KEY]
  );

  const {
    data: subs,
    error: subsErr,
    isLoading: subsLoading,
  } = useSWR(token ? [`${API_BASE}user/subscriptions`, token] : null, subscriptionsFetcher, {
    fallbackData: subsFallback,
    revalidateOnFocus: true,
    dedupingInterval: 60_000,
    keepPreviousData: true,
    onSuccess: (data) => {
      if (SUBS_LS_KEY) writeLS(SUBS_LS_KEY, data);
    },
  });

  if (!initialized) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 text-sm">Loading your experience…</div>
      </main>
    );
  }

  let channelsToShow: SubscriptionChannel[] = [];
  if (!token) {
    channelsToShow = DEFAULT_CHANNELS;
  } else if (!subsLoading && subs && subs.length > 0) {
    channelsToShow = subs;
  }

  const sliderLoading = !!token && subsLoading;
  const subsError = token && subsErr ? "Could not load your subscriptions." : null;

  return (
    <main className="bg-neutral-950 text-white min-h-screen mb-[10rem]">
      <div className="overflow-hidden">
        <HeroSlider slides={slides} autoAdvanceMs={8000} />
      </div>

      <section className="mt-6">
        {subsError && <div className="text-sm text-red-400 mb-2">{subsError}</div>}

        {(sliderLoading || channelsToShow.length > 0) && (
          <ChannelSlider title={"Live Stations"} items={stations} loading={sliderLoading} />
        )}
      </section>

      <InitialHomeGrid sections={homeSections} loading={homeLoading} error={homeError} />

      <CeflixTvMini />
    </main>
  );
}
