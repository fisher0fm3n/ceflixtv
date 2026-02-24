// components/PopupPlayer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  SignalIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";

// If you already use the same VideoJsPlayer everywhere, reuse it here too:
import VideoJsPlayer from "@/app/components/VideoJsPlayer";

type PopupLanguage = {
  id: string | number;
  url: string;
  video_id?: string | number;
  translation: string;
};

type PopupData = {
  id?: string | number;
  title: string;
  url: string;
  thumbnail?: string | null;
  isLive?: boolean; // optional; if not provided we auto-detect via .m3u8
  languages?: PopupLanguage[];
};

type Props = {
  open: boolean;
  data: PopupData | null;
  onClose: () => void;

  /**
   * Optional: only if you need view counting from the popup.
   * Keeps this component free of tokens/keys/env usage.
   */
  onCountView?: (payload: { videoId?: string | number; language?: string | null }) => void;
};

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_850/";

function withCloudinaryPrefix2(src?: string | null): string {
  if (!src) return "";
  const s = src.toLowerCase();
  if (s.includes("cloudinary") || s.includes("cloudfront")) return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

export default function PopupPlayer({
  open,
  data,
  onClose,
  onCountView,
}: Props) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  const [videoUrl, setVideoUrl] = useState<string>("");
  const [selectedLang, setSelectedLang] = useState<string | null>(null);

  const isLive = useMemo(() => {
    if (!data) return false;
    if (typeof data.isLive === "boolean") return data.isLive;
    return (videoUrl || data.url || "").endsWith(".m3u8");
  }, [data, videoUrl]);

  // Sync state when popup opens / data changes
  useEffect(() => {
    if (!open || !data) return;
    setVideoUrl(data.url);
    setSelectedLang(null);
  }, [open, data]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;

    const onDown = (e: MouseEvent) => {
      if (!panelRef.current) return;
      if (!panelRef.current.contains(e.target as Node)) onClose();
    };

    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open, onClose]);

  const setDefaultLanguage = () => {
    if (!data) return;
    setVideoUrl(data.url);
    setSelectedLang(null);

    onCountView?.({ videoId: data.id, language: null });
  };

  const setLanguage = (lang: PopupLanguage) => {
    setVideoUrl(lang.url);
    setSelectedLang(lang.translation);

    onCountView?.({ videoId: lang.video_id ?? data?.id, language: lang.translation });
  };

  if (!open || !data) return null;

  return (
    <div className="fixed inset-0 z-[99999]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Centered modal */}
      <div className="relative z-10 min-h-screen w-full grid place-items-center p-3 sm:p-6">
        <div
          ref={panelRef}
          className="w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-neutral-900/85 backdrop-blur-xl shadow-[0_18px_60px_rgba(0,0,0,0.65)]"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 border-b border-white/10">
            <div className="min-w-0 flex items-center gap-3">
              {isLive && (
                <span className="inline-flex items-center gap-2 rounded-md bg-red-700/80 px-2.5 py-1 text-xs font-semibold uppercase text-white">
                  <SignalIcon className="h-4 w-4" />
                  Live
                </span>
              )}

              <h2 className="min-w-0 text-sm sm:text-base font-semibold text-white truncate">
                {data.title}
                {selectedLang ? (
                  <span className="text-neutral-400 font-medium">
                    {" "}
                    • {selectedLang}
                  </span>
                ) : null}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-800/70 text-neutral-200 hover:bg-neutral-700/70 hover:text-white transition"
              aria-label="Close"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Player */}
          <div className="p-3 sm:p-6">
            <div className="relative w-full overflow-hidden rounded-xl bg-black">
              <div className="relative aspect-video">
                <VideoJsPlayer
                  src={videoUrl}
                  poster={withCloudinaryPrefix2(data.thumbnail || "")}
                  autoplay
                  muted={true}
                  playsInline
                  loading={false}
                  className="absolute inset-0"
                />
              </div>
            </div>

            {/* Languages */}
            {Array.isArray(data.languages) && data.languages.length > 0 && (
              <div className="mt-4 rounded-xl border border-white/10 bg-neutral-800/40 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-neutral-200">
                    Available Languages
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={setDefaultLanguage}
                    className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedLang === null
                        ? "bg-red-600 text-white hover:bg-red-500"
                        : "bg-neutral-700/70 text-neutral-100 hover:bg-neutral-600/70"
                    }`}
                  >
                    Default
                  </button>

                  {data.languages.map((lang) => (
                    <button
                      key={String(lang.id)}
                      type="button"
                      onClick={() => setLanguage(lang)}
                      className={`cursor-pointer rounded-full px-3 py-1 text-xs font-semibold transition ${
                        selectedLang === lang.translation
                          ? "bg-red-600 text-white hover:bg-red-500"
                          : "bg-neutral-700/70 text-neutral-100 hover:bg-neutral-600/70"
                      }`}
                    >
                      {lang.translation}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Footer actions (optional) */}
            <div className="mt-4 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-full border border-white/10 bg-neutral-800/50 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700/50 hover:text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}