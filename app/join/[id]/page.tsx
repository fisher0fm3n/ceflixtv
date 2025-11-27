// app/join/[id]/page.tsx
"use client";

import "plyr/dist/plyr.css";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShareIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../components/AuthProvider";
import ShareModal from "@/app/components/ShareModal";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type Language = {
  id: string;
  slug: string;
  translation: string;
  url: string;
};

type UpNextItem = {
  id: string;
  videos_title: string;
  thumbnail: string;
  duration: string;
  numOfViews: string;
  uploadtime: string;
  channel: string;
  isLive: "0" | "1";
};

type AngleVideo = {
  eventDesc: string;
  thumbnail: string;
  url: string;
  timeAgo?: string | number;
};

type AngleUser = {
  fname: string;
  lname: string;
  profile_pic: string;
};

type AngleData = {
  id: string;
  video: AngleVideo;
  user: AngleUser;
  channel_id: string;
  isVerified: "0" | "1";
  // if fetchangle returns these:
  description?: string | null;
};

type FetchAngleResponse = {
  status: boolean;
  data: {
    video: AngleVideo;
    user: AngleUser;
    channel_id: string;
    isVerified: "0" | "1";
    id: string;
    languages?: Language[];
    upnext?: any[];
    pool?: any[];
    description?: string | null;
  };
};

// ---------- helpers ----------
function timeSince(unix: number | string | undefined) {
  if (!unix && unix !== 0) return "";
  const ts =
    typeof unix === "string" ? parseInt(unix, 10) * 1000 : unix * 1000;
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just Now";
  if (minutes < 60) return `${minutes} Minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} Hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} Days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} Weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} Months ago`;
  const years = Math.floor(days / 365);
  return `${years}y ago`;
}

const duration = (seconds: number | string) => {
  const s =
    typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  const val = new Date(s * 1000).toISOString();
  // show mm:ss if < 1h
  if (val.substring(12, 13) === "0") {
    return val.substring(14, 19);
  } else {
    return val.substring(12, 19);
  }
};

function formatViews(v: string | number) {
  const num = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(num)) return "0 views";
  if (num < 1000) return `${num} views`;
  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]} views`;
}

function formatTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[!@#$%^&*()+={}\[\]|\\:;"'<>,.?/]+/g, "")
    .replace(/\s+/g, "-");
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-neutral-800/80 rounded-md ${className}`}
    />
  );
}

