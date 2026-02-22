// app/stations/[[...slug]]/LiveStationsClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type Station = {
  id: number;
  name: string;
  desc: string;
  src: string;
  imgChannel: string;
};

type LiveStationsResponse = {
  status: boolean;
  data?: Station[];
};

function idFromSlug(slug?: string[] | string) {
  const arr = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const raw = arr[0];
  if (raw && /^\d+$/.test(raw)) return Number(raw);
  return null;
}

// --- URL helpers that do NOT trigger Next navigation ---
function setUrlStationId(id: number, mode: "push" | "replace" = "push") {
  const nextPath = `/stations/${id}`;
  if (typeof window === "undefined") return;

  if (mode === "replace") {
    window.history.replaceState({ liveStationId: id }, "", nextPath);
  } else {
    window.history.pushState({ liveStationId: id }, "", nextPath);
  }
}

function readIdFromPathname(): number | null {
  if (typeof window === "undefined") return null;
  // matches /live or /stations/:id/...
  const parts = window.location.pathname.split("/").filter(Boolean);
  const idx = parts.findIndex((p) => p === "live");
  const raw = idx >= 0 ? parts[idx + 1] : null;
  if (raw && /^\d+$/.test(raw)) return Number(raw);
  return null;
}

export default function LiveStationsClient() {
  const params = useParams<{ slug?: string[] }>();

  const urlIdFromParams = useMemo(() => idFromSlug(params?.slug), [params?.slug]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [stations, setStations] = useState<Station[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(urlIdFromParams);

  const currentStation = useMemo(() => {
    if (!stations.length) return null;
    const first = stations[0];
    if (currentId == null) return first;
    return stations.find((s) => s.id === currentId) ?? first;
  }, [stations, currentId]);

  // HLS playback
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<any | null>(null);

  async function getStations() {
    setLoading(true);
    setError(null);

    try {
      const req = await fetch(API_BASE + "livestations", {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Request-Method": "POST",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({}),
      });

      const res: LiveStationsResponse = await req.json();

      if (!res.status || !res.data || !Array.isArray(res.data) || !res.data.length) {
        setStations([]);
        setError("No live stations found.");
        return;
      }

      const list = res.data;
      setStations(list);

      // Determine starting id:
      // 1) URL param id if valid
      // 2) id from actual pathname (covers pushState changes)
      // 3) first station
      const pathId = readIdFromPathname();
      const first = list[0];

      const chosen =
        (urlIdFromParams != null && list.find((s) => s.id === urlIdFromParams)) ||
        (pathId != null && list.find((s) => s.id === pathId)) ||
        first;

      setCurrentId(chosen.id);

      // If URL had no id, normalize WITHOUT navigation
      if (urlIdFromParams == null && pathId == null) {
        setUrlStationId(chosen.id, "replace");
      }
    } catch (e) {
      console.error(e);
      setStations([]);
      setError("Something went wrong while loading live stations.");
    } finally {
      setLoading(false);
    }
  }

  // Fetch once on mount
  useEffect(() => {
    getStations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user lands directly on /stations/:id, sync state
  useEffect(() => {
    if (urlIdFromParams == null) return;
    if (urlIdFromParams !== currentId) setCurrentId(urlIdFromParams);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlIdFromParams]);

  // Handle browser back/forward when we use pushState
  useEffect(() => {
    const onPopState = () => {
      const id = readIdFromPathname();
      if (id != null) setCurrentId(id);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Attach stream to video when station changes (NO page reload)
  useEffect(() => {
    const station = currentStation;
    const videoEl = videoRef.current;
    if (!station || !videoEl) return;

    const src = station.src;

    // cleanup old HLS
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch {}
      hlsRef.current = null;
    }

    const isHls = src?.toLowerCase().includes(".m3u8");

    (async () => {
      // reset element
      try {
        videoEl.pause();
      } catch {}
      videoEl.removeAttribute("src");
      videoEl.load();

      if (isHls) {
        // Safari/iOS native HLS
        if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
          videoEl.src = src;
        } else {
          const mod = await import("hls.js");
          const Hls = mod.default;

          if (Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });
            hls.loadSource(src);
            hls.attachMedia(videoEl);
            hlsRef.current = hls;
          } else {
            videoEl.src = src;
          }
        }
      } else {
        videoEl.src = src;
      }

      // try autoplay
      try {
        await videoEl.play();
      } catch {
        // autoplay may be blocked
      }
    })();

    return () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {}
        hlsRef.current = null;
      }
    };
  }, [currentStation]);

  const handlePick = (s: Station) => {
    // 1) swap stream instantly
    setCurrentId(s.id);

    // 2) update URL without navigation / re-rendering the route
    setUrlStationId(s.id, "push");
  };

  if (loading && !stations.length) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white p-6">
        <div className="mx-auto max-w-6xl">
          <div className="h-6 w-60 bg-neutral-800/80 animate-pulse rounded mb-4" />
          <div className="w-full bg-black rounded-xl aspect-video overflow-hidden">
            <div className="w-full h-full bg-neutral-800/80 animate-pulse" />
          </div>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-neutral-800/80 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !currentStation) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
        <p className="text-neutral-200">{error ?? "Station not found."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
      <div className="mx-auto max-w-6xl px-4 lg:px-6 grid gap-6 lg:grid-cols-12">
        {/* Player */}
        <div className="lg:col-span-8">
          <div className="relative w-full bg-black rounded-xl aspect-video overflow-hidden">
            <video
              ref={videoRef}
              controls
              playsInline
              autoPlay
              muted
              className="w-full h-full object-contain bg-black"
              poster={currentStation.imgChannel || undefined}
            />
          </div>

          <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
            {currentStation.name}
          </h1>

          {currentStation.desc?.trim() ? (
            <p className="mt-2 text-sm text-neutral-300 whitespace-pre-line">
              {currentStation.desc}
            </p>
          ) : (
            <p className="mt-2 text-sm text-neutral-500">No description available.</p>
          )}
        </div>

        {/* Station list */}
        <aside className="lg:col-span-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-neutral-200">Live stations</h2>
            {loading && <span className="text-xs text-neutral-500">Refreshing…</span>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
            {stations.map((s) => {
              const active = s.id === currentStation.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handlePick(s)}
                  className={`w-full text-left flex items-center gap-3 rounded-xl p-3 border transition ${
                    active
                      ? "border-white/30 bg-white/5"
                      : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-neutral-900 flex-shrink-0">
                    <img
                      src={s.imgChannel}
                      alt={s.name}
                      fill
                      unoptimized
                      className="object-contain"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold line-clamp-1">{s.name}</p>
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {active ? "Now playing" : ""}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}
