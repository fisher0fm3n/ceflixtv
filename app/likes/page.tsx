"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

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

type PaginationMeta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
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

  const [loading, setLoading] = useState(true);
  const [allVideos, setAllVideos] = useState<LikedVideo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const perPage = 24;
  const [meta, setMeta] = useState<PaginationMeta | null>(null);

  const isLoggedIn = !!user && !!token;
  const skeletonArray = useMemo(() => Array.from({ length: 8 }), []);

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
          per_page: perPage,
        }),
      });

      const firstRes = await firstReq.json();

      if (!firstRes.status) {
        setError("Unable to load your liked videos.");
        setAllVideos([]);
        setMeta(null);
        return;
      }

      const firstPageData: LikedVideo[] = firstRes.data || [];
      const firstMeta: PaginationMeta | null = firstRes.meta ?? null;

      let combined = [...firstPageData];

      const lastPage = firstMeta?.last_page ?? 1;

      if (lastPage > 1) {
        const rest = await Promise.all(
          Array.from({ length: lastPage - 1 }, (_, i) => i + 2).map(
            async (p) => {
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
                  per_page: perPage,
                }),
              });

              const res = await req.json();
              return (res?.status ? res.data || [] : []) as LikedVideo[];
            },
          ),
        );

        combined = [...combined, ...rest.flat()];
      }

      combined.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );

      setAllVideos(combined);

      const total = combined.length;
      const last_page = Math.max(1, Math.ceil(total / perPage));

      setMeta({
        current_page: page,
        per_page: perPage,
        total,
        last_page,
      });
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching your liked videos.");
      setAllVideos([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchLikedVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  const videos = useMemo(() => {
    const start = (page - 1) * perPage;
    return allVideos.slice(start, start + perPage);
  }, [allVideos, page, perPage]);

  const hasMore = meta ? page < meta.last_page : false;

  useEffect(() => {
    if (!meta) return;
    setMeta((prev) =>
      prev
        ? {
            ...prev,
            current_page: page,
          }
        : prev,
    );
  }, [page]);

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
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">Liked videos</h1>
            <p className="text-sm text-neutral-400 mt-1">
              All the videos you have given a heart to.
            </p>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {loading && (
          <div className="grid gap-3 gap-y-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {skeletonArray.map((_, idx) => (
              <div key={idx} className="flex flex-col animate-pulse">
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

        {!loading && videos.length > 0 && (
          <>
            <div className="grid gap-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {videos.map((video) => {
                const slug = encodeURIComponent(
                  video.videos_title
                    .trim()
                    .replace(/\s+/g, "-")
                    .replace(/-+/g, "-")
                    .toLowerCase(),
                );

                const watchHref = `/videos/watch/${video.id}/${slug}`;

                return (
                  <div key={video.id} className="flex flex-col group">
                    <div className="relative w-full overflow-hidden rounded-md bg-neutral-900">
                      <Link href={watchHref}>
                        <div className="relative w-full aspect-video">
                          <img
                            src={video.thumbnail}
                            alt={video.videos_title}
                            className="object-contain h-full w-full m-auto transition-transform duration-200 group-hover:scale-105"
                          />
                        </div>
                      </Link>

                      {video.duration && (
                        <span className="absolute bottom-1 right-1 rounded-[4px] bg-black/70 px-1.5 py-1 text-xs font-semibold text-white">
                          {durationLabel(video.duration)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex flex-row gap-2">
                      <div className="mt-1">
                        <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-800 flex items-center justify-center text-xs">
                          {video.channel_image ? (
                            <img
                              src={video.channel_image}
                              alt={video.channel}
                              width={32}
                              height={32}
                              className="h-full w-full object-contain"
                            />
                          ) : (
                            <span className="text-neutral-300">
                              {video.channel?.charAt(0) || "C"}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <Link href={watchHref}>
                          <h2 className="text-sm font-semibold leading-snug line-clamp-2">
                            {video.videos_title}
                          </h2>
                        </Link>
                        <div className="mt-1 text-xs text-neutral-400 space-y-[2px]">
                          <p className="truncate">
                            {video.channel || "Unknown channel"}
                          </p>
                          <p className="text-[11px]">
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

            <div className="mt-8 flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || page <= 1}
                className="cursor-pointer rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-white disabled:bg-neutral-900 disabled:text-neutral-500 hover:bg-neutral-700 transition"
              >
                Previous
              </button>
              <span className="text-xs text-neutral-300">
                Page {page}
                {meta?.last_page ? ` of ${meta.last_page}` : null}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((p) => Math.min(meta?.last_page || p, p + 1))
                }
                disabled={loading || !hasMore}
                className="cursor-pointer rounded-full bg-neutral-800 px-4 py-2 text-xs font-semibold text-white disabled:bg-neutral-900 disabled:text-neutral-500 hover:bg-neutral-700 transition"
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
