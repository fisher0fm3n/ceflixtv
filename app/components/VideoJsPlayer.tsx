// app/components/VideoJsPlayer.tsx
"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";

type Props = {
  src: string | null;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean; // IMPORTANT: if autoplay=true, you almost always want muted=true
  playsInline?: boolean;
  startTime?: number | null;
  onProgress?: (currentTime: number, duration: number) => void;
  onLoadedMetadata?: (duration: number) => void;
  onEnded?: () => void;
  loading?: boolean;
  className?: string;
};

export default function VideoJsPlayer({
  src,
  poster,
  autoplay = true,
  muted,
  playsInline = true,
  startTime,
  onProgress,
  onLoadedMetadata,
  onEnded,
  loading = false,
  className = "",
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const didSeekRef = useRef(false);

  const getType = (u: string) =>
    u.endsWith(".m3u8") ? "application/x-mpegURL" : "video/mp4";

  // Create player once (when src becomes available)
  useEffect(() => {
    if (!containerRef.current) return;
    if (playerRef.current) return;
    if (!src) return;

    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-big-play-centered vjs-ceflix";
    videoEl.style.width = "100%";
    videoEl.style.height = "100%";

    // ✅ playsinline for iOS/Safari
    if (playsInline) {
      videoEl.setAttribute("playsinline", "true");
      videoEl.setAttribute("webkit-playsinline", "true");
    }

    // ✅ MUST be muted at the element level for autoplay to work in browsers
    // If you're trying to autoplay, force muted true (otherwise many browsers block)
    const shouldMuteForAutoplay = !!muted;

    videoEl.muted = shouldMuteForAutoplay;
    if (shouldMuteForAutoplay) videoEl.setAttribute("muted", "");
    else videoEl.removeAttribute("muted");

    containerRef.current.appendChild(videoEl);

    const player = (playerRef.current = videojs(videoEl, {
      autoplay, // we'll still call play() manually after we set muted
      muted: shouldMuteForAutoplay, // ✅ also tell video.js
      controls: true,
      preload: "auto",
      playsinline: playsInline,
      fluid: false,
      responsive: false,
      sources: [{ src, type: getType(src) }],
      poster,
    }));

    // ✅ Ensure player is muted BEFORE any play attempt
    player.muted(shouldMuteForAutoplay);

    player.on("timeupdate", () => {
      onProgress?.(player.currentTime() || 0, player.duration() || 0);
    });

    player.on("loadedmetadata", () => {
      const dur = player.duration() || 0;
      onLoadedMetadata?.(dur);

      if (!didSeekRef.current && startTime && startTime > 0) {
        didSeekRef.current = true;
        try {
          player.currentTime(startTime);
        } catch {}
      }

      // ✅ attempt autoplay after metadata (most reliable moment)
      if (autoplay) {
        // keep muted true for autoplay compliance
        // some browsers need BOTH element + player muted before play
        try {
          const el = player.el()?.querySelector("video") as HTMLVideoElement | null;
          if (el) {
          }
        } catch {}

        player.play().catch(() => {
          // Autoplay may still be blocked if browser requires user gesture in some edge cases.
          // In that case, the big play button will still work.
        });
      }
    });

    player.on("ended", () => onEnded?.());

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Update src/poster/autoplay/muted after player exists
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!src) return;

    didSeekRef.current = false;

    const shouldMuteForAutoplay = !!muted;

    // ✅ sync poster + src
    player.poster(poster || "");
    player.src({ src, type: getType(src) });

    // ✅ sync muted state (player + underlying element)
    player.muted(shouldMuteForAutoplay);
    try {
      const el = player.el()?.querySelector("video") as HTMLVideoElement | null;
      if (el) {
        el.muted = shouldMuteForAutoplay;
        if (shouldMuteForAutoplay) el.setAttribute("muted", "");
        else el.removeAttribute("muted");
      }
    } catch {}

    // ✅ attempt autoplay after src change
    if (autoplay) {
      player.play().catch(() => {});
    }
  }, [src, poster, autoplay, muted]);

  // Dispose on unmount
  useEffect(() => {
    return () => {
      const player = playerRef.current;
      if (player) {
        player.dispose();
        playerRef.current = null;
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, []);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div ref={containerRef} className="absolute inset-0" />
      {loading && (
        <div className="absolute inset-0 animate-pulse bg-neutral-800/80" />
      )}
    </div>
  );
}