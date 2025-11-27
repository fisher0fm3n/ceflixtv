"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  HeartIcon,
  PlayCircleIcon,
  EyeIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider"; // ⬅️ adjust path if needed

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

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
  uploadtime: string; // unix seconds (string)
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

type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

function abbreviateViews(v: number | string) {
  const num = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(num)) return "0 views";
  if (num < 1000) return `${num} views`;
  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]} views`;
}

function durationLabel(seconds: string | number | null) {
  if (!seconds) return "";
  const s = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (!Number.isFinite(s)) return "";
  const val = new Date(s * 1000).toISOString();
  // if hours part is "00", show mm:ss
  if (val.substring(12, 13) === "0") {
    return val.substring(14, 19);
  } else {
    return val.substring(12, 19);
  }
}

function timeSinceUnix(unixStr: string) {
  const ts = parseInt(unixStr, 10) * 1000;
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
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} years ago`;
}

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

export default function LikedVideosPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [videos, setVideos] = useState<LikedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);

  // ⬇️ pagination state
  const [page, setPage] = useState(1);
  const perPage = 24;
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const isLoggedIn = !!user && !!token;

  const skeletonArray = useMemo(() => Array.from({ length: 8 }), []);

  async function fetchLikedVideos(pageToLoad = 1) {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
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
          page: pageToLoad,
          per_page: perPage,
        }),
      });

      const res = await req.json();

      if (!res.status) {
        setError("Unable to load your liked videos.");
        setVideos([]);
        setMeta(null);
        setHasMore(false);
      } else {
        const data: LikedVideo[] = res.data || [];

        // Sort newest likes first based on created_at (per page)
        data.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );

        setVideos(data);

        const m: PaginationMeta | undefined = res.meta;
        if (m) {
          setMeta(m);
          setPage(m.current_page);
          setHasMore(m.current_page < m.last_page);
        } else {
          // fallback if meta not present
          setMeta(null);
          setPage(pageToLoad);
          setHasMore(data.length === perPage);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching your liked videos.");
      setVideos([]);
      setMeta(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchLikedVideos(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  // If not signed in
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-3xl font-extrabold mb-3">Liked videos</h1>
          <p className="text-neutral-400 text-sm mb-4">
            Sign in to see videos you&apos;ve liked.
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

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              Liked videos
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              All the videos you have given a heart to.
            </p>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {skeletonArray.map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col animate-pulse"
              >
                <div className="w-full aspect-video bg-neutral-800 rounded-md" />
                <div className="mt-3 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-5/6" />
                  <div className="h-3 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && videos.length === 0 && !error && (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center">
            <p className="text-sm text-neutral-300">
              You haven&apos;t liked any videos yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Start exploring and tap the heart icon on videos you enjoy.
            </p>
          </div>
        )}

        {/* Videos grid */}
        {!loading && videos.length > 0 && (
          <>
            <div className="grid gap-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {videos.map((video) => {
                const watchHref = `/videos/watch/${video.id}/${video.videos_title
                  .replace(/[\s+-]/g, "-")
                  .toLowerCase()}`;

                return (
                  <div
                    key={video.id}
                    className="flex flex-col group"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-full overflow-hidden rounded-md bg-neutral-900">
                      <Link href={watchHref}>
                        <div className="relative w-full aspect-video">
                          <Image
                            src={video.thumbnail}
                            alt={video.videos_title}
                            fill
                            unoptimized
                            className="object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                        </div>
                      </Link>

                      {/* Duration */}
                      {video.duration && (
                        <span className="absolute bottom-1 right-1 rounded-[4px] bg-black/70 px-1.5 py-1 text-xs font-semibold text-white flex items-center gap-1">
                          {durationLabel(video.duration)}
                        </span>
                      )}
                    </div>

                    {/* Info */}
                    <div className="mt-2 flex flex-row gap-2">
                      {/* Channel avatar */}
                      <div className="mt-1">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-xs">
                          {video.channel_image ? (
                            <Image
                              src={video.channel_image}
                              alt={video.channel}
                              width={32}
                              height={32}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-neutral-300">
                              {video.channel?.charAt(0) || "C"}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <Link href={watchHref}>
                          <h2 className="text-sm font-semibold leading-snug line-clamp-2 transition">
                            {video.videos_title}
                          </h2>
                        </Link>
                        <div className="mt-1 text-xs text-neutral-400 space-y-[2px]">
                          <p className="truncate">
                            {video.channel || "Unknown channel"}
                          </p>
                          <p className="text-[11px] flex flex-wrap items-center gap-x-1 gap-y-0.5">
                            <span className="inline-flex items-center gap-1">
                              {abbreviateViews(video.numOfViews)}
                            </span>
                            <span>•</span>
                            <span>{timeSinceUnix(video.uploadtime)}</span>
                          </p>
                        </div>
                        {video.description && (
                          <p className="mt-1 text-[11px] text-neutral-500 line-clamp-2">
                            {truncate(video.description, 90)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination controls */}
            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => fetchLikedVideos(page - 1)}
                disabled={loading || page <= 1}
                className="rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-white disabled:bg-neutral-900 disabled:text-neutral-500 hover:bg-neutral-700 transition"
              >
                Previous
              </button>
              <span className="text-xs text-neutral-300">
                Page {page}
                {meta?.last_page ? ` of ${meta.last_page}` : null}
              </span>
              <button
                type="button"
                onClick={() => fetchLikedVideos(page + 1)}
                disabled={loading || !hasMore}
                className="rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-white disabled:bg-neutral-900 disabled:text-neutral-500 hover:bg-neutral-700 transition"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
