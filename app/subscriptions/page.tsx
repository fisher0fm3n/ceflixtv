"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/components/AuthProvider"; // adjust if your path differs
import { CheckBadgeIcon } from "@heroicons/react/24/solid";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type Subscription = {
  id: number;
  channel: string;
  slug: string;
  description: string | null;
  filename: string | null;
  url: string | null;
  cover: string | null;
  urlprefix: string | null;
  total_views?: string | number | null;
  total_comments?: string | number | null;
  isVerified?: "0" | "1" | string | null;
};

const DEFAULT_AVATAR = "https://ceflix.org/images/avatar.png";

function channelThumb(sub: Subscription) {
  // Prefer `url` if present, else urlprefix + filename, else fallback
  if (sub.url && sub.url.trim()) return sub.url;
  if (sub.urlprefix && sub.filename) return `${sub.urlprefix}${sub.filename}`;
  return DEFAULT_AVATAR;
}

export default function SubscriptionsPage() {
  const { token, user } = useAuth();

  const [items, setItems] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((x) => {
      return (
        (x.channel || "").toLowerCase().includes(s) ||
        (x.description || "").toLowerCase().includes(s)
      );
    });
  }, [items, q]);

  const fetchSubs = async () => {
    if (!token) {
      setLoading(false);
      setItems([]);
      setErr("Please sign in to view your subscriptions.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch(`${API_BASE}user/subscriptions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }

      if (!data?.status || !Array.isArray(data.data)) {
        setItems([]);
        setErr(data?.message || "Failed to load subscriptions.");
        return;
      }

      setItems(data.data as Subscription[]);
    } catch (e: any) {
      setErr(e?.message || "Network error loading subscriptions.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white overflow-x-hidden">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">
              Subscriptions
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              {user ? "Channels you’ve subscribed to." : "Sign in to continue."}
            </p>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search subscriptions…"
              className="w-full rounded-full bg-neutral-900 border border-neutral-800 px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
            />

            <button
              type="button"
              onClick={fetchSubs}
              disabled={loading}
              className={`w-full sm:w-auto cursor-pointer rounded-full px-4 py-2 text-xs font-semibold border border-white/10 bg-neutral-900/60 hover:bg-neutral-800 ${
                loading ? "opacity-70 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>

        {err && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {err}
          </div>
        )}

        {loading ? (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse rounded-2xl border border-white/10 bg-neutral-900/50 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-neutral-800" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-neutral-800" />
                    <div className="h-3 w-1/2 rounded bg-neutral-800" />
                  </div>
                </div>
                <div className="mt-3 h-3 w-full rounded bg-neutral-800" />
                <div className="mt-2 h-3 w-5/6 rounded bg-neutral-800" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="mt-10 text-center text-sm text-neutral-400">
            {q.trim()
              ? "No subscriptions match your search."
              : "You have no subscriptions yet."}
          </div>
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((sub) => (
              <Link
                key={sub.id}
                href={`/channel/${sub.id}`}
                className="group min-w-0 rounded-2xl border border-white/10 bg-neutral-900/50 p-4 hover:bg-neutral-900"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-neutral-800">
                    <Image
                      src={channelThumb(sub)}
                      alt={sub.channel}
                      fill
                      unoptimized
                      className="object-cover"
                      onError={(e) => {
                        const img =
                          e.currentTarget as unknown as HTMLImageElement;
                        if (img.src !== DEFAULT_AVATAR)
                          img.src = DEFAULT_AVATAR;
                      }}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">
                        {sub.channel}
                      </p>
                      {String(sub.isVerified) === "1" && (
                        <CheckBadgeIcon className="h-4 w-4 text-blue-400" />
                      )}
                    </div>

                    {/* <p className="truncate text-xs text-neutral-400">
                      {sub.total_views != null
                        ? `${sub.total_views} views`
                        : " "}
                      {sub.total_comments != null
                        ? ` • ${sub.total_comments} comments`
                        : ""}
                    </p> */}
                  </div>
                </div>

                {sub.description && (
                  <p className="mt-3 text-xs text-neutral-300 line-clamp-2 break-words">
                    {sub.description}
                  </p>
                )}

                <div className="mt-3 text-xs font-semibold text-neutral-200 group-hover:text-white">
                  View channel →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
