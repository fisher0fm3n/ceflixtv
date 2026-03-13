"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { useAuth } from "@/app/components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type FeedVideo = {
  id: number;
  channel_id: number;
  videos_title: string;
  slug: string;
  description: string | null;
  thumbnail: string;
  uploadtime: string; // unix seconds string
  duration: string | null;
  numOfViews: number | string;
  numOfComments: number | string;
  channel: string;
  isVerified: "0" | "1" | string;

  // ✅ new for tabs
  isShort?: "yes" | "no" | string;

  // ✅ channel profile picture fields
  channel_image?: string | null;
  channel_prefix?: string | null;
  channel_file?: string | null;
};

type Meta = {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
};

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_850/";

// If URL already contains "cloudinary", leave it as is.
// Otherwise, prefix it with the Cloudinary fetch URL.
function withCloudinaryPrefix(src: string | null): string {
  if (!src) return "";
  if (
    src.toLowerCase().includes("cloudinary") ||
    src.toLowerCase().includes("cloudfront")
  )
    return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

function timeSince(unix: number | string) {
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

function durationFmt(seconds: number | string | null) {
  const s = typeof seconds === "string" ? parseFloat(seconds) : (seconds ?? 0);
  if (!Number.isFinite(s) || s <= 0) return "";
  const total = Math.floor(s);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function formatViews(v: number | string) {
  const n = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(n)) return "0 views";
  if (n < 1000) return `${n} views`;
  const units = ["K", "M", "B"];
  let u = -1;
  let x = n;
  while (x >= 1000 && u < units.length - 1) {
    x /= 1000;
    u++;
  }
  return `${x.toFixed(1).replace(/\.0$/, "")}${units[u]} views`;
}

function getChannelProfilePicture(v: FeedVideo): string {
  const direct = (v.channel_image ?? "").trim();
  if (direct) return direct;

  const prefix = (v.channel_prefix ?? "").trim();
  const file = (v.channel_file ?? "").trim();
  if (prefix && file) return `${prefix}${file}`;

  // fallback: keep it subtle (matches your design)
  return "https://ceflix.org/images/avatar.png";
}

export default function SubscriptionsFeedPage() {
  const { token, user } = useAuth();

  const [tab, setTab] = useState<"videos" | "shorts">("videos");

  const [items, setItems] = useState<FeedVideo[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);

  const [page, setPage] = useState(1);
  const PER_PAGE = 20;

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const inFlightRef = useRef(false);

  const hasMore = useMemo(() => {
    if (!meta) return true; // until first load
    return meta.current_page < meta.last_page;
  }, [meta]);

  const filterByTab = (list: FeedVideo[]) => {
    if (tab === "shorts") {
      return list.filter((v) => String(v.isShort).toLowerCase() === "yes");
    }
    // videos tab: everything else
    return list.filter((v) => String(v.isShort).toLowerCase() !== "yes");
  };

  const fetchPage = async (pageToLoad: number) => {
    if (!token) return { data: [] as FeedVideo[], meta: null as Meta | null };

    const res = await fetch(`${API_BASE}user/subscriptions/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({ token, page: pageToLoad, per_page: PER_PAGE }),
    });

    const data = await res.json().catch(() => null);

    if (!res.ok)
      throw new Error(data?.message || `Request failed (${res.status})`);
    if (!data?.status) throw new Error(data?.message || "Failed to load feed.");

    return {
      data: (Array.isArray(data.data) ? data.data : []) as FeedVideo[],
      meta: (data.meta ?? null) as Meta | null,
    };
  };

  // ✅ robust loadMore that won't loop when filtered results are empty
  const loadMore = async (opts?: { reset?: boolean }) => {
    if (!token) return;
    if (inFlightRef.current) return;

    // prevent infinite observer-trigger loops
    inFlightRef.current = true;

    const isReset = !!opts?.reset;

    if (isReset) {
      setLoading(true);
      setError(null);
      setItems([]);
      setMeta(null);
      setPage(1);
    } else {
      setLoadingMore(true);
      setError(null);
    }

    try {
      let nextPage = isReset ? 1 : page + 1;

      // If we already know there are no more pages, bail early
      if (!isReset && meta && nextPage > meta.last_page) return;

      // We may need to skip pages that have 0 matches for the selected tab.
      // Do a small bounded scan to avoid “stuck loop” when sentinel stays visible.
      const MAX_PAGE_SCAN = 4;

      let appendedAny = false;
      let latestMeta: Meta | null = meta;

      for (let i = 0; i < MAX_PAGE_SCAN; i++) {
        const { data, meta: m } = await fetchPage(nextPage);
        if (m) latestMeta = m;

        const filtered = filterByTab(data);

        if (filtered.length > 0) {
          setItems((prev) =>
            isReset && nextPage === 1 ? filtered : [...prev, ...filtered],
          );
          appendedAny = true;
        }

        // update meta as soon as we have it
        if (m) setMeta(m);

        // decide if we should stop scanning
        const lastPage = m?.last_page ?? latestMeta?.last_page ?? 1;
        if (nextPage >= lastPage) break;

        // If we appended something, stop scanning (user can scroll for next)
        if (appendedAny) break;

        // otherwise: try next page to find matching content for this tab
        nextPage += 1;
      }

      // update current page to whatever we ended on (even if appended nothing),
      // so we don’t re-request same page repeatedly.
      setPage((prev) => {
        if (isReset) return nextPage;
        return Math.max(prev, nextPage);
      });
    } catch (e: any) {
      setError(e?.message || "Network error loading feed.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
      inFlightRef.current = false;
    }
  };

  // initial load
  useEffect(() => {
    if (!token) return;
    void loadMore({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // reset on tab change
  useEffect(() => {
    if (!token) return;
    void loadMore({ reset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // infinite scroll observer
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    if (!token) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (loading || loadingMore) return;
        if (!hasMore) return;

        void loadMore();
      },
      { rootMargin: "400px" },
    );

    obs.observe(el);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, hasMore, loading, loadingMore, meta, page, tab]);

  const grouped = useMemo(() => items, [items]);

  if (!user || !token) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

        <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-20 lg:px-6">
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Subscriptions
            </h1>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in to see the latest videos from channels you follow.
            </p>

            <div className="mt-5">
              <Link
                href="/login"
                className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
              Subscriptions
            </h1>
            <p className="text-sm text-neutral-400 truncate">
              Latest {tab === "shorts" ? "shorts" : "videos"} from channels you
              follow.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {/* ✅ keep this button exactly as before */}
            <Link
              href="/subscriptions/channels"
              className="w-full sm:w-auto inline-flex justify-center rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
            >
              View followed channels
            </Link>

            <button
              type="button"
              onClick={() => loadMore({ reset: true })}
              disabled={loading}
              className={`w-full sm:w-auto inline-flex justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80 ${
                loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {/* ✅ Tabs (added, same styling language) */}
        <div className="mt-4 flex items-center gap-2">
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

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {/* Loading (initial) */}
        {loading && grouped.length === 0 && (
          <div className="mt-6 text-sm text-neutral-300 flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
            <span>Loading feed…</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && grouped.length === 0 && (
          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200 font-semibold">
              No {tab === "shorts" ? "shorts" : "videos"} yet.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Subscribe to channels to see their latest uploads here.
            </p>
            <Link
              href="/subscriptions/channels"
              className="inline-flex mt-4 rounded-full bg-white text-black px-5 py-2 text-xs font-semibold hover:bg-white/80"
            >
              Browse your subscriptions
            </Link>
          </div>
        )}

        {/* Feed grid */}
        {grouped.length > 0 && (
          <div className="mt-6 grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {grouped.map((v) => {
              const watchHref = `/videos/watch/${v.id}/${v.slug || ""}`.replace(
                /\/$/,
                "",
              );
              const dur = durationFmt(v.duration);
              const channelImg = getChannelProfilePicture(v);

              return (
                <Link
                  key={`${tab}-${v.id}`}
                  href={watchHref}
                  className="group min-w-0 rounded-lg border border-white/10 bg-neutral-900/40 hover:bg-neutral-900/60 transition overflow-hidden"
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-black">
                    <Image
                      src={withCloudinaryPrefix(v.thumbnail)}
                      alt={v.videos_title}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                    {dur && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-2 py-1 text-[11px] font-semibold">
                        {dur}
                      </span>
                    )}
                  </div>

                  {/* Body */}
                  <div className="p-4 min-w-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-9 w-9 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                        <Image
                          src={channelImg}
                          alt={v.channel}
                          fill
                          unoptimized
                          className="object-contain"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-400 truncate">
                          {v.channel}
                          {String(v.isVerified) === "1" ? " • Verified" : ""}
                        </p>
                        <p className="text-sm font-semibold leading-snug line-clamp-2 break-words">
                          {v.videos_title}
                        </p>
                      </div>
                    </div>

                    {/* ✅ description kept */}
                    {v.description ? (
                      <p className="mt-3 text-xs text-neutral-300 line-clamp-2 break-words">
                        {v.description}
                      </p>
                    ) : null}

                    {/* ✅ timeago kept */}
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-neutral-400">
                      {/* <span className="truncate">{formatViews(v.numOfViews)}</span> */}
                      <span className="flex-shrink-0">
                        {timeSince(v.uploadtime)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* ✅ Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-12" />

        {/* Loading more */}
        {loadingMore && (
          <div className="mt-2 text-sm text-neutral-300 flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
            <span>Loading more…</span>
          </div>
        )}

        {/* End */}
        {!loading &&
          !loadingMore &&
          meta &&
          meta.current_page >= meta.last_page &&
          grouped.length > 0 && (
            <div className="mt-6 text-center text-xs text-neutral-500">
              You’re all caught up.
            </div>
          )}
      </div>
    </div>
  );
}
