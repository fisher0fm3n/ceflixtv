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
import { useAuth } from "../components/AuthProvider"; // ⬅️ adjust path if needed

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
  videos_payload: string | null; // comma-separated ids
  visibility: "public" | "private" | string;
  created_at: string;
  updated_at: string;
};

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function timeSince(dateStr: string) {
  const ts = new Date(dateStr).getTime();
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

function countVideos(payload: string | null): number {
  if (!payload) return 0;
  return payload
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean).length;
}

// Simple pill for public/private
function VisibilityBadge({ visibility }: { visibility: string }) {
  const isPublic = visibility === "public";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        isPublic
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40"
          : "bg-neutral-700/40 text-neutral-200 border border-neutral-500/40"
      }`}
    >
      {isPublic ? (
        <GlobeAltIcon className="h-3 w-3" />
      ) : (
        <LockClosedIcon className="h-3 w-3" />
      )}
      {isPublic ? "Public" : "Private"}
    </span>
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

  const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);

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
        // newest updated first
        data.sort(
          (a, b) =>
            new Date(b.updated_at).getTime() -
            new Date(a.updated_at).getTime()
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
    fetchPlaylists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  const filteredPlaylists = useMemo(() => {
    if (filter === "all") return playlists;
    return playlists.filter((p) => p.visibility === filter);
  }, [playlists, filter]);

  // Not signed in
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-3xl font-extrabold mb-3 flex items-center gap-2">
            Playlists
          </h1>
          <p className="text-neutral-400 text-sm mb-4">
            Sign in to view and manage your playlists.
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

  const total = playlists.length;
  const totalPublic = playlists.filter((p) => p.visibility === "public").length;
  const totalPrivate = playlists.filter(
    (p) => p.visibility === "private"
  ).length;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-2">
              Playlists
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              {total === 0
                ? "You haven’t created any playlists yet."
                : `${total} playlist${total !== 1 ? "s" : ""} • ${totalPublic} public • ${totalPrivate} private`}
            </p>
          </div>

          {/* Filter pills */}
          {total > 0 && (
            <div className="inline-flex rounded-full bg-neutral-900/70 p-1 text-xs">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`text-sm px-3 py-1 rounded-full font-semibold transition ${
                  filter === "all"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilter("public")}
                className={`text-sm px-3 py-1 rounded-full font-semibold transition ${
                  filter === "public"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Public
              </button>
              <button
                type="button"
                onClick={() => setFilter("private")}
                className={`text-sm px-3 py-1 rounded-full font-semibold transition ${
                  filter === "private"
                    ? "bg-white text-black"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                Private
              </button>
            </div>
          )}
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
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
        {!loading && playlists.length === 0 && !error && (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center">
            <p className="text-sm text-neutral-300">
              You haven&apos;t created any playlists yet.
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Create a playlist from a video&apos;s options menu to see it here.
            </p>
          </div>
        )}

        {/* Filter yields no results */}
        {!loading &&
          playlists.length > 0 &&
          filteredPlaylists.length === 0 && (
            <div className="mt-6 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center text-sm text-neutral-300">
              No {filter} playlists found.
            </div>
          )}

        {/* Playlists grid */}
        {!loading && filteredPlaylists.length > 0 && (
          <div className="grid gap-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filteredPlaylists.map((pl) => {
              const videoCount = countVideos(pl.videos_payload);

              // Choose thumbnail or subtle gradient
              const hasThumb = !!pl.playlist_thumbnail;
              const href = `/playlists/${pl.id}`; // ⬅️ adjust route if needed

              return (
                <Link
                  key={pl.id}
                  href={href}
                  className="flex flex-col group"
                >
                  {/* Thumbnail area */}
                  <div className="relative w-full overflow-hidden rounded-md bg-neutral-900">
                    <div className="relative w-full aspect-video">
                      {hasThumb ? (
                        <Image
                          src={pl.playlist_thumbnail!}
                          alt={pl.playlist_title}
                          fill
                          unoptimized
                          className="object-cover transition-transform duration-200 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-br from-neutral-800 via-neutral-900 to-black flex items-center justify-center">
                          <ListBulletIcon className="h-8 w-8 text-neutral-400" />
                        </div>
                      )}
                    </div>

                    {/* Top-left visibility */}
                    <div className="absolute left-1 top-1">
                      <VisibilityBadge visibility={pl.visibility} />
                    </div>

                    {/* Bottom overlay - videos count */}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 pb-1 pt-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-[11px]">
                      <span className="font-semibold flex items-center gap-1">
                        <ListBulletIcon className="h-3 w-3" />
                        {videoCount} video{videoCount !== 1 ? "s" : ""}
                      </span>
                      <span className="text-neutral-300">
                        {timeSince(pl.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Text content */}
                  <div className="mt-2">
                    <h2 className="text-md font-semibold leading-snug line-clamp-2 transition">
                      {pl.playlist_title}
                    </h2>
                    {pl.playlist_description && (
                      <p className="mt-1 text-[11px] text-neutral-400 line-clamp-2">
                        {truncate(pl.playlist_description, 90)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
