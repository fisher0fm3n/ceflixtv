"use client";

import React, { useEffect, useMemo, useRef } from "react";
import videojs, { type VideoJsPlayer as VjsPlayer, type VideoJsPlayerOptions } from "video.js";

// Base Video.js CSS (required)
import "video.js/dist/video-js.css";

// Optional theme (nice out of the box)
// Other options: city / fantasy / forest / sea
import "@videojs/themes/dist/forest/index.css";

type Props = {
  src: string;
  poster?: string;
  isMobile?: boolean; // pass your isMobile state
  autoplay?: boolean;
  muted?: boolean;
  onReady?: (player: VjsPlayer) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
};

function guessType(url: string) {
  const u = url.toLowerCase();
  if (u.includes(".m3u8")) return "application/x-mpegURL";
  if (u.includes(".mpd")) return "application/dash+xml";
  if (u.includes(".webm")) return "video/webm";
  return "video/mp4";
}

export default function VideoJsPlayer({
  src,
  poster,
  isMobile = false,
  autoplay = true,
  muted = true,
  onReady,
  onTimeUpdate,
  onEnded,
}: Props) {
  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<VjsPlayer | null>(null);

  const options: VideoJsPlayerOptions = useMemo(() => {
    // Controls can be configured via children options :contentReference[oaicite:4]{index=4}
    // We'll keep the bar tight on mobile by disabling the inline volume panel there.
    return {
      autoplay,
      muted,
      controls: true,
      preload: "auto",
      fluid: true, // responsive sizing
      poster,

      // Mobile friendly:
      playsinline: true,

      controlBar: {
        // Keep it clean
        pictureInPictureToggle: false,

        // This is the main “volume takes too much space” fix:
        // On mobile, hide the volume panel entirely (keep mute)
        volumePanel: isMobile
          ? false
          : { inline: true },

        // Always keep mute available
        muteToggle: true,
      },

      sources: [{ src, type: guessType(src) }],
    };
  }, [autoplay, muted, poster, src, isMobile]);

  useEffect(() => {
    if (!videoElRef.current) return;

    // Init once
    if (!playerRef.current) {
      const player = (playerRef.current = videojs(videoElRef.current, options, () => {
        onReady?.(player);
      }));

      // Wiring events
      if (onEnded) player.on("ended", onEnded);

      if (onTimeUpdate) {
        const handler = () => {
          const t = player.currentTime() || 0;
          const d = player.duration() || 0;
          onTimeUpdate(t, d);
        };
        player.on("timeupdate", handler);
      }

      return;
    }

    // Update source without destroying the player (better UX)
    const player = playerRef.current;

    // Update poster
    if (poster) player.poster(poster);

    // Update source
    player.src({ src, type: guessType(src) });

    // Try to play (may be blocked on mobile if not muted/user gesture)
    if (autoplay) {
      player.play().catch(() => {});
    }
  }, [options, src, poster, autoplay, onReady, onEnded, onTimeUpdate]);

  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  return (
    <>
      <div className="vjs-wrap">
        <video
          ref={videoElRef}
          className="video-js vjs-theme-forest vjs-big-play-centered"
        />
      </div>

      {/* Nice styling overrides (works with any theme) */}
      <style jsx global>{`
        /* Keep the control bar compact and touch-friendly */
        .vjs-wrap .video-js .vjs-control-bar {
          background: linear-gradient(to top, rgba(0,0,0,.75), rgba(0,0,0,.15));
        }

        .vjs-wrap .video-js .vjs-button > .vjs-icon-placeholder:before {
          font-size: 1.2rem;
          line-height: 2.2rem;
        }

        /* Make timeline easier to grab */
        .vjs-wrap .video-js .vjs-progress-control {
          min-width: 10rem;
        }

        .vjs-wrap .video-js .vjs-progress-holder {
          height: 0.45rem;
        }

        .vjs-wrap .video-js .vjs-play-progress,
        .vjs-wrap .video-js .vjs-load-progress {
          height: 0.45rem;
        }

        /* Mobile: tighten everything + keep it from wrapping */
        @media (max-width: 768px) {
          .vjs-wrap .video-js .vjs-control-bar {
            height: 2.5rem;
            padding: 0 0.4rem;
          }

          .vjs-wrap .video-js .vjs-control {
            width: 2.2rem;
          }

          .vjs-wrap .video-js .vjs-current-time,
          .vjs-wrap .video-js .vjs-time-divider,
          .vjs-wrap .video-js .vjs-duration {
            display: none;
          }

          /* Prevent controls from wrapping to a second line */
          .vjs-wrap .video-js .vjs-control-bar {
            flex-wrap: nowrap;
          }
        }

        /* Rounded corners if your container has overflow hidden */
        .vjs-wrap .video-js {
          border-radius: 0.5rem;
        }
      `}</style>
    </>
  );
}