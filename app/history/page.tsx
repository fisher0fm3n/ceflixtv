"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  TrashIcon,
  ClockIcon,
  PlayCircleIcon,
} from "@heroicons/react/24/outline";

// ⬇️ Adjust this path if needed (follow your ChannelPage pattern)
import { useAuth } from "../components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type HistoryItem = {
  id: number; // history id
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
  uploadtime: string; // unix string
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

export default function HistoryPage() {
  const router = useRouter();
  const { token, user } = useAuth(); // token is a string like on ChannelPage
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!user && !!token;

  // ───────── helpers ─────────
  const formatViews = (n: number) => {
    if (!n && n !== 0) return "";
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M views`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K views`;
    return `${n} views`;
  };

  const timeSince = (unixString: string) => {
    const sec = Number(unixString);
    if (Number.isNaN(sec)) return "";
    const diffMs = Date.now() - sec * 1000;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const m = 60;
    const h = 60 * m;
    const d = 24 * h;
    const w = 7 * d;
    const y = 365 * d;

    if (diffSec >= y) return `${Math.floor(diffSec / y)} years ago`;
    if (diffSec >= w) return `${Math.floor(diffSec / w)} weeks ago`;
    if (diffSec >= d) return `${Math.floor(diffSec / d)} days ago`;
    if (diffSec >= h) return `${Math.floor(diffSec / h)} hours ago`;
    if (diffSec >= m) return `${Math.floor(diffSec / m)} minutes ago`;
    return "Just now";
  };

  const computeProgress = (item: HistoryItem) => {
    const current = Number(item.currentTime);
    let durationSeconds = Number(item.duration);

    if (!durationSeconds || Number.isNaN(durationSeconds)) return 0;

    // If duration is small but currentTime is large, assume duration is minutes
    if (durationSeconds < 1000 && current > durationSeconds * 2) {
      durationSeconds = durationSeconds * 60;
    }

    const ratio = Math.min(current / durationSeconds, 1);
    if (!Number.isFinite(ratio) || ratio <= 0) return 0;
    return ratio * 100;
  };

  const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);

  // ───────── API calls ─────────
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
        // CRA used JSON.stringify(token); here token is a string
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
          "X-TOKEN": token, // like channelSubscription
        },
        body: JSON.stringify({ video: videoID, token }),
      });

      // Optimistic update
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
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  // ───────── not signed in ─────────
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-3xl font-extrabold mb-4">Watch history</h1>
          <p className="text-neutral-400 text-md mb-4">
            Sign in to see videos you&apos;ve watched recently.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  // ───────── UI ─────────
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-extrabold">Watch history</h1>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Skeleton loader */}
        {loading && (
          <div className="space-y-4">
            {skeletonArray.map((_, idx) => (
              <div key={idx} className="flex gap-4 animate-pulse">
                <div className="w-40 sm:w-56 md:w-64 aspect-video bg-neutral-800 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                  <div className="h-3 bg-neutral-800 rounded w-1/3" />
                  <div className="h-1.5 bg-neutral-800 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && items.length === 0 && !error && (
          <p className="text-neutral-400 text-sm">
            You haven&apos;t watched any videos yet.
          </p>
        )}

        {!loading && items.length > 0 && (
          <div className="space-y-4">
            {items.map((item) => {
              const progressPercent = computeProgress(item);

              return (
                <div
                  key={`${item.id}-${item.videoID}`}
                  className="flex gap-4 group"
                >
                  {/* Thumbnail */}
                  <Link
                    href={`/videos/watch/${item.videoID}/${item.slug}`}
                    className="block w-40 sm:w-56 md:w-64 flex-shrink-0"
                  >
                    <div className="relative aspect-video rounded-md overflow-hidden bg-neutral-800">
                      <Image
                        src={item.thumbnail}
                        alt={item.videos_title}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-105 transition"
                      />
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

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/videos/watch/${item.videoID}/${item.slug}`}
                      className="block"
                    >
                      <h2 className="text-sm sm:text-lg font-bold line-clamp-2 transition">
                        {item.videos_title}
                      </h2>
                    </Link>

                    <div className="mt-1 text-xs text-neutral-400 flex flex-wrap gap-x-2 gap-y-1 items-center">
                      <Link
                        href={`/channel/${item.channel_id}`}
                        className="hover:text-neutral-200 flex items-center gap-3"
                      >
                        <span className="relative inline-block h-6 w-6 rounded-full overflow-hidden bg-neutral-800">
                          {item.channel_file && (
                            <Image
                              src={`${item.channel_prefix}${item.channel_file}`}
                              alt={item.channel}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          )}
                        </span>
                        <span>{item.channel}</span>
                        {item.isVerified === "1" && (
                          <span className="ml-1 text-[10px] uppercase tracking-wide text-blue-400 border border-blue-400/40 rounded px-1 py-[1px]">
                            Verified
                          </span>
                        )}
                      </Link>

                      <span>•</span>
                      <span>{formatViews(item.numOfViews)}</span>
                      <span>•</span>
                      <span>{timeSince(item.uploadtime)}</span>
                    </div>

                    <p className="mt-2 text-sm text-neutral-400 line-clamp-2">
                      {item.description}
                    </p>

                    {/* progress meta + delete */}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        {/* <ClockIcon className="h-4 w-4" />
                        {progressPercent > 95
                          ? "Watched"
                          : progressPercent > 0
                          ? `Watched ${progressPercent.toFixed(0)}%`
                          : "Started"} */}
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteVideo(item.videoID)}
                        disabled={deletingId === item.videoID}
                        className="cursor-pointer inline-flex items-center gap-1 text-xs rounded-full px-3 py-1 border border-neutral-700 text-neutral-300 hover:bg-neutral-800 disabled:opacity-60"
                      >
                        <TrashIcon className="h-4 w-4" />
                        {deletingId === item.videoID ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
