"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TrashIcon } from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider";

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_850/";

function withCloudinaryPrefix(src: string | null): string {
  if (!src) return "";
  const lower = src.toLowerCase();
  if (lower.includes("cloudinary") || lower.includes("cloudfront")) return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const PAGE_SIZE = 12;

type HistoryItem = {
  id: number;
  userID: string;
  videoID: number;
  currentTime: string;
  duration: string | null;
  created_at: string;
  updated_at: string;
  channel_id: number;
  videos_title: string;
  slug: string;
  description: string | null;
  tags: string | null;
  thumbnail: string;
  url: string;
  ios_url: string;
  schedule: string;
  uploadtime: string;
  startDate: string;
  endDate: string | null;
  is_ticketed: string;
  price: number | null;
  recommended: string;
  active: number;
  processingStatus: number;
  isDownloadable: string;
  isLive: string;
  filename: string;
  mediaID: number;
  downcount: number;
  url_prefix: string;
  type: string;
  likes: string;
  email: string;
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
  channel_prefix: string;
  channel_file: string;
  channel: string;
  category: number;
  isVerified: string;
};

function timeSince(unix: number | string) {
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

function durationFmt(seconds: number | string | null) {
  const s = typeof seconds === "string" ? parseFloat(seconds) : (seconds ?? 0);
  if (!Number.isFinite(s) || s <= 0) return "";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }

  return `${m}:${String(sec).padStart(2, "0")}`;
}

function getChannelProfilePicture(item: HistoryItem): string {
  const prefix = (item.channel_prefix ?? "").trim();
  const file = (item.channel_file ?? "").trim();
  if (prefix && file) return `${prefix}${file}`;
  return "https://ceflix.org/images/avatar.png";
}

export default function HistoryPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [tab, setTab] = useState<"all" | "videos" | "shorts">("all");

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const isLoggedIn = !!user && !!token;
  const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);

  const computeProgress = (item: HistoryItem) => {
    const current = Number(item.currentTime);
    let durationSeconds = Number(item.duration);

    if (!durationSeconds || Number.isNaN(durationSeconds)) return 0;

    if (durationSeconds < 1000 && current > durationSeconds * 2) {
      durationSeconds = durationSeconds * 60;
    }

    const ratio = Math.min(current / durationSeconds, 1);
    if (!Number.isFinite(ratio) || ratio <= 0) return 0;
    return ratio * 100;
  };

  const filteredItems = useMemo(() => {
    if (tab === "shorts") {
      return items.filter((item) => String(item.isShort).toLowerCase() === "yes");
    }
    if (tab === "videos") {
      return items.filter((item) => String(item.isShort).toLowerCase() !== "yes");
    }
    return items;
  }, [items, tab]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const hasMore = visibleCount < filteredItems.length;

  const fetchHistory = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);

    try {
      const req = await fetch(API_BASE + "user/videos/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({ token }),
      });

      const res = await req.json();

      if (!res.status) {
        setError("Unable to load your watch history.");
        setItems([]);
      } else {
        setItems(res.data || []);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching history.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const deleteVideo = async (videoID: number) => {
    if (!token) return;
    setDeletingId(videoID);

    try {
      await fetch(API_BASE + "user/videos/history/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ video: videoID, token }),
      });

      setItems((prev) => prev.filter((i) => i.videoID !== videoID));
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    void fetchHistory();
  }, [isLoggedIn, token]);

  useEffect(() => {
    setVisibleCount(Math.min(PAGE_SIZE, filteredItems.length || PAGE_SIZE));
  }, [tab, filteredItems.length]);

  useEffect(() => {
    if (!filteredItems.length) return;

    const sentinel = loadMoreRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry?.isIntersecting) return;

        setVisibleCount((prev) => {
          if (prev >= filteredItems.length) return prev;
          return Math.min(prev + PAGE_SIZE, filteredItems.length);
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
  }, [filteredItems.length]);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

        <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-20 lg:px-6">
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Watch History
            </h1>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in to see videos you&apos;ve watched recently.
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
              Watch History
            </h1>
            <p className="text-sm text-neutral-400 truncate">
              {tab === "all"
                ? "Videos and shorts you’ve watched recently."
                : tab === "shorts"
                  ? "Shorts you’ve watched recently."
                  : "Videos you’ve watched recently."}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* <Link
              href="/subscriptions"
              className="w-full sm:w-auto inline-flex justify-center rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
            >
              Go to subscriptions
            </Link> */}

            <button
              type="button"
              onClick={() => fetchHistory()}
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

        {loading && visibleItems.length === 0 && (
          <div className="mt-6 space-y-4">
            {skeletonArray.map((_, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/10 bg-neutral-900/40 p-3 sm:p-4"
              >
                <div className="flex gap-4 animate-pulse">
                  <div className="w-40 sm:w-56 md:w-64 aspect-video rounded-md bg-neutral-800 flex-shrink-0" />
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
                    <div className="h-8 w-24 rounded-full bg-neutral-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredItems.length === 0 && (
          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200 font-semibold">
              No {tab === "all" ? "history" : tab} yet.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              {tab === "all"
                ? "Videos you watch will appear here so you can continue later."
                : tab === "shorts"
                  ? "Shorts you watch will appear here."
                  : "Videos you watch will appear here."}
            </p>
            <Link
              href="/"
              className="inline-flex mt-4 rounded-full bg-white text-black px-5 py-2 text-xs font-semibold hover:bg-white/80"
            >
              Browse videos
            </Link>
          </div>
        )}

        {visibleItems.length > 0 && (
          <div className="mt-6 space-y-4">
            {visibleItems.map((item) => {
              const watchHref = `/videos/watch/${item.videoID}/${item.slug || ""}`.replace(
                /\/$/,
                "",
              );
              const progressPercent = computeProgress(item);
              const dur = durationFmt(item.duration);
              const channelImg = getChannelProfilePicture(item);
              const isShort = String(item.isShort).toLowerCase() === "yes";

              return (
                <div
                  key={`${item.id}-${item.videoID}`}
                  className="group rounded-lg border border-white/10 bg-neutral-900/40 hover:bg-neutral-900/60 transition p-3 sm:p-4"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link
                      href={watchHref}
                      className={`block flex-shrink-0 ${
                        isShort
                          ? "w-32 sm:w-36"
                          : "w-full sm:w-56 md:w-64"
                      }`}
                    >
                      <div
                        className={`relative overflow-hidden rounded-md bg-black ${
                          isShort ? "aspect-[9/16]" : "aspect-video"
                        }`}
                      >
                        <Image
                          src={withCloudinaryPrefix(item.thumbnail)}
                          alt={item.videos_title}
                          fill
                          unoptimized
                          className="object-contain"
                        />

                        {dur && (
                          <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold">
                            {dur}
                          </span>
                        )}

                        {progressPercent > 0 && (
                          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-black/60">
                            <div
                              className="h-full bg-red-600"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        )}
                      </div>
                    </Link>

                    <div className="min-w-0 flex-1 content-center">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 min-w-0">
                            <Link
                              href={`/channel/${item.channel_id}`}
                              className="relative h-9 w-9 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0"
                            >
                              <Image
                                src={withCloudinaryPrefix(channelImg)}
                                alt={item.channel}
                                fill
                                unoptimized
                                className="object-contain"
                              />
                            </Link>

                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-neutral-400 truncate">
                                {item.channel}
                                {String(item.isVerified) === "1"
                                  ? " • Verified"
                                  : ""}
                              </p>

                              <Link href={watchHref} className="block">
                                <h2 className="text-sm sm:text-lg font-semibold leading-snug line-clamp-2 break-words">
                                  {item.videos_title}
                                </h2>
                              </Link>
                            </div>
                          </div>

                          {item.description ? (
                            <p className="mt-3 text-xs sm:text-sm text-neutral-300 line-clamp-2 break-words">
                              {item.description}
                            </p>
                          ) : null}

                          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                            <span>{timeSince(item.uploadtime)}</span>
                            <span>•</span>
                            <span>{isShort ? "Short" : "Video"}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteVideo(item.videoID)}
                          disabled={deletingId === item.videoID}
                          className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/60 px-3 py-1.5 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer flex-shrink-0"
                        >
                          <TrashIcon className="h-4 w-4" />
                          {deletingId === item.videoID ? "Removing…" : "Remove"}
                        </button>
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

        {!loading && !hasMore && filteredItems.length > 0 && (
          <div className="mt-6 text-center text-xs text-neutral-500">
            You&apos;ve reached the end of your history.
          </div>
        )}
      </div>
    </div>
  );
}