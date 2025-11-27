"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PencilIcon,
  EyeIcon,
  PlusCircleIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider"; // ⬅️ adjust path if needed

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type UserChannel = {
  id: number;
  channel: string;
  slug: string;
  cat_id: number;
  description: string;
  tags: string | null;
  filename: string;
  url: string; // avatar/thumb
  cover: string;
  featured: number;
  active: number;
  email: string;
  position: number;
  urlprefix: string;
  total_comments: string;
  total_views: string;
  hidden: string;
  channelType: number;
  isVerified: string;
  userID: string;
  is_monetized: string;
  wallet_address: string | null;
  created_at: string;
  updated_at: string;
  verifiedPos: number;
  is_ticket_eligible: string;
};

export default function UserChannelsPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [channels, setChannels] = useState<UserChannel[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [confirmChannel, setConfirmChannel] = useState<UserChannel | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const isLoggedIn = !!user && !!token;

  const skeletonArray = useMemo(() => Array.from({ length: 3 }), []);

  function abbreviateViews(v: string) {
    const num = parseInt(v, 10);
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

  function formatDate(dateString: string) {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async function fetchUserChannels() {
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const req = await fetch(API_BASE + "user/channels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ token }),
      });

      const res = await req.json();

      if (!res.status) {
        setError("Unable to load your channels.");
        setChannels([]);
      } else {
        const list: UserChannel[] = res.data || [];
        // Sort by created_at (newest first)
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        setChannels(list);
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong while fetching your channels.");
      setChannels([]);
    } finally {
      setLoading(false);
    }
  }

  // --- DELETE CHANNEL API (using API_BASE & APP_KEY, no browser alert) ---
  async function deleteChannel(channelId: number) {
    if (!token) {
      setError("You must be logged in to delete a channel.");
      return false;
    }

    try {
      const req = await fetch(API_BASE + "channel/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          channel_id: channelId,
          token,
        }),
      });

      const res = await req.json().catch(() => null);

      if (req.ok && res?.status) {
        // remove deleted channel from state
        setChannels((prev) => prev.filter((ch) => ch.id !== channelId));
        return true;
      }

      console.error("Delete channel API failed:", res);
      setError("Failed to delete channel. Please try again.");
      return false;
    } catch (err) {
      console.error("Error calling delete channel API:", err);
      setError("Something went wrong. Please try again.");
      return false;
    }
  }

  async function handleConfirmDelete() {
    if (!confirmChannel) return;

    setDeletingId(confirmChannel.id);
    const ok = await deleteChannel(confirmChannel.id);
    setDeletingId(null);

    if (ok) {
      setConfirmChannel(null);
    }
  }

  function handleCancelDelete() {
    if (deletingId !== null && confirmChannel?.id === deletingId) return;
    setConfirmChannel(null);
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    fetchUserChannels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-2xl font-bold mb-4">Your channels</h1>
          <p className="text-neutral-400 text-sm mb-4">
            Sign in to manage channels you&apos;ve created.
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold">Your channels</h1>
            <p className="text-md text-neutral-400 mt-1">
              Create, view and edit the channels linked to your account.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/studio/channels/create")}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 transition"
          >
            <PlusCircleIcon className="h-4 w-4" />
            New channel
          </button>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400">
            {error}
          </p>
        )}

        {/* Skeleton state */}
        {loading && (
          <div className="space-y-4">
            {skeletonArray.map((_, idx) => (
              <div
                key={idx}
                className="flex gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 animate-pulse"
              >
                <div className="w-24 h-24 rounded-lg bg-neutral-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-1/2" />
                  <div className="h-3 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/3" />
                  <div className="h-8 bg-neutral-800 rounded w-32" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && channels.length === 0 && !error && (
          <div className="mt-4 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center">
            <p className="text-sm text-neutral-300">
              You haven&apos;t created any channels yet.
            </p>
            <button
              type="button"
              onClick={() => router.push("/studio/channels/create")}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-neutral-200 transition"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Create your first channel
            </button>
          </div>
        )}

        {!loading && channels.length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="relative flex flex-col gap-4 p-4 rounded-xl bg-neutral-900/60 border border-neutral-800"
              >
                {/* Trash icon top-right */}
                <button
                  type="button"
                  onClick={() => setConfirmChannel(ch)}
                  className="absolute z-50 top-6 right-6 inline-flex items-center justify-center rounded-full bg-neutral-900/80 hover:bg-red-600/20 border border-neutral-700 hover:border-red-500/70 p-1.5 transition cursor-pointer"
                  disabled={deletingId === ch.id}
                  aria-label="Delete channel"
                >
                  <TrashIcon className="h-4 w-4 text-neutral-300 hover:text-red-400" />
                </button>

                {/* Cover / avatar */}
                <div className="relative sm:w-full">
                  <div className="relative w-full aspect-[16/9] rounded-lg overflow-hidden bg-neutral-800">
                    <Image
                      src={ch.cover || ch.url}
                      alt={ch.channel}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="absolute -bottom-4 left-4">
                    <div className="h-18 w-18 rounded-full border-2 border-neutral-950 overflow-hidden bg-neutral-800">
                      <Image
                        src={ch.url}
                        alt={ch.channel}
                        width={48}
                        height={48}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 pt-4 sm:pt-0 sm:pl-4 flex flex-col justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Link
                        href={`/channel/${ch.id}`}
                        className="text-base sm:text-lg font-semibold hover:text-red-500 transition"
                      >
                        {ch.channel}
                      </Link>
                      {ch.isVerified === "1" && (
                        <span className="text-xs uppercase tracking-wide text-blue-400 border border-blue-400/40 rounded px-1 py-[1px]">
                          Verified
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-neutral-400 line-clamp-2">
                      {ch.description}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                      <span className="inline-flex items-center gap-1">
                        <EyeIcon className="h-3.5 w-3.5" />
                        {abbreviateViews(ch.total_views)}
                      </span>
                      <span>•</span>
                      <span>Created {formatDate(ch.created_at)}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-2">
                    <Link
                      href={`/channel/${ch.id}`}
                      className="w-full text-sm inline-flex items-center justify-center gap-2 rounded-full border border-neutral-700 px-4 py-1.5 font-medium text-neutral-200 hover:bg-neutral-800 transition"
                    >
                      <EyeIcon className="h-4 w-4" />
                      View channel
                    </Link>
                    <Link
                      href={`/studio/channels/edit/${ch.id}`}
                      className="w-full text-sm inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-1.5 font-semibold text-black hover:bg-neutral-200 transition"
                    >
                      <PencilIcon className="h-4 w-4" />
                      Edit channel
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmChannel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-neutral-950 border border-neutral-800 p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Delete channel?</h2>
            <p className="mt-2 text-sm text-neutral-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold">&quot;{confirmChannel.channel}&quot;</span>?
              This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3 text-sm">
              <button
                type="button"
                onClick={handleCancelDelete}
                disabled={deletingId === confirmChannel.id}
                className="cursor-pointer rounded-full border border-neutral-700 px-4 py-1.5 font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deletingId === confirmChannel.id}
                className="cursor-pointer rounded-full bg-white px-4 py-1.5 font-semibold text-black hover:bg-neutral-200 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingId === confirmChannel.id ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
