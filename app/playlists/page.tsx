"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ListBulletIcon,
  LockClosedIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type Playlist = {
  id: number;
  userID: number;
  channel_id: number | null;
  playlist_title: string;
  playlist_description: string | null;
  playlist_thumbnail: string | null;
  playlist_tags: string | null;
  videos_payload: string | null;
  visibility: "public" | "private" | string;
  created_at: string;
  updated_at: string;
};

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function timeSince(dateStrOrUnix: string | number) {
  let ts: number;

  if (typeof dateStrOrUnix === "string" && dateStrOrUnix.length <= 12) {
    const unix = parseInt(dateStrOrUnix, 10);
    ts = unix * 1000;
  } else if (typeof dateStrOrUnix === "number") {
    ts = dateStrOrUnix * 1000;
  } else {
    ts = new Date(dateStrOrUnix).getTime();
  }

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

function countVideos(payload: string | null): number {
  if (!payload) return 0;
  return payload
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

function visibilityText(visibility: string) {
  return visibility === "public" ? "Public" : "Private";
}

function VisibilityIcon({ visibility }: { visibility: string }) {
  const isPublic = visibility === "public";
  return isPublic ? (
    <GlobeAltIcon className="h-3.5 w-3.5" />
  ) : (
    <LockClosedIcon className="h-3.5 w-3.5" />
  );
}

function PlaylistThumb({
  title,
  thumbnail,
  videoCount,
}: {
  title: string;
  thumbnail: string | null;
  videoCount: number;
}) {
  const hasThumb = !!thumbnail;

  return (
    <div className="relative">
      {/* stacked layers like YouTube playlists */}
      <div className="absolute inset-x-3 -top-2 h-full rounded-xl bg-neutral-700/70" />
      <div className="absolute inset-x-1.5 -top-1 h-full rounded-xl bg-neutral-600/60" />

      <div className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900">
        {hasThumb ? (
          <Image
            src={thumbnail!}
            alt={title}
            fill
            unoptimized
            className="object-cover transition-transform duration-200 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-neutral-800 via-neutral-900 to-black">
            <ListBulletIcon className="h-8 w-8 text-neutral-400" />
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-end px-3 pb-2 pt-6 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
          <span className="inline-flex items-center gap-1 rounded-md bg-black/55 px-2 py-1 text-[11px] font-semibold text-white">
            <ListBulletIcon className="h-3 w-3" />
            {videoCount} video{videoCount !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PlaylistsPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "public" | "private">("all");

  const isLoggedIn = !!user && !!token;
  const skeletonArray = useMemo(() => Array.from({ length: 8 }), []);

  async function fetchPlaylists() {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const req = await fetch(API_BASE + "user/playlists", {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Request-Method": "POST",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
      });

      const res = await req.json();

      if (!res.status) {
        setError("Unable to load your playlists.");
        setPlaylists([]);
      } else {
        const data: Playlist[] = res.data || [];
        data.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime(),
        );
        setPlaylists(data);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching your playlists.");
      setPlaylists([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    void fetchPlaylists();
  }, [isLoggedIn, token]);

  const filteredPlaylists = useMemo(() => {
    if (filter === "all") return playlists;
    return playlists.filter((p) => p.visibility === filter);
  }, [playlists, filter]);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

        <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-20 lg:px-6">
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Playlists
            </h1>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in to view and manage your playlists.
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

  const total = playlists.length;
  const totalPublic = playlists.filter((p) => p.visibility === "public").length;
  const totalPrivate = playlists.filter((p) => p.visibility === "private").length;

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight truncate">
              Playlists
            </h1>
            <p className="text-sm text-neutral-400 truncate">
              {total === 0
                ? "You haven’t created any playlists yet."
                : `${total} playlist${total !== 1 ? "s" : ""} • ${totalPublic} public • ${totalPrivate} private`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => fetchPlaylists()}
              disabled={loading}
              className={`w-full sm:w-auto inline-flex justify-center rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80 ${
                loading ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {total > 0 && (
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
                filter === "all"
                  ? "bg-white text-black"
                  : "border border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilter("public")}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
                filter === "public"
                  ? "bg-white text-black"
                  : "border border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              Public
            </button>
            <button
              type="button"
              onClick={() => setFilter("private")}
              className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
                filter === "private"
                  ? "bg-white text-black"
                  : "border border-white/10 bg-neutral-900/60 text-neutral-200 hover:bg-neutral-800"
              }`}
            >
              Private
            </button>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {skeletonArray.map((_, idx) => (
              <div key={idx}>
                <div className="relative">
                  <div className="absolute inset-x-3 -top-2 h-full rounded-xl bg-neutral-700/50 animate-pulse" />
                  <div className="absolute inset-x-1.5 -top-1 h-full rounded-xl bg-neutral-600/40 animate-pulse" />
                  <div className="relative aspect-video rounded-xl bg-neutral-800 animate-pulse" />
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-neutral-800 animate-pulse" />
                  <div className="h-3 w-2/3 rounded bg-neutral-800 animate-pulse" />
                  <div className="h-3 w-1/2 rounded bg-neutral-800 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && playlists.length === 0 && !error && (
          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200 font-semibold">
              No playlists yet.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Create a playlist from a video&apos;s options menu to see it here.
            </p>
          </div>
        )}

        {!loading && playlists.length > 0 && filteredPlaylists.length === 0 && (
          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200 font-semibold">
              No {filter} playlists found.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Try switching filters to view your other playlists.
            </p>
          </div>
        )}

        {!loading && filteredPlaylists.length > 0 && (
          <div className="mt-6 grid gap-x-4 gap-y-12 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredPlaylists.map((pl) => {
              const videoCount = countVideos(pl.videos_payload);
              const href = `/playlists/${pl.id}`;

              return (
                <Link key={pl.id} href={href} className="group block min-w-0">
                  <PlaylistThumb
                    title={pl.playlist_title}
                    thumbnail={pl.playlist_thumbnail}
                    videoCount={videoCount}
                  />

                  <div className="mt-3 px-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-base font-semibold leading-snug line-clamp-2 break-words">
                          {pl.playlist_title}
                        </h2>
                      </div>
                    </div>

                    <div className="mt-1 text-sm text-neutral-400 space-y-0.5">
                      <p className="flex items-center gap-1.5">
                        <VisibilityIcon visibility={pl.visibility} />
                        <span>
                          {visibilityText(pl.visibility)} • Playlist
                        </span>
                      </p>
                      <p className="truncate font-bold">View full playlist</p>
                    </div>

                    {pl.playlist_description ? (
                      <p className="mt-2 text-xs text-neutral-500 line-clamp-2 break-words">
                        {truncate(pl.playlist_description, 100)}
                      </p>
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}