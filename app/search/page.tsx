"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type VideoResult = {
  id: string;
  videoID: string;
  videos_title: string;
  description: string;
  isLive: "0" | "1" | string;
  thumbnail: string;
  numOfComments: string;
  numOfViews: string;
  uploadtime: string;
  likes: string;
  isPremium: "0" | "1" | string;
};

type ChannelResult = {
  channelID: string;
  channelName: string;
  description: string;
  profilepic: string;
  score: string;
};

type ApiResponse = {
  status: boolean;
  data?: {
    videos?: any[];
    channels?: any[];
    playlists?: any[];
  };
};

function timeSinceUnix(unixStr: string) {
  const ts = Number(unixStr) * 1000;
  if (!Number.isFinite(ts)) return "";
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} years ago`;
}

function formatViews(viewsStr: string) {
  const v = Number(viewsStr);
  if (!Number.isFinite(v)) return viewsStr || "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

// ✅ Inner component using useSearchParams
function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const queryFromUrl = (searchParams.get("q") || "").trim();

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [resultFilter, setResultFilter] = useState<"videos" | "channels">(
    "videos"
  );

  const PAGE_SIZE_VIDEOS = 10;
  const PAGE_SIZE_CHANNELS = 12;

  const [visibleVideoCount, setVisibleVideoCount] = useState(PAGE_SIZE_VIDEOS);
  const [visibleChannelCount, setVisibleChannelCount] =
    useState(PAGE_SIZE_CHANNELS);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // ✅ Local input state for mobile search
  const [searchInput, setSearchInput] = useState(queryFromUrl);

  useEffect(() => {
    setSearchInput(queryFromUrl);
  }, [queryFromUrl]);

  const handleLocalSearch = () => {
    const term = (searchInput || "").trim();
    if (!term) return;
    const encoded = encodeURIComponent(term).replace(/%20/g, "+");
    router.push(`/search?q=${encoded}`);
  };

  async function getSearchResults(term: string) {
    if (!term) {
      setVideos([]);
      setChannels([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const body: any = { param: term };
      if (token) body.token = token;

      const req = await fetch(API_BASE + "search", {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Request-Method": "POST",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify(body),
      });

      const res: ApiResponse = await req.json();

      if (!res.status || !res.data) {
        setError("No results found.");
        setVideos([]);
        setChannels([]);
      } else {
        const raw = res.data.videos || [];
        const raw2 = res.data.channels || [];

        const videoResults: VideoResult[] = raw.filter(
          (item: any) => item.videoID && item.thumbnail
        );
        const channelResults: ChannelResult[] = raw2.filter(
          (item: any) => item.channelID && item.profilepic
        );

        setVideos(videoResults);
        setChannels(channelResults);
      }
    } catch (e) {
      console.error(e);
      setError("Something went wrong while searching.");
      setVideos([]);
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch when URL query changes
  useEffect(() => {
    if (!queryFromUrl) {
      setVideos([]);
      setChannels([]);
      return;
    }
    getSearchResults(queryFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryFromUrl, token]);

  // Reset visible when results change
  useEffect(() => {
    setVisibleVideoCount(PAGE_SIZE_VIDEOS);
    setVisibleChannelCount(PAGE_SIZE_CHANNELS);
  }, [videos, channels]);

  const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);
  const hasResults = videos.length > 0 || channels.length > 0;

  const canLoadMore =
    (resultFilter === "videos" && visibleVideoCount < videos.length) ||
    (resultFilter === "channels" && visibleChannelCount < channels.length);

  // Infinite scroll observer
  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading) return;
        if (!hasResults) return;

        if (resultFilter === "videos") {
          setVisibleVideoCount((prev) =>
            Math.min(prev + PAGE_SIZE_VIDEOS, videos.length)
          );
        } else {
          setVisibleChannelCount((prev) =>
            Math.min(prev + PAGE_SIZE_CHANNELS, channels.length)
          );
        }
      },
      { root: null, rootMargin: "200px", threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [loading, hasResults, resultFilter, videos.length, channels.length]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto px-4 sm:px-8 pt-2 lg:pt-6 pb-10">

        {/* ✅ Mobile-only Search Bar */}
        <div className="mb-4 sm:hidden">
          <div className="flex items-center gap-2 w-full px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800">
            <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search Ceflix"
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-400 focus:outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLocalSearch();
                }
              }}
            />
            <button
              type="button"
              onClick={handleLocalSearch}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
            >
              Search
            </button>
          </div>
        </div>

        {/* Header / query */}
        {queryFromUrl && (
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-400">
              Search results for{" "}
              <span className="font-semibold text-white">“{queryFromUrl}”</span>
            </p>

            {hasResults && (
              <div className="inline-flex rounded-full bg-neutral-900/80 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => setResultFilter("videos")}
                  className={`cursor-pointer px-3 py-1 rounded-full font-semibold ${
                    resultFilter === "videos"
                      ? "bg-white text-black"
                      : "text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  Videos
                </button>
                <button
                  type="button"
                  onClick={() => setResultFilter("channels")}
                  className={`cursor-pointer px-3 py-1 rounded-full font-semibold ${
                    resultFilter === "channels"
                      ? "bg-white text-black"
                      : "text-neutral-300 hover:bg-neutral-800"
                  }`}
                >
                  Channels
                </button>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-4">
            {skeletonArray.map((_, idx) => (
              <div key={idx} className="flex gap-4 animate-pulse">
                <div className="w-40 sm:w-90 aspect-video bg-neutral-800 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-4/5" />
                  <div className="h-3 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && !hasResults && !error && queryFromUrl && (
          <div className="mt-10 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center text-sm text-neutral-300">
            No results found. Try a different search.
          </div>
        )}

        {/* Video results */}
        {!loading && videos.length > 0 && resultFilter === "videos" && (
          <section className="space-y-4">
            {videos.slice(0, visibleVideoCount).map((v) => {
              const views = formatViews(v.numOfViews);
              const since = timeSinceUnix(v.uploadtime);
              const isLive = v.isLive === "1";

              return (
                <Link
                  key={v.videoID}
                  href={`/videos/watch/${v.videoID}/${v.videos_title
                    .replace(/[\s+-]/g, "-")
                    .toLowerCase()}`}
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-lg hover:bg-neutral-900/70 transition p-4 -mx-2"
                >
                  <div className="relative w-full sm:w-90 aspect-video rounded-md overflow-hidden bg-neutral-900 flex-shrink-0">
                    <Image
                      src={v.thumbnail}
                      alt={v.videos_title}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                    {isLive && (
                      <span className="absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-600 text-white">
                        LIVE
                      </span>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col">
                    <h2 className="text-base sm:text-lg font-semibold leading-snug mb-1 line-clamp-2">
                      {v.videos_title}
                    </h2>
                    <p className="text-sm py-1 text-neutral-400 mb-1">
                      {views} views
                      {since && ` • ${since}`}
                      {v.isPremium === "1" && " • Premium"}
                    </p>
                    {v.description && (
                      <p className="text-sm text-neutral-400 line-clamp-2">
                        {v.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {/* Channel results */}
        {!loading && channels.length > 0 && resultFilter === "channels" && (
          <section className="mt-8">
            <h3 className="text-sm font-semibold mb-3 text-neutral-200">
              Channels
            </h3>
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              {channels.slice(0, visibleChannelCount).map((c) => (
                <Link
                  key={c.channelID}
                  href={`/channel/${c.channelID}`}
                  className="flex items-center gap-3 rounded-lg hover:bg-neutral-900/70 transition p-2 -mx-2"
                >
                  <div className="relative h-14 w-14 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                    <Image
                      src={c.profilepic}
                      alt={c.channelName}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-md font-semibold line-clamp-1">
                      {c.channelName || "Channel"}
                    </p>
                    {c.description && (
                      <p className="text-sm text-neutral-400 line-clamp-2">
                        {c.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Infinite scroll sentinel */}
        {!loading && hasResults && canLoadMore && (
          <div ref={loadMoreRef} className="h-10 w-full" />
        )}
      </div>
    </main>
  );
}

// ✅ Suspense wrapper
export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}
