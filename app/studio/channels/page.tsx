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
import { useAuth } from "../../components/AuthProvider";

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
  url: string;
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
  const skeletonArray = useMemo(() => Array.from({ length: 4 }), []);

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
        list.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
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
    void fetchUserChannels();
  }, [isLoggedIn, token]);

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

        <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-20 lg:px-6">
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Channels
            </h1>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in to view and manage your channels.
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
              Your Channels
            </h1>
            <p className="text-sm text-neutral-400 truncate">
              Create, view and edit the channels linked to your account.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => router.push("/studio/channels/create")}
              className="w-full sm:w-auto inline-flex justify-center items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80 cursor-pointer"
            >
              <PlusCircleIcon className="h-4 w-4" />
              New channel
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading && (
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
                      <div className="h-10 w-10 rounded-full bg-neutral-800" />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="h-4 w-40 rounded bg-neutral-800" />
                        <div className="h-3 w-28 rounded bg-neutral-800" />
                      </div>
                    </div>
                    <div className="h-3 w-3/4 rounded bg-neutral-800" />
                    <div className="h-3 w-1/2 rounded bg-neutral-800" />
                    <div className="flex gap-2">
                      <div className="h-8 w-24 rounded-full bg-neutral-800" />
                      <div className="h-8 w-24 rounded-full bg-neutral-800" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && channels.length === 0 && !error && (
          <div className="mt-10 rounded-xl border border-white/10 bg-neutral-900/40 p-6">
            <p className="text-sm text-neutral-200 font-semibold">
              No channels yet.
            </p>
            <p className="mt-1 text-sm text-neutral-400">
              Create your first channel to start uploading and organizing your content.
            </p>
            <button
              type="button"
              onClick={() => router.push("/studio/channels/create")}
              className="inline-flex mt-4 items-center gap-2 rounded-full bg-white text-black px-5 py-2 text-xs font-semibold hover:bg-white/80 cursor-pointer"
            >
              <PlusCircleIcon className="h-4 w-4" />
              Create your first channel
            </button>
          </div>
        )}

        {!loading && channels.length > 0 && (
          <div className="mt-6 space-y-4">
            {channels.map((ch) => (
              <div
                key={ch.id}
                className="group rounded-lg border border-white/10 bg-neutral-900/40 hover:bg-neutral-900/60 transition p-3 sm:p-4"
              >
                <div className="flex flex-col sm:flex-row gap-4">
                  <Link
                    href={`/channel/${ch.id}`}
                    className="block w-full sm:w-56 md:w-64 flex-shrink-0"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-md bg-black">
                      <Image
                        src={ch.cover || ch.url}
                        alt={ch.channel}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 min-w-0">
                          <Link
                            href={`/channel/${ch.id}`}
                            className="relative h-10 w-10 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0"
                          >
                            <Image
                              src={ch.url}
                              alt={ch.channel}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <Link
                                href={`/channel/${ch.id}`}
                                className="text-sm sm:text-lg font-semibold leading-snug hover:text-neutral-200"
                              >
                                {ch.channel}
                              </Link>

                              {ch.isVerified === "1" && (
                                <span className="text-[10px] uppercase tracking-wide text-blue-400 border border-blue-400/40 rounded px-1 py-[1px]">
                                  Verified
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
                              <span>{abbreviateViews(ch.total_views)}</span>
                              <span>•</span>
                              <span>Created {formatDate(ch.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <p className="mt-3 text-xs sm:text-sm text-neutral-300 line-clamp-2 break-words">
                          {ch.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <Link
                            href={`/channel/${ch.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                          >
                            <EyeIcon className="h-4 w-4" />
                            View channel
                          </Link>

                          <Link
                            href={`/studio/channels/edit/${ch.id}`}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80"
                          >
                            <PencilIcon className="h-4 w-4" />
                            Edit channel
                          </Link>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setConfirmChannel(ch)}
                        className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-neutral-900/60 px-3 py-1.5 text-[11px] font-semibold text-neutral-200 hover:bg-neutral-800 cursor-pointer flex-shrink-0"
                        disabled={deletingId === ch.id}
                        aria-label="Delete channel"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
                className="cursor-pointer rounded-full bg-white px-4 py-1.5 font-semibold text-black hover:bg-white/80 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deletingId === confirmChannel.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}