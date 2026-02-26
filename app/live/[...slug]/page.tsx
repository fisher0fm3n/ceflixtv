// app/live/[...slug]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";

const API_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type StreamMeta = {
  stream_title?: string;
  stream_description?: string;
};

function readAuthTokenFromLS(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("ceflix_auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.token ?? null;
  } catch {
    return null;
  }
}

export default function StreamPage() {
  const params = useParams<{ slug: string[] | string }>();
  const router = useRouter();
  const { token: authToken } = useAuth();

  // ✅ slug can be string | string[]
  const slugArray = useMemo(
    () => (Array.isArray(params.slug) ? params.slug : [params.slug]),
    [params.slug],
  );

  // ✅ your URL is /live/<stream_id>
  const stream_id = slugArray?.[0] ?? null;

  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState<StreamMeta | null>(null);
  const [offline, setOffline] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const refresh = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  useEffect(() => {
    if (!stream_id) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setOffline(false);
      setStream(null);
      setErrorMsg(null);

      // ✅ Use AuthProvider token if available, else fallback to localStorage
      const token = authToken ?? readAuthTokenFromLS();

      try {
        // If token is required and missing, send user to login (optional)
        // If you want guests to access live, remove this block.
        if (!token) {
          // comment this out if live should be public
          router.push(`/login?next=/live/${stream_id}`);
          return;
        }

        // 1) Validate user / stream access
        const authRes = await fetch("https://webapi.ceflix.org/api/user/stream", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": API_KEY,
          },
          body: JSON.stringify({ token }),
        });

        const authJson = await authRes.json().catch(() => null);

        if (!authRes.ok || !authJson?.status) {
          throw new Error(authJson?.message || "Stream unavailable");
        }

        // 2) Fetch stream metadata
        const metaRes = await fetch(
          "https://v6zxoqndtl.execute-api.us-east-1.amazonaws.com/prod/stream",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operation: "fetch_stream",
              stream_id,
            }),
          },
        );

        const metaJson = await metaRes.json().catch(() => null);

        // If offline, keep UI but allow iframe attempt if you prefer.
        if (!metaRes.ok || !metaJson?.data) {
          throw new Error("Stream offline");
        }

        if (!cancelled) {
          setStream(metaJson.data as StreamMeta);
          setOffline(false);
        }
      } catch (e: any) {
        if (!cancelled) {
          setOffline(true);
          setStream(null);
          setErrorMsg(e?.message || "Stream offline");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [stream_id, authToken, router]);

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-10">
      <div className="mx-auto max-w-[110rem] px-4 lg:px-6 pt-6">
        {/* Loading */}
        {loading && (
          <div className="w-full rounded-2xl border border-white/10 bg-neutral-900/40 p-6 animate-pulse">
            <div className="aspect-video w-full rounded-xl bg-black/60" />
            <div className="mt-4 h-6 w-2/3 rounded bg-white/10" />
            <div className="mt-2 h-4 w-1/2 rounded bg-white/10" />
          </div>
        )}

        {/* Offline */}
        {!loading && offline && (
          <div className="grid place-items-center rounded-2xl border border-white/10 bg-neutral-900/40 p-6">
            <div className="flex mx-auto min-h-full flex-1 flex-col justify-center items-center pt-8 pb-12 sm:px-6 lg:px-8">
              <img
                src="/images/emojis/sweat.png"
                alt="Stream offline"
                className="mx-auto mb-6 w-48"
              />

              <div className="sm:mx-auto text-center text-white mb-6">
                <h2 className="mx-4 text-4xl mb-1 font-semibold leading-9 tracking-tight">
                  This Stream is Offline
                </h2>
                <p className="py-3 text-neutral-200">
                  {errorMsg || "Please try refreshing or contact Ceflix Support"}
                </p>
              </div>

              <button
                type="button"
                onClick={refresh}
                className="cursor-pointer rounded-full bg-red-600 px-6 py-2 text-sm font-semibold text-white hover:bg-red-500"
              >
                Refresh
              </button>
            </div>
          </div>
        )}

        {/* Online */}
        {!loading && !offline && (
          <>
            <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg">
              <iframe
                src={`https://amediaingest.ceflix.org:5443/WebRTCAppEE/play.html?id=${stream_id}&playOrder=hls`}
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>

            <div className="mt-4 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                  {stream?.stream_title ?? "Live Stream"}
                </h1>

                {stream?.stream_description && (
                  <p className="mt-2 text-sm text-neutral-300 max-w-3xl">
                    {stream.stream_description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={refresh}
                className="cursor-pointer shrink-0 rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
              >
                Refresh
              </button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}