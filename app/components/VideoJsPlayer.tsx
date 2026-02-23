// app/components/VideoJsPlayer.tsx
"use client";

import { useEffect, useRef } from "react";
import videojs from "video.js";

type Props = {
  src: string | null;
  poster?: string;
  autoplay?: boolean;
  muted?: boolean;
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
  muted = true,
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

  // Create the player once (when src becomes available)
  useEffect(() => {
    if (!containerRef.current) return;
    if (playerRef.current) return;
    if (!src) return;

    // Create <video> and let video.js own it (React-safe)
    const videoEl = document.createElement("video");
    videoEl.className = "video-js vjs-big-play-centered vjs-ceflix";
    videoEl.setAttribute("playsinline", String(playsInline));
    videoEl.style.width = "100%";
    videoEl.style.height = "100%";

    containerRef.current.appendChild(videoEl);

    const type = src.endsWith(".m3u8")
      ? "application/x-mpegURL"
      : "video/mp4";

    const player = (playerRef.current = videojs(videoEl, {
      autoplay,
      controls: true,
      preload: "auto",
      playsinline: playsInline,

      // IMPORTANT: Let your Tailwind layout control sizing
      fluid: false,
      responsive: false,

      sources: [{ src, type }],
      poster,
    }));

    player.on("timeupdate", () => {
      onProgress?.(player.currentTime() || 0, player.duration() || 0);
    });

    player.on("loadedmetadata", () => {
      const dur = player.duration() || 0;
      onLoadedMetadata?.(dur);

      // Seek once per source-load
      if (!didSeekRef.current && startTime && startTime > 0) {
        didSeekRef.current = true;
        try {
          player.currentTime(startTime);
        } catch {}
      }
    });

    player.on("ended", () => onEnded?.());

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // Update src when it changes (after player exists)
  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    if (!src) return;

    didSeekRef.current = false;

    const type = src.endsWith(".m3u8")
      ? "application/x-mpegURL"
      : "video/mp4";

    player.poster(poster || "");
    player.src({ src, type });

    if (autoplay) player.play().catch(() => {});
  }, [src, poster, autoplay]);

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