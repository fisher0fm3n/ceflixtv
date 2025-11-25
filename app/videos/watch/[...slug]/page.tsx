// app/player/[...slug]/page.tsx
"use client";

import "plyr/dist/plyr.css";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  HandThumbUpIcon as ThumbsUpOutline,
  ShareIcon,
  ClockIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as ThumbsUpSolid } from "@heroicons/react/24/solid";
import { useAuth } from "../../../components/AuthProvider";
import ShareModal from "../../../components/ShareModal";

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

type VideoData = {
  id: string;
  videoID: string;
  url: string;
  videos_title: string;
  description: string | null;
  thumbnail: string;
  channel: string;
  channel_id: string;
  isVerified: "0" | "1";
  numOfViews: string;
  likes: string;
  uploadtime: string;
  numOfComments: number;
};

type Comment = {
  id: string;
  fname: string;
  lname: string;
  profile_pic: string;
  com_time: number;
  comment: string;
};

function timeSince(unix: number | string) {
  const ts = typeof unix === "string" ? parseInt(unix, 10) * 1000 : unix * 1000;
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
  const s = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  const val = new Date(s * 1000).toISOString();
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

// Same title formatter as your HomeInitialGrid
function formatTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[!@#$%^&*()+={}\[\]|\\:;"'<>,.?/]+/g, "")
    .replace(/\s+/g, "-");
}

export default function PlayerPage() {
  const params = useParams<{ slug: string[] | string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const slugParam = params.slug;
  const initialVideoId = Array.isArray(slugParam) ? slugParam[0] : slugParam;

  // 👉 internal ID we use for fetching / swapping videos
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(
    initialVideoId ?? null
  );

  // keep internal ID in sync if route param changes externally
  useEffect(() => {
    if (initialVideoId && initialVideoId !== currentVideoId) {
      setCurrentVideoId(initialVideoId);
    }
  }, [initialVideoId]); // eslint-disable-line react-hooks/exhaustive-deps

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [video, setVideo] = useState<VideoData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [defaultVideoUrl, setDefaultVideoUrl] = useState<string | null>(null);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [selectedLangSlug, setSelectedLangSlug] = useState<string | null>(null);

  const [upNext, setUpNext] = useState<UpNextItem[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [postingComment, setPostingComment] = useState(false);

  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [subscribed, setSubscribed] = useState(false);

  const [autoplay, setAutoplay] = useState(false); // "Up next" autoplay
  const [theatre, setTheatre] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // NEW: which action is asking the user to sign in ("like" | "subscribe" | "comment")
  const [authPrompt, setAuthPrompt] = useState<
    null | "like" | "subscribe" | "comment"
  >(null);

  const isLive = useMemo(
    () => !!videoUrl && videoUrl.endsWith(".m3u8"),
    [videoUrl]
  );

  // NEW: restore theatre mode preference from localStorage on mount
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

  useEffect(() => {
    if (!videoUrl) return;

    let player: any;

    async function loadPlyr() {
      // dynamic import so it only runs in the browser
      const PlyrModule = await import("plyr");
      const Plyr = PlyrModule.default;

      if (videoRef.current) {
        player = new Plyr(videoRef.current, {
          autoplay,
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

        player.on("ready", () => {
          player.play().catch(() => {
            // autoplay may be blocked by browser, ignore
          });
        });
        // autoplay next video when ended
        player.on("ended", () => {
          if (autoplay && upNext.length > 0) {
            const next = upNext[0];
            router.push(`/player/${next.id}`);
          }
        });
      }
    }

    loadPlyr();

    // cleanup
    return () => {
      if (player) {
        player.destroy();
      }
    };
  }, [videoUrl, autoplay, upNext, router]);

  const toggleAutoplay = () => {
    setAutoplay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ceflix.autoplay", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // NEW: toggle theatre and persist in localStorage
  const toggleTheatre = () => {
    setTheatre((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ceflix.theatre", JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // 👉 Helper: update URL for a video (no "page change" feeling)
  const updateUrlForVideo = (id: string, title: string) => {
    const slug = formatTitle(title);
    const href = `/videos/watch/${id}/${slug}`;
    router.replace(href); // SPA navigation but same page component
  };

  // NEW: helper to require auth for certain actions
  const requireAuth = (
    action: "like" | "subscribe" | "comment"
  ): boolean => {
    if (!user || !token) {
      setAuthPrompt(action);
      return false;
    }
    return true;
  };

  // Fetch video + comments whenever the *current* video ID changes
  useEffect(() => {
    const id = currentVideoId;
    if (!id) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setLoadError(null);

      try {
        // 1) Fetch the video (unchanged)
        const videoRes = await fetch(API_BASE + "video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify({ video: id, token }),
        });

        // 2) Get X-TOKEN from localStorage: ceflix_auth.token
        let xToken = "";
        try {
          const raw = localStorage.getItem("ceflix_auth");
          if (raw) {
            const parsed = JSON.parse(raw);
            xToken = parsed?.token ?? "";
          }
        } catch {
          xToken = "";
        }

        // 3) Fetch comments with the API you gave
        const commentsRes = await fetch(
          "https://webapi.ceflix.org/api/video/comments",
          {
            method: "POST",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Request-Method": "POST",
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/json",
              "Application-Key": "2567a5ec9705eb7ac2c984033e06189d",
              ...(xToken ? { "X-TOKEN": xToken } : {}),
            },
            body: JSON.stringify({ video: id }),
          }
        );

        const videoJson = await videoRes.json();
        const commentsJson = await commentsRes.json();

        if (!videoJson.status) {
          throw new Error("Video not found");
        }

        if (cancelled) return;

        const v: VideoData = videoJson.data.video;
        setVideo(v);
        setVideoUrl(v.url);
        setDefaultVideoUrl(v.url);
        setLanguages(videoJson.data.languages || []);
        setSelectedLangSlug(null);
        setUpNext(videoJson.data.upnext || []);
        setLikesCount(parseInt(v.likes ?? "0", 10) || 0);
        setLiked(!!videoJson.data.liked);
        setSubscribed(!!videoJson.data.isSubscribed);

        if (commentsJson.status) {
          setComments(commentsJson.data || []);
        } else {
          setComments([]);
        }

        // Count views
        if (user && token) {
          void fetch(API_BASE + "countvideoview", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Application-Key": APP_KEY,
              "X-TOKEN": token,
            },
            body: JSON.stringify({
              email: user.email,
              video: id,
              language: null,
            }),
          });
        } else {
          void fetch(API_BASE + "video/offline-view-count", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Application-Key": APP_KEY,
            },
            body: JSON.stringify({
              video: id,
              device: navigator.userAgent,
            }),
          });
        }
      } catch (err: any) {
        console.error("Error loading video page:", err);
        if (!cancelled) setLoadError(err?.message || "Failed to load video");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [currentVideoId, token, user]);

  const handleChangeLanguage = (lang: Language | null) => {
    if (!video || !defaultVideoUrl || !currentVideoId) return;

    if (!lang) {
      setVideoUrl(defaultVideoUrl);
      setSelectedLangSlug(null);
      // optional: reset URL to default (no lang)
      updateUrlForVideo(currentVideoId, video.videos_title);
      return;
    }

    setVideoUrl(lang.url);
    setSelectedLangSlug(lang.slug);

    // keep ID the same, just update slug in URL to include lang
    const titleWithLang = `${video.videos_title} [${lang.slug}]`;
    updateUrlForVideo(currentVideoId, titleWithLang);
  };

  const handleToggleLike = async () => {
    if (!video || !currentVideoId) return;
    if (!requireAuth("like")) return;

    setLiked((prev) => !prev);
    setLikesCount((prev) => prev + (liked ? -1 : 1));

    try {
      await fetch(API_BASE + "user/video/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token ?? "",
        },
        body: JSON.stringify({
          token,
          video: currentVideoId,
        }),
      });
    } catch (err) {
      console.error("Failed to like video:", err);
    }
  };

  const handleToggleSubscribe = async () => {
    if (!video) return;
    if (!requireAuth("subscribe")) return;

    setSubscribed((prev) => !prev);
    try {
      await fetch(API_BASE + "channel/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          channel: video.channel_id,
          token,
        }),
      });
    } catch (err) {
      console.error("Failed to subscribe:", err);
    }
  };

  const handlePostComment = async () => {
    if (!commentText.trim() || !currentVideoId) return;
    if (!requireAuth("comment")) return;

    setPostingComment(true);
    try {
      const res = await fetch(API_BASE + "video/comment/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          comment: commentText.trim(),
          video: currentVideoId,
          token,
        }),
      });
      const json = await res.json();
      if (json.status && user) {
        const newComment: Comment = {
          id: `temp-${Date.now()}`,
          comment: commentText.trim(),
          fname: user.fname ?? "",
          lname: user.lname ?? "",
          profile_pic:
            user.profile_pic || "https://ceflix.org/images/avatar.png",
          com_time: Date.now() / 1000,
        };
        setComments((prev) => [newComment, ...prev]);
        setCommentText("");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setPostingComment(false);
    }
  };

  // Called when current video ends and autoplay is enabled
  const playFirstUpNext = () => {
    if (!autoplay || !upNext.length) return;
    const next = upNext[0];
    // update URL + ID, fetching happens via currentVideoId effect
    setCurrentVideoId(next.id);
    updateUrlForVideo(next.id, next.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVideoEnded: React.ReactEventHandler<HTMLVideoElement> = () => {
    playFirstUpNext();
  };

  // Up next item click handler (behaves like your React Router example)
  const handleUpNextClick = (item: UpNextItem) => {
    setCurrentVideoId(item.id);
    updateUrlForVideo(item.id, item.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        Loading video…
      </div>
    );
  }

  if (loadError || !video || !videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        {loadError || "Video not found."}
      </div>
    );
  }

  // text used in the auth prompt based on action
  const authPromptTitle =
    authPrompt === "like"
      ? "Like this video?"
      : authPrompt === "subscribe"
      ? "Subscribe to this channel?"
      : "Want to comment?";
  const authPromptSubtitle =
    authPrompt === "like"
      ? "Sign in to make your opinion count."
      : authPrompt === "subscribe"
      ? "Sign in to subscribe to channels."
      : "Sign in to join the conversation.";

  return (
    <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
      <div
        className={`mx-auto px-4 lg:px-6 grid gap-6 ${
          theatre
            ? "max-w-[1400px] grid-cols-1"
            : "max-w-[110rem] lg:grid-cols-11"
        }`}
      >
        {/* Player + info */}
        <div className="col-span-8">
          {/* Video container with theatre-mode height rules */}
          <div
            className={`relative w-full bg-black overflow-hidden mb-3 ${
              theatre ? "rounded-none" : "rounded-lg aspect-video"
            }`}
            style={
              theatre
                ? {
                    maxHeight: "calc(100vh - 189px)",
                    height: "42.25vw",
                    minHeight: "480px",
                  }
                : undefined
            }
          >
            {/* HTML5 video element controlled by Plyr */}
            <video
              key={videoUrl}
              ref={videoRef}
              autoPlay
              muted
              playsInline
              controls
              poster={video.thumbnail}
              className="w-full h-full object-contain bg-black"
              onEnded={handleVideoEnded}
            >
              <source src={videoUrl} />
              Your browser does not support the video tag.
            </video>

            {/* AUTH PROMPT OVERLAY ON VIDEO */}
            {authPrompt && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center">
                <div className="pointer-events-auto mx-4 max-w-xs w-full rounded-2xl bg-neutral-900/95 border border-white/10 px-5 py-4 text-center shadow-xl">
                  <p className="text-lg font-semibold mb-1">
                    {authPromptTitle}
                  </p>
                  <p className="text-md text-neutral-300 mb-4">
                    {authPromptSubtitle}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthPrompt(null);
                      router.push("/login");
                    }}
                    className="cursor-pointer w-full rounded-full bg-white text-black text-md font-semibold py-2 mb-2 hover:bg-neutral-100"
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthPrompt(null)}
                    className="cursor-pointer text-md text-neutral-300 hover:text-white"
                  >
                    Not now
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div className={theatre ? "col-span-2" : "col-span-3"}>
              {/* Title */}
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold tracking-tight">
                {video.videos_title}
                {selectedLangSlug ? ` [${selectedLangSlug.toUpperCase()}]` : ""}
              </h1>

              {/* Channel + actions row (like YouTube) */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                {/* Channel info */}
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-neutral-700 overflow-hidden">
                    <img
                      src={video.channel_prefix + video.channel_file}
                      alt={video.channel}
                      width={40}
                      height={40}
                      className="h-full w-full object-cover aspect-video"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-semibold">
                        {video.channel}
                      </span>
                      {video.isVerified === "1" && (
                        <CheckBadgeIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </div>
                    <p className="text-xs text-neutral-400">
                      {/* YouTube shows subscribers here; we only have views */}
                      {formatViews(video.numOfViews)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSubscribe}
                    className={`cursor-pointer ml-2 text-xs md:text-sm font-semibold rounded-full px-4 py-2 ${
                      subscribed
                        ? "bg-neutral-700 text-white"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    {subscribed ? "Subscribed" : "Subscribe"}
                  </button>
                </div>

                {/* Actions (likes / share / theatre / autoplay) */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {/* Likes */}
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700"
                  >
                    {liked ? (
                      <ThumbsUpSolid className="w-4 h-4 text-red-400" />
                    ) : (
                      <ThumbsUpOutline className="w-4 h-4" />
                    )}
                    <span>{likesCount}</span>
                  </button>

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
                    title={video.videos_title}
                    url={
                      typeof window !== "undefined" ? window.location.href : ""
                    }
                    hashtags={["ceflix"]} // optional
                    id={video.id}
                  />

                  {/* Theatre toggle */}
                  <button
                    type="button"
                    onClick={toggleTheatre}
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-2 text-[11px] md:text-xs font-medium hover:bg-neutral-700"
                  >
                    {theatre ? "Default view" : "Theater mode"}
                  </button>

                  {/* Autoplay toggle (Up next) */}
                  {!isLive && (
                    <button
                      type="button"
                      onClick={toggleAutoplay}
                      className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-2 text-[11px] md:text-xs font-medium hover:bg-neutral-700"
                    >
                      <span>Autoplay</span>
                      <span
                        className={autoplay ? "text-red-400 font-semibold" : ""}
                      >
                        {autoplay ? "On" : "Off"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Description card (like the grey box in the screenshot) */}
              <div className="mt-4 rounded-xl bg-neutral-900/80 px-4 py-3 text-sm">
                <p className="font-semibold text-neutral-100">
                  {formatViews(video.numOfViews)} •{" "}
                  {timeSince(video.uploadtime)}
                </p>

                {video.description && (
                  <p className="mt-2 whitespace-pre-line text-neutral-100">
                    {!video.description ||
                    video.description.length <= 220 ||
                    showFullDescription
                      ? video.description
                      : `${video.description.slice(0, 220)}…`}
                  </p>
                )}

                {video.description && video.description.length > 220 && (
                  <button
                    type="button"
                    onClick={() => setShowFullDescription((prev) => !prev)}
                    className="mt-2 text-xs font-semibold text-neutral-200 hover:text-white"
                  >
                    {showFullDescription ? "Show less" : "More"}
                  </button>
                )}
              </div>

              {/* Languages (optional, under description) */}
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

              {/* Comments */}
              <div className="mt-6">
                <h2 className="text-sm font-semibold mb-2">
                  Comments ({video.numOfComments ?? comments.length})
                </h2>

                <div className="mb-4">
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add your comment…"
                    className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    {postingComment && (
                      <span className="text-red-400">Posting…</span>
                    )}
                    <button
                      type="button"
                      onClick={handlePostComment}
                      className="ml-auto inline-flex items-center rounded-md bg-red-600 px-4 py-1.5 text-xs font-semibold hover:bg-red-700"
                    >
                      Comment
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-neutral-700">
                        <img
                          src={
                            c.profile_pic ||
                            "https://ceflix.org/images/avatar.png"
                          }
                          alt={`${c.fname} ${c.lname}`}
                          width={36}
                          height={36}
                          className="h-full w-full object-cover "
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-bold">
                            {c.fname} {c.lname}
                          </span>
                          <span className="text-neutral-400">
                            {timeSince(c.com_time)}
                          </span>
                        </div>
                        <p className="text-sm mt-1">{c.comment}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-xs text-neutral-500">
                      No comments yet. Be the first to comment.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Up next sidebar when in theatre mode */}
            {theatre && (
              <aside className="mt-6 col-span-1">
                <div className="space-y-3">
                  {upNext
                    .filter((v) => v.isLive === "0")
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleUpNextClick(item)}
                        className="w-full text-left flex gap-3 cursor-pointer"
                      >
                        <div className="relative w-50 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-neutral-900">
                          <img
                            src={item.thumbnail}
                            // alt={item.videos_title}
                            className="w-full h-full object-cover aspect-video"
                          />
                          <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                            {duration(item.duration)}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold line-clamp-2">
                            {item.videos_title}
                          </p>
                          <p className="text-sm text-neutral-400 mt-1">
                            {item.channel}
                          </p>
                          <p className="text-sm text-neutral-500">
                            {formatViews(item.numOfViews)} •{" "}
                            {timeSince(item.uploadtime)}
                          </p>
                        </div>
                      </button>
                    ))}
                  {upNext.length === 0 && (
                    <p className="text-xs text-neutral-500">No more videos.</p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* Up next (non-theatre layout) */}
        {!theatre && (
          <aside className="space-y-3 col-span-3">
            <div className="space-y-3">
              {upNext
                .filter((v) => v.isLive === "0")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUpNextClick(item)}
                    className="w-full text-left flex gap-3 cursor-pointer"
                  >
                    <div className="relative w-50 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-neutral-900">
                      <img
                        src={item.thumbnail}
                        // alt={item.videos_title}
                        className="w-full h-full object-cover aspect-video"
                      />
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                        {duration(item.duration)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold line-clamp-2">
                        {item.videos_title}
                      </p>
                      <p className="text-xs font-semibold text-neutral-400 mt-1">
                        {item.channel}
                      </p>
                      <p className="text-xs font-semibold text-neutral-500 mt-1">
                        {formatViews(item.numOfViews)} •{" "}
                        {timeSince(item.uploadtime)}
                      </p>
                    </div>
                  </button>
                ))}
              {upNext.length === 0 && (
                <p className="text-xs text-neutral-500">No more videos.</p>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
