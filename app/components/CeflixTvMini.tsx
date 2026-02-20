"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { TvIcon, XMarkIcon } from "@heroicons/react/24/outline";

type PlyrReactModule = typeof import("plyr-react");

export default function CeflixTvMini({
  stateKey = "ceflix.tv.mini.state.v1", // 'open' | 'min'
}: {
  stateKey?: string;
}) {
  const src = useMemo(
    () => "https://wmoy83z4d2a7-hls-live.5centscdn.com/9634_push_5066_001/2146503b3b9298d00d082150a88a7327.sdp/live/9634_push_5066_001ceflixplay/chunks.m3u8",
    []
  );

  const plyrRef = useRef<any>(null);
  const hlsRef = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  const [PlyrCmp, setPlyrCmp] = useState<null | PlyrReactModule["default"]>(null);
  const [state, setState] = useState<"open" | "min">("open");

  // Mount + read saved state (browser only)
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(stateKey);
      setState(saved === "min" ? "min" : "open");
    } catch {
      setState("open");
    }
  }, [stateKey]);

  // Persist state
  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(stateKey, state);
    } catch {}
  }, [mounted, state, stateKey]);

  // Dynamically import plyr-react only on client (prevents SSR "document is not defined")
  useEffect(() => {
    if (!mounted) return;

    let cancelled = false;
    (async () => {
      try {
        const mod = await import("plyr-react");
        if (!cancelled) setPlyrCmp(() => mod.default);
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted]);

  // Attach/detach HLS based on open/min (robust: waits for Plyr media element)
  useEffect(() => {
    if (!mounted || !PlyrCmp) return;

    let raf = 0;
    let cancelled = false;

    const destroyHls = () => {
      try {
        hlsRef.current?.destroy?.();
      } catch {}
      hlsRef.current = null;
    };

    const getVideoEl = (): HTMLVideoElement | null => {
      const plyr = plyrRef.current?.plyr;
      const el = plyr?.media as HTMLVideoElement | undefined;
      return el && el.tagName === "VIDEO" ? el : null;
    };

    const autoplayMuted = async (videoEl: HTMLVideoElement) => {
      // These help autoplay on iOS/Safari
      try {
        videoEl.muted = true;
        videoEl.defaultMuted = true as any;
        (videoEl as any).playsInline = true;
        videoEl.setAttribute("playsinline", "true");
      } catch {}

      // Attempt autoplay (muted)
      try {
        await videoEl.play();
      } catch {
        // If blocked, user can hit play in controls
      }
    };

    const run = async () => {
      // minimized -> pause + detach
      if (state === "min") {
        const plyr = plyrRef.current?.plyr;
        try {
          (plyr as any)?.pause?.();
        } catch {}
        destroyHls();
        return;
      }

      // wait until Plyr created the <video>
      const videoEl = getVideoEl();
      if (!videoEl) {
        raf = requestAnimationFrame(() => {
          if (!cancelled) run();
        });
        return;
      }

      const plyr = plyrRef.current?.plyr;
      if (!plyr) return;

      // Start muted (autoplay-friendly)
      plyr.muted = true;

      // Avoid persisted 0-volume from past sessions
      try {
        localStorage.removeItem("plyr__volume");
      } catch {}

      // Give slider a sane starting point (still muted)
      plyr.volume = 0.6;

      // Attach HLS (dynamic import)
      try {
        const HlsMod = await import("hls.js");
        if (cancelled) return;

        const Hls = HlsMod.default;

        destroyHls();

        if (Hls?.isSupported?.()) {
          const hls = new Hls({
            lowLatencyMode: true,
            // Helps some streams start faster; safe defaults
            backBufferLength: 30,
          });
          hlsRef.current = hls;

          hls.loadSource(src);
          hls.attachMedia(videoEl);

          // Autoplay immediately when ready (muted)
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            autoplayMuted(videoEl);
          });

          // Also try again on level loaded (some manifests parse before media is ready)
          hls.on(Hls.Events.LEVEL_LOADED, () => {
            autoplayMuted(videoEl);
          });
        } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
          videoEl.src = src;
          autoplayMuted(videoEl);
        }
      } catch {
        // ignore
      }
    };

    run();

    return () => {
      cancelled = true;
      try {
        cancelAnimationFrame(raf);
      } catch {}
      destroyHls();
    };
  }, [mounted, PlyrCmp, state, src]);

  if (!mounted) return null;

  // Minimized bubble
  if (state === "min") {
    return (
      <button
        aria-label="Open Ceflix Tv"
        onClick={() => setState("open")}
        className="fixed z-[70] right-3 bottom-3 sm:right-6 sm:bottom-6
                   h-12 w-12 sm:h-14 sm:w-14 rounded-full
                   bg-[#e7000b]/80 backdrop-blur border border-white/10
                   shadow-2xl shadow-black/40 flex items-center justify-center
                   text-white/90 hover:bg-[#e7000b] cursor-pointer"
      >
        <TvIcon className="h-6 w-6 sm:h-7 sm:w-7" />
      </button>
    );
  }

  // Open player
  return (
    <>
      {/* Plyr CSS via CDN to avoid SSR/import-time issues */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/plyr@3/dist/plyr.css"
      />

      <div
        className="fixed z-[70] right-3 bottom-3 sm:right-6 sm:bottom-6"
        role="complementary"
        aria-label="Ceflix Tv"
      >
        <div className="w-[78vw] max-w-[360px] rounded-xl border border-white/10 bg-neutral-900/70 backdrop-blur shadow-2xl shadow-black/40 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-pink-500 animate-pulse" />
              <p className="text-xs font-semibold text-white/90">
                Ceflix Tv — Live
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Minimize Ceflix Tv"
                className="rounded-md p-1 cursor-pointer text-white/80 hover:bg-white/10"
                onClick={() => setState("min")}
                title="Minimize"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Player box (ensures proper height) */}
          <div className="relative aspect-video w-full">
            <div className="absolute inset-0 ceflix-tv">
              {PlyrCmp ? (
                <PlyrCmp
                  ref={plyrRef}
                  source={{}} // HLS attached manually
                  options={{
                    storage: { enabled: false },
                    autoplay: true,
                    muted: true,
                    // Smaller + more compact controls
                    controls: ["play", "mute", "volume", "fullscreen"],
                    hideControls: false,
                    clickToPlay: true,
                    fullscreen: { enabled: true, fallback: true, iosNative: true },
                    // reduces extra UI chrome
                    displayDuration: false,
                    tooltips: { controls: false, seek: false },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-white/70">
                  Loading player…
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Scoped styling (shorter control bar) */}
        <style>{`
          .ceflix-tv .plyr {
            width: 100%;
            height: 100%;
            --plyr-video-controls-background: rgba(12,12,12,.66);
            --plyr-control-spacing: 8px;
            --plyr-control-icon-size: 12px;
            --plyr-font-size-small: 11px;
          }

          .ceflix-tv .plyr__video-wrapper,
          .ceflix-tv video {
            width: 100%;
            height: 100%;
          }

          .ceflix-tv video {
            object-fit: cover;
          }

          /* Make the control bar shorter */
          .ceflix-tv .plyr__controls {
            padding: 6px 6px !important;
            min-height: 34px !important;
          }

          /* Shrink buttons and keep them tight */
          .ceflix-tv .plyr__controls .plyr__control {
            padding: 6px !important;
          }

          /* Make range inputs (volume) slimmer */
          .ceflix-tv .plyr__volume input[type='range'] {
            height: 4px !important;
          }

          /* If progress is ever added later, keep it slim */
          .ceflix-tv .plyr__progress input[type='range'] {
            height: 4px !important;
          }
        `}</style>
      </div>
    </>
  );
}