// ---------- page ----------
export default function JoinPage() {
  const { token } = useAuth();
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const eventId = params?.id;

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [angle, setAngle] = useState<AngleData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [defaultVideoUrl, setDefaultVideoUrl] =
    useState<string | null>(null);

  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLangSlug, setSelectedLangSlug] = useState<
    string | null
  >(null);

  const [upNext, setUpNext] = useState<UpNextItem[]>([]);
  const [shareOpen, setShareOpen] = useState(false);

  const [theatre, setTheatre] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const plyrRef = useRef<any | null>(null);
  const hlsRef = useRef<any | null>(null);

  const isLive = useMemo(
    () => !!videoUrl && videoUrl.endsWith(".m3u8"),
    [videoUrl]
  );

  // detect mobile, like in PlayerPage
  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // restore theatre mode preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ceflix.theatre");
      if (stored !== null) {
        setTheatre(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleTheatre = () => {
    setTheatre((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(
          "ceflix.theatre",
          JSON.stringify(next)
        );
      } catch {
        // ignore
      }
      return next;
    });
  };

  // setup player (Plyr + HLS) whenever videoUrl changes
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const videoEl = videoRef.current;

    async function setupPlayer() {
      // clean up old instances
      if (plyrRef.current) {
        try {
          plyrRef.current.destroy();
        } catch {
          // ignore
        }
        plyrRef.current = null;
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          // ignore
        }
        hlsRef.current = null;
      }

      if (!videoEl) return;

      const isHls = videoUrl.endsWith(".m3u8");

      // 1) set media source
      if (isHls) {
        if (
          videoEl.canPlayType(
            "application/vnd.apple.mpegurl"
          )
        ) {
          videoEl.src = videoUrl;
        } else {
          const HlsModule = await import("hls.js");
          const Hls = HlsModule.default;
          if (Hls.isSupported()) {
            const hls = new Hls();
            hls.loadSource(videoUrl);
            hls.attachMedia(videoEl);
            hlsRef.current = hls;
          } else {
            videoEl.src = videoUrl;
          }
        }
      } else {
        videoEl.src = videoUrl;
      }

      // 2) wrap with Plyr controls
      const PlyrModule = await import("plyr");
      const Plyr = PlyrModule.default;

      const player = new Plyr(videoEl, {
        controls: [
          "play-large",
          "play",
          "progress",
          "current-time",
          "mute",
          "volume",
          "settings",
          "fullscreen",
        ],
      });

      plyrRef.current = player;
      player.on("ready", () => {
        player.play().catch(() => {
          // autoplay may be blocked
        });
      });
    }

    setupPlayer();

    // cleanup
    return () => {
      if (plyrRef.current) {
        try {
          plyrRef.current.destroy();
        } catch {
          // ignore
        }
        plyrRef.current = null;
      }
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch {
          // ignore
        }
        hlsRef.current = null;
      }
    };
  }, [videoUrl]);

  // fetch angle data (live event + upnext)
  useEffect(() => {
    if (!eventId) return;

    let cancelled = false;

    async function fetchAngle() {
      setLoading(true);
      setLoadError(null);

      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        };
        if (token) {
          headers["X-TOKEN"] = token;
        }

        const res = await fetch(API_BASE + "fetchangle", {
          method: "POST",
          headers,
          body: JSON.stringify({
            eventID: eventId,
          }),
        });

        const json: any = await res.json();

        if (!json.status) {
          throw new Error("Event not found");
        }

        if (cancelled) return;

        const d = json.data as FetchAngleResponse["data"];
        const angleData: AngleData = {
          id: d.id,
          video: d.video,
          user: d.user,
          channel_id: d.channel_id,
          isVerified: d.isVerified,
          description: d.description,
        };

        setAngle(angleData);
        setVideoUrl(d.video.url);
        setDefaultVideoUrl(d.video.url);
        setLanguages(d.languages || []);

        // upnext or pool (shape matches your VOD upnext)
        let up: UpNextItem[] = [];
        if (Array.isArray(d.pool) && d.pool.length) {
          up = d.pool.map((item: any) => ({
            id: String(item.id),
            videos_title: item.videos_title,
            thumbnail: item.thumbnail,
            duration: String(item.duration ?? 0),
            numOfViews: String(item.numOfViews ?? 0),
            uploadtime: String(item.uploadtime ?? ""),
            channel: item.channel,
            isLive: (item.isLive ?? "0") as "0" | "1",
          }));
        } else if (
          Array.isArray(d.upnext) &&
          d.upnext.length
        ) {
          up = d.upnext.map((item: any) => ({
            id: String(item.id),
            videos_title: item.videos_title,
            thumbnail: item.thumbnail,
            duration: String(item.duration ?? 0),
            numOfViews: String(item.numOfViews ?? 0),
            uploadtime: String(item.uploadtime ?? ""),
            channel: item.channel,
            isLive: (item.isLive ?? "0") as "0" | "1",
          }));
        }
        setUpNext(up);

        document.title = `${d.video.eventDesc} - Ceflix Tv`;
      } catch (err: any) {
        console.error("Error loading event:", err);
        if (!cancelled) {
          setLoadError(
            err?.message || "Failed to load event"
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAngle();

    return () => {
      cancelled = true;
    };
  }, [eventId, token]);

  const handleChangeLanguage = (lang: Language | null) => {
    if (!angle || !defaultVideoUrl) return;

    if (!lang) {
      setVideoUrl(defaultVideoUrl);
      setSelectedLangSlug(null);
      return;
    }

    setVideoUrl(lang.url);
    setSelectedLangSlug(lang.slug);

    // optional: adjust URL if you want different slug per language
    // router.replace(`/join/${eventId}/${lang.slug}`);
  };

  const handleUpNextClick = (item: UpNextItem) => {
    // For live event page, original code linked to VOD watch page.
    const slug = formatTitle(item.videos_title);
    router.push(`/videos/watch/${item.id}/${slug}`);
  };

  const isInitialLoading = loading && !videoUrl;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
        <div className="mx-auto px-4 lg:px-6 max-w-[110rem] grid gap-6 lg:grid-cols-12">
          {/* Left skeleton */}
          <div className="col-span-8 xl:col-span-9">
            <div className="w-full bg-black rounded-lg aspect-video overflow-hidden">
              <Skeleton className="w-full h-full rounded-none" />
            </div>
            <div className="mt-4">
              <Skeleton className="h-6 w-3/4" />
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-8 w-24 rounded-full ml-2" />
              </div>
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
            <div className="mt-4 rounded-xl bg-neutral-900/80 px-4 py-3">
              <Skeleton className="h-4 w-40 mb-3" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>

          {/* Right skeleton (Up next) */}
          <aside className="col-span-8 lg:col-span-4 xl:col-span-3">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-full p-2 sm:max-w-sm flex flex-col lg:flex-row gap-2 rounded-lg"
                >
                  <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-neutral-900">
                    <Skeleton className="w-full h-full rounded-none" />
                  </div>
                  <div className="flex-1 min-w-0 mt-1 lg:mt-0 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (loadError || !angle || !videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        {loadError || "Event not found."}
      </div>
    );
  }

  const { video, user, isVerified, description } = angle;

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
      <div
        className={`mx-auto px-4 lg:px-6 grid gap-6 ${
          theatre
            ? "max-w-[1400px] grid-cols-1"
            : "max-w-[110rem] lg:grid-cols-12"
        }`}
      >
        {/* Player + info */}
        <div className="col-span-8 xl:col-span-9">
          {/* Video container */}
          <div
            className={`relative w-full bg-black overflow-hidden mb-3 ${
              theatre ? "rounded-none" : "rounded-lg aspect-video"
            }`}
            style={
              theatre && !isMobile
                ? {
                    maxHeight: "calc(100vh - 189px)",
                    height: "42.25vw",
                    minHeight: "480px",
                  }
                : undefined
            }
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              controls
              poster={video.thumbnail}
              className={`w-full h-full object-contain bg-black transition-opacity ${
                loading ? "opacity-0" : "opacity-100"
              }`}
            >
              <source src={videoUrl} />
              Your browser does not support the video tag.
            </video>

            {loading && (
              <div className="absolute inset-0">
                <Skeleton className="w-full h-full rounded-none" />
              </div>
            )}

            {/* LIVE badge (optional) */}
            {isLive && (
              <div className="absolute top-3 left-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold">
                LIVE
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div
              className={theatre ? "col-span-3 lg:col-span-2" : "col-span-3"}
            >
              {/* Title */}
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold tracking-tight">
                {video.eventDesc}
                {selectedLangSlug
                  ? ` [${selectedLangSlug.toUpperCase()}]`
                  : ""}
              </h1>

              {/* Channel + actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                {/* Channel info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-700 overflow-hidden">
                    <img
                      src={
                        user?.profile_pic ||
                        "https://ceflix.org/images/avatar.png"
                      }
                      alt={`${user?.fname} ${user?.lname}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">
                        {user?.fname} {user?.lname}
                      </span>
                      {isVerified === "1" && (
                        <CheckBadgeIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    {video.timeAgo && (
                      <p className="text-xs text-neutral-400">
                        Published {timeSince(video.timeAgo)}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700"
                  >
                    <ShareIcon className="w-4 h-4" />
                    <span>Share</span>
                  </button>

                  <ShareModal
                    open={shareOpen}
                    setOpen={setShareOpen}
                    title={video.eventDesc}
                    url={
                      typeof window !== "undefined"
                        ? window.location.href
                        : ""
                    }
                    hashtags={["ceflix"]}
                    id={angle.id}
                  />

                  <button
                    type="button"
                    onClick={toggleTheatre}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-2 text-[11px] md:text-xs font-medium hover:bg-neutral-700"
                  >
                    {theatre ? "Default view" : "Theater mode"}
                  </button>
                </div>
              </div>

              {/* Description-ish card */}
              <div className="mt-4 rounded-xl bg-neutral-900/80 px-4 py-3 text-sm">
                {video.timeAgo && (
                  <p className="font-semibold text-neutral-100">
                    Live • {timeSince(video.timeAgo)}
                  </p>
                )}
                {description && (
                  <p className="mt-2 whitespace-pre-line text-neutral-100">
                    {description}
                  </p>
                )}
              </div>

              {/* Languages (like original Join + PlayerPage) */}
              {languages.length > 0 && (
                <div className="mt-3 bg-neutral-900/80 border border-neutral-800 rounded-lg p-3">
                  <p className="text-xs font-semibold mb-2">
                    Available languages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeLanguage(null)}
                      className={`text-xs rounded-full px-3 py-1 ${
                        !selectedLangSlug
                          ? "bg-red-600"
                          : "bg-neutral-700 hover:bg-neutral-600"
                      }`}
                    >
                      Default
                    </button>
                    {languages.map((lang) => (
                      <button
                        key={lang.id}
                        type="button"
                        onClick={() => handleChangeLanguage(lang)}
                        className={`text-xs rounded-full px-3 py-1 ${
                          selectedLangSlug === lang.slug
                            ? "bg-red-600"
                            : "bg-neutral-700 hover:bg-neutral-600"
                        }`}
                      >
                        {lang.translation}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Up next sidebar when in theatre */}
            {theatre && (
              <aside className="mt-6 col-span-3 lg:col-span-1">
                <h3 className="text-md font-bold mb-2 text-white">
                  Up next
                </h3>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                  {upNext
                    .filter((v) => v.isLive === "0")
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleUpNextClick(item)}
                        className="w-full p-2 lg:max-w-sm text-left flex flex-col lg:flex-row gap-2 lg:gap-3 cursor-pointer rounded-lg hover:bg-neutral-900"
                      >
                        <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-neutral-900">
                          <img
                            src={item.thumbnail}
                            className="w-full h-full object-cover"
                            alt={item.videos_title}
                          />
                          <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                            {duration(item.duration)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0 mt-1 lg:mt-0">
                          <p className="text-sm font-semibold line-clamp-2">
                            {item.videos_title}
                          </p>
                          <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                            {item.channel}
                          </p>
                          <p className="text-xs text-neutral-500 mt-0.5">
                            {formatViews(item.numOfViews)} •{" "}
                            {timeSince(item.uploadtime)}
                          </p>
                        </div>
                      </button>
                    ))}
                  {upNext.length === 0 && (
                    <p className="text-xs text-neutral-500">
                      No more videos.
                    </p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* Up next (non-theatre) */}
        {!theatre && (
          <aside className="col-span-8 lg:col-span-4 xl:col-span-3">
            <h3 className="text-md font-bold mb-2 text-white">
              Up next
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
              {upNext
                .filter((v) => v.isLive === "0")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUpNextClick(item)}
                    className="w-full p-2 sm:max-w-sm text-left flex flex-col lg:flex-row gap-2 lg:gap-3 cursor-pointer rounded-lg hover:bg-neutral-900"
                  >
                    <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-sm overflow-hidden bg-neutral-900">
                      <img
                        src={item.thumbnail}
                        className="w-full h-full object-cover"
                        alt={item.videos_title}
                      />
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                        {duration(item.duration)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 mt-1 lg:mt-0">
                      <p className="text-sm font-semibold line-clamp-2">
                        {item.videos_title}
                      </p>
                      <p className="text-xs text-neutral-400 mt-1 line-clamp-1">
                        {item.channel}
                      </p>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {formatViews(item.numOfViews)} •{" "}
                        {timeSince(item.uploadtime)}
                      </p>
                    </div>
                  </button>
                ))}
              {upNext.length === 0 && (
                <p className="text-xs text-neutral-500 col-span-full">
                  No more videos.
                </p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
