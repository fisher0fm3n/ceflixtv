"use client";

import { useRef, useState, useEffect } from "react";
import Plyr, { APITypes, PlyrOptions } from "plyr-react";
import "plyr-react/plyr.css";

// ✅ import from assets

const VIDEO_URL = "/videos/psv-ep1.mp4";
// If you add a .d.ts for mp4 (see note below) you can use: const VIDEO_URL = episodeVideo;

const POSTER_URL = "/images/guess-the-gmo-thumb.jpg";
const TITLE = "My Glow Up Journey - Episode 1: My History";

const plyrOptions: PlyrOptions = {
  controls: [
    "play-large",
    "restart",
    "rewind",
    "play",
    "fast-forward",
    "progress",
    "current-time",
    "duration",
    "mute",
    "volume",
    "settings",
    "pip",
    "airplay",
    "fullscreen",
  ],
};

const videoSource = {
  type: "video",
  title: TITLE,
  sources: [
    {
      src: VIDEO_URL,
      type: "video/mp4",
    },
  ],
  poster: POSTER_URL,
};

export default function WatchPage() {
  const playerRef = useRef<APITypes | null>(null);
  const [showTopBar, setShowTopBar] = useState(true);

  // Mimic Plyr's auto-hide controls behaviour: show on interaction, hide after a bit
  useEffect(() => {
    if (!showTopBar) return;

    const timer = setTimeout(() => {
      setShowTopBar(false);
    }, 2500); // keep in sync-ish with Plyr controls timeout

    return () => clearTimeout(timer);
  }, [showTopBar]);

  return (
    <div
      className="fixed inset-0 bg-black w-screen h-screen overflow-hidden"
      onMouseMove={() => setShowTopBar(true)}
      onTouchStart={() => setShowTopBar(true)}
    >
      {/* Back button & top gradient */}
      <div
        className={`absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent px-4 sm:px-8 pt-4 pb-8 flex items-center transition-opacity duration-300 ${
          showTopBar ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={() => history.back()}
          className="text-white text-3xl mr-4"
          aria-label="Back"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-lg font-semibold text-white truncate">
            {TITLE}
          </p>
        </div>
      </div>

      {/* Player wrapper (centred, full viewport) */}
      <div className="relative w-full h-full flex items-center justify-center px-0">
        <div className="w-full max-w-full aspect-video bg-black">
          <Plyr
            ref={playerRef}
            source={videoSource as any}
            options={plyrOptions}
          />
        </div>
      </div>
    </div>
  );
}
