"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const PAGE_SIZE = 24;

type LikedVideo = {
  id: number;
  channel_id: number;
  videos_title: string;
  slug: string;
  description: string;
  video_category: number | null;
  tags: string | null;
  thumbnail: string;
  url: string;
  ios_url: string;
  schedule: string;
  uploadtime: string;
  start: string;
  end: string;
  startDate: string;
  endDate: string | null;
  showdate: string;
  is_ticketed: string;
  price: number | null;
  recommended: string | null;
  active: number;
  processingStatus: number;
  isDownloadable: string | null;
  rawUrl: string | null;
  isLive: string;
  filename: string;
  windowsurl: string | null;
  mediaID: number;
  position: number;
  downcount: number;
  url_prefix: string;
  duration: string | null;
  type: string;
  token: string;
  hideFrom: string;
  likes: string;
  email: string | null;
  numOfComments: number;
  numOfViews: number;
  isShort: string;
  isPremium: string;
  premiumToken: string | null;
  isPublic: string;
  isPPV: string;
  ppvAmount: number | null;
  ppvID: number | null;
  ppvDate: string | null;
  ppvPromo: string | null;
  isPPVEnded: string;
  connectUUID: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  channel_image: string | null;
  channel: string;
};

function durationLabel(seconds: string | number | null) {
  if (!seconds) return "";
  const s = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (!Number.isFinite(s)) return "";
  const val = new Date(s * 1000).toISOString();
  if (val.substring(12, 13) === "0") return val.substring(14, 19);
  return val.substring(12, 19);
}

function timeSinceUnix(unix: number | string) {
  const ts = typeof unix === "string" ? parseInt(unix, 10) * 1000 : unix * 1000;
  if (!Number.isFinite(ts)) return "";

  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);

  const fmt = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"} ago`;

  if (minutes < 1) return "Just now";
  if (minutes < 60) return fmt(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fmt(hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 7) return fmt(days, "day");

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return fmt(weeks, "week");

  const months = Math.floor(days / 30);
  if (months < 12) return fmt(months, "month");

  const years = Math.floor(days / 365);
  return fmt(years, "year");
}

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

