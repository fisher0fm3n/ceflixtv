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
    () =>
      "https://wmoy83z4d2a7-hls-live.5centscdn.com/9634_push_5066_001/2146503b3b9298d00d082150a88a7327.sdp/playlist.m3u8",
    []
  );

  const plyrRef = useRef<any>(null);
  const hlsRef = useRef<any>(null);

  const [mounted, setMounted] = useState(false);
  const [PlyrCmp, setPlyrCmp] = useState<null | PlyrReactModule["default"]>(null);
  const [state, setState] = useState<"open" | "min">("open");

  // ✅ memoize these so Plyr doesn't re-init from new object refs every render
  const plyrOptions = useMemo(
    () => ({
      storage: { enabled: false },
      autoplay: true,
      muted: true,
      controls: ["play", "mute", "volume", "fullscreen"] as const,
      hideControls: false,
      clickToPlay: true,
      fullscreen: { enabled: true, fallback: true, iosNative: true },
      displayDuration: false,
      tooltips: { controls: false, seek: false },
    }),
    []
  );

  const plyrSource = useMemo(() => ({}), []);

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
    let reinitTimer: any = null;

    const destroyHls = () => {
      try {
        hlsRef.current?.destroy?.();
      } catch {}
      hlsRef.current = null;
    };

    const clearTimers = () => {
      try {
        if (raf) cancelAnimationFrame(raf);
      } catch {}
      raf = 0;
      try {
        if (reinitTimer) clearTimeout(reinitTimer);
      } catch {}
      reinitTimer = null;
    };

    const getVideoEl = (): HTMLVideoElement | null => {
      const plyr = plyrRef.current?.plyr;
      const el = plyr?.media as HTMLVideoElement | undefined;
      return el && el.tagName === "VIDEO" ? el : null;
    };

    const prepareAutoplay = (videoEl: HTMLVideoElement) => {
      // Helps autoplay on iOS/Safari
      try {
        videoEl.muted = true;
        videoEl.defaultMuted = true as any;
        (videoEl as any).playsInline = true;
        videoEl.setAttribute("playsinline", "true");
        videoEl.setAttribute("webkit-playsinline", "true");
        videoEl.autoplay = true;
      } catch {}
    };

    const autoplayMuted = async (videoEl: HTMLVideoElement) => {
      prepareAutoplay(videoEl);
      try {
        await videoEl.play();
      } catch {
        // If blocked, user can hit play in controls
      }
    };

    const scheduleReinit = (delayMs = 1500) => {
      if (cancelled) return;
      clearTimers();
      reinitTimer = setTimeout(() => {
        if (!cancelled) run();
      }, delayMs);
    };

    const run = async () => {
      if (cancelled) return;

      // minimized -> pause + detach
      if (state === "min") {
        const plyr = plyrRef.current?.plyr;
        try {
          (plyr as any)?.pause?.();
        } catch {}
        destroyHls();
        clearTimers();
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
      try {
        plyr.muted = true;
      } catch {}

      // Avoid persisted 0-volume from past sessions
      try {
        localStorage.removeItem("plyr__volume");
      } catch {}

      // Give slider a sane starting point (still muted)
      try {
        plyr.volume = 0.6;
      } catch {}

      // Attach HLS (dynamic import)
      try {
        const HlsMod = await import("hls.js");
        if (cancelled) return;

        const Hls = HlsMod.default;

        destroyHls();

        if (Hls?.isSupported?.()) {
          const hls = new Hls({
            lowLatencyMode: true,
            backBufferLength: 30,

            // ✅ live sync defaults that reduce stalls/drift
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 10,
            maxLiveSyncPlaybackRate: 1.5,

            // ✅ retry behavior for flaky CDNs
            manifestLoadingMaxRetry: 10,
            levelLoadingMaxRetry: 10,
            fragLoadingMaxRetry: 10,
          });

          hlsRef.current = hls;

          // Helpful debugging if you want it:
          // hls.on(Hls.Events.FRAG_LOADED, (_e, d) => console.log("FRAG_LOADED", d.frag?.sn));

          // ✅ fatal error recovery (main reason streams "cut after a bit")
          hls.on(Hls.Events.ERROR, (_evt: any, data: any) => {
            console.error("[HLS ERROR]", data?.type, data?.details, "fatal:", data?.fatal);

            if (!data?.fatal) return;

            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                // restart loading
                try {
                  hls.startLoad();
                } catch {
                  scheduleReinit(1000);
                }
                break;

              case Hls.ErrorTypes.MEDIA_ERROR:
                // recover decoding/buffer errors
                try {
                  hls.recoverMediaError();
                } catch {
                  scheduleReinit(1000);
                }
                break;

              default:
                // hard reset
                try {
                  hls.destroy();
                } catch {}
                hlsRef.current = null;
                scheduleReinit(1200);
                break;
            }
          });

          prepareAutoplay(videoEl);

          hls.loadSource(src);
          hls.attachMedia(videoEl);

          // Autoplay when ready (muted)
          hls.on(Hls.Events.MANIFEST_PARSED, () => autoplayMuted(videoEl));
          hls.on(Hls.Events.LEVEL_LOADED, () => autoplayMuted(videoEl));

          // ✅ if playback stalls, try nudging it
          const onStalled = () => {
            // Some browsers stall live playback; re-try play
            autoplayMuted(videoEl);
          };
          videoEl.addEventListener("stalled", onStalled);
          videoEl.addEventListener("waiting", onStalled);

          // cleanup listeners for this run
          const cleanupMediaListeners = () => {
            videoEl.removeEventListener("stalled", onStalled);
            videoEl.removeEventListener("waiting", onStalled);
          };

          // ensure cleanup when effect ends
          // store cleanup on the hls instance for later teardown
          (hls as any).__cleanupMediaListeners = cleanupMediaListeners;
        } else if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari native HLS
          destroyHls();
          prepareAutoplay(videoEl);
          videoEl.src = src;

          // re-play on metadata/manifest updates
          const onCanPlay = () => autoplayMuted(videoEl);
          videoEl.addEventListener("canplay", onCanPlay);
          videoEl.addEventListener("loadedmetadata", onCanPlay);

          // cleanup
          (videoEl as any).__cleanupNative = () => {
            videoEl.removeEventListener("canplay", onCanPlay);
            videoEl.removeEventListener("loadedmetadata", onCanPlay);
          };
        } else {
          // no support
          destroyHls();
        }
      } catch {
        // ignore
      }
    };

    run();

    return () => {
      cancelled = true;
      clearTimers();

      // cleanup media listeners if we attached them
      try {
        const hls = hlsRef.current;
        (hls as any)?.__cleanupMediaListeners?.();
      } catch {}

      try {
        const videoEl = getVideoEl();
        (videoEl as any)?.__cleanupNative?.();
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
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/plyr@3/dist/plyr.css" />

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
              <p className="text-xs font-semibold text-white/90">Ceflix Tv — Live</p>
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
                  source={plyrSource} // HLS attached manually
                  options={plyrOptions}
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
          .ceflix-tv .plyr__volume input[type="range"] {
            height: 4px !important;
          }

          /* If progress is ever added later, keep it slim */
          .ceflix-tv .plyr__progress input[type="range"] {
            height: 4px !important;
          }
        `}</style>
      </div>
    </>
  );
}