"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ListBulletIcon,
  TrashIcon,
  PencilSquareIcon,
  LockClosedIcon,
  GlobeAltIcon,
  ClockIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../components/AuthProvider"; // ⬅️ adjust path

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type PlaylistInfo = {
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

type PlaylistVideo = {
  id: number;
  channel_id: number;
  videos_title: string;
  slug: string;
  description: string | null;
  thumbnail: string;
  url: string;
  uploadtime: string;
  duration: string | null;
  numOfViews: number;
  channel: string;
  channel_image: string | null;
};

type PlaylistResponse = {
  playlist: PlaylistInfo;
  videos: PlaylistVideo[];
  canModify: boolean;
};

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function abbreviateViews(v: string | number) {
  const num = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(num)) return "0";
  if (num < 1000) return `${num}`;
  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]}`;
}

function timeSince(dateStrOrUnix: string | number) {
  // Support both ISO string (created_at) and uploadtime (unix in seconds)
  let ts: number;
  if (typeof dateStrOrUnix === "string" && dateStrOrUnix.length <= 12) {
    // probably unix timestamp in seconds
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

function formatDuration(seconds: string | number | null) {
  if (!seconds) return "";
  const s = typeof seconds === "string" ? parseFloat(seconds) : seconds;
  if (!Number.isFinite(s)) return "";
  const date = new Date(s * 1000).toISOString();
  // HH:MM:SS
  if (date.substring(11, 13) === "00") {
    return date.substring(14, 19); // MM:SS
  }
  return date.substring(11, 19); // HH:MM:SS
}

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

// Skeleton loader
function PlaylistSkeleton() {
  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10 animate-pulse">
        <div className="h-6 w-32 bg-neutral-800 rounded mb-5" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-md bg-neutral-800" />
            <div className="space-y-2">
              <div className="h-5 w-48 bg-neutral-800 rounded" />
              <div className="h-4 w-32 bg-neutral-800 rounded" />
            </div>
          </div>
          <div className="h-9 w-28 bg-neutral-800 rounded-full" />
        </div>

        <div className="h-20 w-full bg-neutral-900 rounded-xl mb-6" />

        <div className="grid gap-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="w-full aspect-video bg-neutral-800 rounded-md" />
              <div className="mt-2 space-y-2">
                <div className="h-4 bg-neutral-800 rounded w-5/6" />
                <div className="h-3 bg-neutral-800 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}

export default function PlaylistPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<PlaylistResponse | null>(null);
  const [videos, setVideos] = useState<PlaylistVideo[]>([]);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editVisibility, setEditVisibility] = useState<"public" | "private">(
    "public"
  );

  const isLoggedIn = !!user && !!token;
  const playlistId = params.id;

  const videoCount = videos.length;

  const thumbnailSrc =
    data?.playlist.playlist_thumbnail ||
    videos[0]?.thumbnail ||
    "/images/channel/background.jpg";

  const isPublic = data?.playlist.visibility === "public";

  const totalViews = useMemo(
    () =>
      videos.reduce(
        (acc, v) => acc + (typeof v.numOfViews === "string" ? parseInt(v.numOfViews as any, 10) : v.numOfViews),
        0
      ),
    [videos]
  );

  async function getPlaylist() {
    if (!token || !playlistId) return;

    setLoading(true);
    setError(null);

    try {
      const req = await fetch(API_BASE + "playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ playlist: playlistId, token }),
      });

      const res = await req.json();

      if (!res.status) {
        setError("Unable to load this playlist.");
        setData(null);
        setVideos([]);
      } else {
        const payload: PlaylistResponse = res.data;
        setData(payload);
        setVideos(payload.videos || []);

        // prime edit fields
        setEditTitle(payload.playlist.playlist_title || "");
        setEditDescription(payload.playlist.playlist_description || "");
        setEditVisibility(
          (payload.playlist.visibility as "public" | "private") || "public"
        );
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while loading the playlist.");
      setData(null);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeletePlaylist() {
    if (!token || !playlistId) return;
    if (!confirm("Delete this playlist? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const req = await fetch(API_BASE + "user/playlist/delete", {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Request-Method": "POST",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ playlist: playlistId }),
      });

      await req.json(); // assuming success if no error
      router.replace("/playlists");
    } catch (err) {
      console.error(err);
      alert("Failed to delete playlist. Please try again.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleUpdatePlaylist() {
    if (!token || !playlistId) return;

    setSaving(true);
    try {
      const req = await fetch(API_BASE + "user/playlist/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          playlist: playlistId,
          token,
          title: editTitle,
          visibility: editVisibility,
          description: editDescription,
        }),
      });

      const res = await req.json();
      if (!res.status) {
        alert("Failed to update playlist.");
      } else {
        setIsEditing(false);
        await getPlaylist();
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong while updating the playlist.");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    getPlaylist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token, playlistId]);

  // Require sign-in (API always uses token)
  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
          <button
            type="button"
            className="mb-4 cursor-pointer inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <ListBulletIcon className="h-6 w-6" />
            Playlist
          </h1>
          <p className="text-neutral-400 text-sm mb-4">
            Sign in to view this playlist.
          </p>
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return <PlaylistSkeleton />;
  }

  if (!data) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
          <button
            type="button"
            className="mb-4 cursor-pointer inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white"
            onClick={() => router.back()}
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold mb-3 flex items-center gap-2">
            <ListBulletIcon className="h-6 w-6" />
            Playlist
          </h1>
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : (
            <p className="text-sm text-neutral-400">
              Playlist not found or unavailable.
            </p>
          )}
        </div>
      </main>
    );
  }

  const { playlist, canModify } = data;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-10 pb-10">
        {/* Back */}
        <button
          type="button"
          className="mb-4 cursor-pointer inline-flex items-center gap-1 text-sm text-neutral-300 hover:text-white"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back
        </button>

        {/* Header row */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 rounded-md overflow-hidden bg-neutral-900">
              <Image
                src={thumbnailSrc}
                alt={playlist.playlist_title}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-xl sm:text-2xl font-bold">
                  {playlist.playlist_title}
                </h1>
                <VisibilityBadge visibility={playlist.visibility} />
              </div>
              <p className="text-xs text-neutral-400">
                {videoCount} video{videoCount !== 1 ? "s" : ""} • Updated{" "}
                {timeSince(playlist.updated_at)}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            {canModify && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-neutral-700 px-3 py-1.5 text-xs font-semibold text-neutral-100 hover:bg-neutral-800"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDeletePlaylist}
                  disabled={deleting}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-full border border-red-500/70 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-600/20 disabled:opacity-60"
                >
                  <TrashIcon className="h-4 w-4" />
                  {deleting ? "Deleting…" : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Description card */}
        {playlist.playlist_description && (
          <div className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 text-sm text-neutral-200">
            {playlist.playlist_description}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Videos grid */}
        {videos.length === 0 ? (
          <div className="mt-6 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center text-sm text-neutral-300">
            This playlist has no videos yet.
          </div>
        ) : (
          <div className="grid gap-3 gap-y-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {videos.map((video) => {
              const durationText = formatDuration(video.duration);
              const videoHref = `/videos/watch/${video.id}/${playlistId}/${video.videos_title
                .replace(/[\s+-]/g, "-")
                .toLowerCase()}`;

              return (
                <Link
                  key={video.id}
                  href={videoHref}
                  className="flex flex-col group"
                >
                  <div className="relative w-full overflow-hidden rounded-md bg-neutral-900">
                    <div className="relative w-full aspect-video">
                      <Image
                        src={
                          video.thumbnail && video.thumbnail.trim() !== ""
                            ? video.thumbnail
                            : "/images/channel/background.jpg"
                        }
                        alt={video.videos_title}
                        fill
                        unoptimized
                        className="object-cover transition-transform duration-200 group-hover:scale-105"
                      />
                    </div>
                    {/* Duration pill */}
                    {durationText && (
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                        {durationText}
                      </span>
                    )}
                  </div>

                  <div className="mt-2 flex gap-2">
                    {/* Channel avatar */}
                    <div className="mt-1 h-8 w-8 min-w-[2rem] rounded-full overflow-hidden bg-neutral-800">
                      {video.channel_image ? (
                        <Image
                          src={video.channel_image}
                          alt={video.channel}
                          width={32}
                          unoptimized
                          height={32}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center text-[10px] font-semibold bg-neutral-700 text-white">
                          {video.channel
                            ?.split(" ")
                            .map((w) => w[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <h2 className="text-sm font-semibold leading-snug line-clamp-2 transition">
                        {video.videos_title}
                      </h2>
                      <p className="mt-0.5 text-[11px] text-neutral-400 line-clamp-2">
                        {truncate(video.description, 80)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1">
                          {abbreviateViews(video.numOfViews)} views • {timeSince(video.uploadtime)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 p-5">
            <h2 className="text-lg font-semibold mb-3">Edit playlist</h2>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">
                  Visibility
                </label>
                <div className="flex gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setEditVisibility("public")}
                    className={`flex-1 cursor-pointer rounded-md border px-3 py-2 font-semibold flex flex-col items-start gap-1 ${
                      editVisibility === "public"
                        ? "border-red-500 bg-red-500/10"
                        : "border-neutral-700 bg-neutral-900"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <GlobeAltIcon className="h-4 w-4" />
                      Public
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Anyone can view this playlist.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditVisibility("private")}
                    className={`flex-1 cursor-pointer rounded-md border px-3 py-2 font-semibold flex flex-col items-start gap-1 ${
                      editVisibility === "private"
                        ? "border-red-500 bg-red-500/10"
                        : "border-neutral-700 bg-neutral-900"
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      <LockClosedIcon className="h-4 w-4" />
                      Private
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Only you can view this playlist.
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-3 text-sm">
              <button
                type="button"
                className="cursor-pointer rounded-full border border-neutral-700 px-4 py-1.5 font-semibold text-neutral-200 hover:bg-neutral-800"
                onClick={() => setIsEditing(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="cursor-pointer rounded-full bg-white px-4 py-1.5 font-semibold text-black hover:bg-neutral-200 disabled:opacity-70"
                onClick={handleUpdatePlaylist}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