export default function LikedVideosPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [tab, setTab] = useState<"all" | "videos" | "shorts">("all");

  const [loading, setLoading] = useState(true);
  const [allVideos, setAllVideos] = useState<LikedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const isLoggedIn = !!user && !!token;
  const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);

  async function fetchLikedVideos() {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const firstReq = await fetch(API_BASE + "user/videos/liked", {
        method: "POST",
        headers: {
          "Access-Control-Request-Method": "POST",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          token,
          page: 1,
          per_page: PAGE_SIZE,
        }),
      });

      const firstRes = await firstReq.json();

      if (!firstRes.status) {
        setError("Unable to load your liked videos.");
        setAllVideos([]);
        return;
      }

      const firstPageData: LikedVideo[] = firstRes.data || [];
      const firstMeta = firstRes.meta ?? null;

      let combined = [...firstPageData];
      const lastPage = firstMeta?.last_page ?? 1;

      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) => i + 2).map(async (p) => {
            const req = await fetch(API_BASE + "user/videos/liked", {
              method: "POST",
              headers: {
                "Access-Control-Request-Method": "POST",
                "Content-Type": "application/json",
                "Application-Key": APP_KEY,
                "X-TOKEN": token,
              },
              body: JSON.stringify({
                token,
                page: p,
                per_page: PAGE_SIZE,
              }),
            });

            const res = await req.json();
            return (res?.status ? res.data || [] : []) as LikedVideo[];
          }),
        );

        combined = [...combined, ...rest.flat()];
      }

      combined.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setAllVideos(combined);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching your liked videos.");
      setAllVideos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    void fetchLikedVideos();
  }, [isLoggedIn, token]);

  const filteredVideos = useMemo(() => {
    if (tab === "shorts") {
      return allVideos.filter((video) => String(video.isShort).toLowerCase() === "yes");
    }
    if (tab === "videos") {
      return allVideos.filter((video) => String(video.isShort).toLowerCase() !== "yes");
    }
    return allVideos;
  }, [allVideos, tab]);

  useEffect(() => {
    setVisibleCount(Math.min(PAGE_SIZE, filteredVideos.length || PAGE_SIZE));
  }, [filteredVideos.length, tab]);

  useEffect(() => {
    if (!filteredVideos.length) return;

    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        setVisibleCount((prev) => {
          if (prev >= filteredVideos.length) return prev;
          return Math.min(prev + PAGE_SIZE, filteredVideos.length);
        });
      },
      {
        root: null,
        rootMargin: "250px",
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [filteredVideos.length]);

  const visibleVideos = filteredVideos.slice(0, visibleCount);
  const hasMore = visibleCount < filteredVideos.length;

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

        <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-20 lg:px-6">
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Liked Videos
            </h1>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in to see videos you&apos;ve liked.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
              Liked Videos
            </h1>
            <p className="text-sm text-neutral-400 truncate">
              {tab === "all"
                ? "All the videos and shorts you’ve liked."
                : tab === "shorts"
                  ? "All the shorts you’ve liked."
                  : "All the videos you’ve liked."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => fetchLikedVideos()}
              disabled={loading}
              className={`w-full sm:w-auto inline-flex justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80 ${
                loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("all")}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
              tab === "all"
                ? "bg-white text-black"
                : "border border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => setTab("videos")}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
              tab === "videos"
                ? "bg-white text-black"
                : "border border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            Videos
          </button>
          <button
            type="button"
            onClick={() => setTab("shorts")}
            className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
              tab === "shorts"
                ? "bg-white text-black"
                : "border border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800"
            }`}
          >
            Shorts
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && visibleVideos.length === 0 && (
          <div className="mt-6 space-y-4">
            {skeletonArray.map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/10 bg-neutral-900/40 p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row gap-4 animate-pulse">
                  <div className="w-full sm:w-56 md:w-64 aspect-video rounded-md bg-neutral-800 flex-shrink-0" />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-neutral-800" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-3 w-24 rounded bg-neutral-800" />
                        <div className="h-4 w-3/4 rounded bg-neutral-800" />
                      </div>
                    </div>
                    <div className="h-3 w-2/3 rounded bg-neutral-800" />
                    <div className="h-3 w-1/2 rounded bg-neutral-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredVideos.length === 0 && (
          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200 font-semibold">
              No liked {tab === "all" ? "content" : tab} yet.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Start exploring and tap the heart icon on videos you enjoy.
            </p>
          </div>
        )}

        {visibleVideos.length > 0 && (
          <div className="mt-6 space-y-4">
            {visibleVideos.map((video) => {
              const slug = encodeURIComponent(
                video.videos_title
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/-+/g, "-")
                  .toLowerCase(),
              );

              const watchHref = `/videos/watch/${video.id}/${slug}`;
              const isShort = String(video.isShort).toLowerCase() === "yes";

              return (
                <div
                  key={video.id}
                  className="group rounded-lg border border-white/10 bg-neutral-900/40 hover:bg-neutral-900/60 transition p-3 sm:p-4"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href={watchHref}
                      className={`block flex-shrink-0 ${
                        isShort ? "w-32 sm:w-36" : "w-full sm:w-56 md:w-64"
                      }`}
                    >
                      <div
                        className={`relative overflow-hidden rounded-md bg-black ${
                          isShort ? "aspect-[9/16]" : "aspect-video"
                        }`}
                      >
                        <Image
                          src={video.thumbnail}
                          alt={video.videos_title}
                          fill
                          unoptimized
                          className="object-contain"
                        />

                        {video.duration && (
                          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold">
                            {durationLabel(video.duration)}
                          </span>
                        )}
                      </div>
                    </Link>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 relative h-9 w-9 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                          {video.channel_image ? (
                            <Image
                              src={video.channel_image}
                              alt={video.channel}
                              fill
                              unoptimized
                              className="object-contain"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-300">
                              {video.channel?.charAt(0) || "C"}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-neutral-400 truncate">
                            {video.channel || "Unknown channel"}
                          </p>

                          <Link href={watchHref} className="block">
                            <h2 className="text-sm sm:text-lg font-semibold leading-snug line-clamp-2 break-words">
                              {video.videos_title}
                            </h2>
                          </Link>

                          {video.description && (
                            <p className="mt-3 text-xs sm:text-sm text-neutral-300 line-clamp-2 break-words">
                              {truncate(video.description, 140)}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                            <span>{timeSinceUnix(video.uploadtime)}</span>
                            <span>•</span>
                            <span>{isShort ? "Short" : "Video"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div ref={loadMoreRef} className="h-12" />

        {hasMore && !loading && (
          <div className="mt-2 text-sm text-neutral-300 flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
            <span>Loading more…</span>
          </div>
        )}

        {!loading && !hasMore && filteredVideos.length > 0 && (
          <div className="mt-6 text-center text-xs text-neutral-500">
            You&apos;ve reached the end of your liked videos.
          </div>
        )}
      </div>
    </div>
  );
}