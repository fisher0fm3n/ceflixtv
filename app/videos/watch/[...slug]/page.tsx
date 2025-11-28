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
  RectangleGroupIcon,
  FlagIcon,
} from "@heroicons/react/24/outline";
import { Switch } from "@headlessui/react";

import {
  CheckBadgeIcon,
  HandThumbUpIcon as ThumbsUpSolid,
} from "@heroicons/react/24/solid";
import { useAuth } from "../../../components/AuthProvider";
import ShareModal from "../../../components/ShareModal";
import Link from "next/link";

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
  // (assuming these exist on the response)
  channel_prefix?: string;
  channel_file?: string;
  subscribers?: string | number;
};

type Comment = {
  id: string;
  fname: string;
  lname: string;
  profile_pic: string;
  com_time: number;
  comment: string;
};

type ReportFlag = {
  id: number;
  title: string;
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

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_350/";

// If URL already contains "cloudinary", leave it as is.
// Otherwise, prefix it with the Cloudinary fetch URL.
function withCloudinaryPrefix(src: string | null): string {
  if (!src) return "";
  if (
    src.toLowerCase().includes("cloudinary") ||
    src.toLowerCase().includes("cloudfront")
  )
    return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

function withCloudinaryPrefix2(src: string | null): string {
  if (!src) return "";
  if (
    src.toLowerCase().includes("cloudinary") ||
    src.toLowerCase().includes("cloudfront")
  )
    return src;
  return `https://res.cloudinary.com/raves-music/image/fetch/w_1200/${encodeURIComponent(
    src
  )}`;
}

function formatSubscribers(v: string | number) {
  const num = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(num)) return "0 subscribers";

  if (num < 1000) {
    return `${num} subscriber${num === 1 ? "" : "s"}`;
  }

  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }

  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]} subscribers`;
}

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
  const slugArray = Array.isArray(slugParam) ? slugParam : [slugParam];

  const initialVideoId = slugArray[0] || null;

  // ✅ Only treat second segment as playlist id if it’s numeric
  const possiblePlaylist = slugArray[1];
  const initialPlaylistId =
    possiblePlaylist && /^\d+$/.test(possiblePlaylist)
      ? possiblePlaylist
      : null;

  // 👉 internal ID we use for fetching / swapping videos
  const [currentVideoId, setCurrentVideoId] = useState<string | null>(
    initialVideoId ?? null
  );

  // keep internal ID in sync if route param changes externally
  useEffect(() => {
    const arr = Array.isArray(params.slug) ? params.slug : [params.slug];
    const vid = arr[0] || null;
    if (vid && vid !== currentVideoId) {
      setCurrentVideoId(vid);
    }
  }, [params.slug]); // eslint-disable-line react-hooks/exhaustive-deps

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
  const [subscribers, setSubscribers] = useState(0);

  const [autoplay, setAutoplay] = useState(false); // "Up next" autoplay
  const [theatre, setTheatre] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const plyrRef = useRef<any | null>(null);
  const hlsRef = useRef<any | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);

  // 🔔 Autoplay preview state
  const [showAutoplayPreview, setShowAutoplayPreview] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(10);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 🔁 Resume playback timestamp from API (data.time)
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  // ⏱️ Refs for tracking playback time & duration (for save history)
  const playbackTimeRef = useRef(0);
  const durationRef = useRef(0);
  const durationUpdatedRef = useRef(false);

  // 🚩 Report state
  const [reportOptions, setReportOptions] = useState<ReportFlag[]>([]);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768); // tweak breakpoint if you want
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // which action is asking the user to sign in ("like" | "subscribe" | "comment" | "report")
  const [authPrompt, setAuthPrompt] = useState<
    null | "like" | "subscribe" | "comment" | "report"
  >(null);

  const isLive = useMemo(
    () => !!videoUrl && videoUrl.endsWith(".m3u8"),
    [videoUrl]
  );

  // restore theatre mode preference from localStorage on mount
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

  // restore autoplay preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ceflix.autoplay");
      if (stored !== null) {
        setAutoplay(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  // Fetch report flags once
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await fetch(`${API_BASE}video/report/flags`, {
          headers: {
            "Application-Key": APP_KEY,
          },
        });
        const data = await res.json();
        if (data?.status && Array.isArray(data.data)) {
          setReportOptions(
            data.data.map((f: any) => ({ id: f.id, title: f.title }))
          );
        }
      } catch (err) {
        console.error("Error fetching report flags", err);
      }
    };
    fetchFlags();
  }, []);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;

    const videoEl = videoRef.current;

    // Always clean up previous HLS instance for the old URL
    if (hlsRef.current) {
      try {
        hlsRef.current.destroy();
      } catch (e) {
        console.warn("HLS destroy failed (ignored):", e);
      }
      hlsRef.current = null;
    }

    const isHls = videoUrl.endsWith(".m3u8");

    (async () => {
      // 1) Set up the media source for this URL
      if (isHls) {
        if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
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

      // 2) Ensure Plyr exists and is wired to this <video>
      const PlyrModule = await import("plyr");
      const Plyr = PlyrModule.default;

      let player = plyrRef.current;

      if (!player) {
        player = new Plyr(videoEl, {
          autoplay: true, // autoplay current video, NOT "up next"
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
            // autoplay blocked
          });
        });
      }

      // Just try to play; no ended handler here
      player.play().catch(() => {
        // ignore autoplay errors
      });
    })();
  }, [videoUrl]);

  useEffect(() => {
    return () => {
      if (plyrRef.current) {
        try {
          plyrRef.current.destroy();
        } catch (e) {
          console.warn("Plyr destroy failed (ignored):", e);
        }
        plyrRef.current = null;
      }

      if (hlsRef.current) {
        try {
          hlsRef.current.destroy();
        } catch (e) {
          console.warn("HLS destroy failed (ignored):", e);
        }
        hlsRef.current = null;
      }

      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
      }
    };
  }, []);

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

  // If autoplay is turned off while the preview is visible, cancel it
  useEffect(() => {
    if (!autoplay) {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      setShowAutoplayPreview(false);
      setAutoplayCountdown(10);
    }
  }, [autoplay]);

  // When current video changes, reset any overlay + playback trackers
  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayPreview(false);
    setAutoplayCountdown(10);

    playbackTimeRef.current = 0;
    durationRef.current = 0;
    durationUpdatedRef.current = false;
    setResumeTime(null);
  }, [currentVideoId]);

  // toggle theatre and persist in localStorage
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
    const href = initialPlaylistId
      ? `/videos/watch/${id}/${initialPlaylistId}/${slug}`
      : `/videos/watch/${id}/${slug}`;

    // Use push so each video becomes its own history entry
    router.push(href);
  };

  // helper to require auth for certain actions
  const requireAuth = (
    action: "like" | "subscribe" | "comment" | "report"
  ): boolean => {
    if (!user || !token) {
      setAuthPrompt(action);
      return false;
    }
    return true;
  };

  // ⭐ Save video watch progress to API
  const saveVideoHistory = async (
    currentTimeMillis: number,
    durationMillis: number
  ) => {
    try {
      if (!token || !currentVideoId) {
        return;
      }

      const req = await fetch(`${API_BASE}savevideotime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          token: token,
          video: currentVideoId,
          currentTime: currentTimeMillis / 1000,
          duration: durationMillis / 1000,
        }),
      });

      const res = await req.json();

      if (res.status) {
        console.log(res);
      }
    } catch (error) {
      console.error("Error saving video history:", error);
    }
  };

  // ⭐ Update video duration in API
  const updatedVideoDuration = async (durationInMillis: number) => {
    try {
      if (!token || !currentVideoId) {
        throw new Error(
          "Token or video id is not available for authentication."
        );
      }

      const response = await fetch(`${API_BASE}updatevideoduration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          video: currentVideoId,
          duration: durationInMillis,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update video duration. Status: ${response.status}, Message: ${errorText}`
        );
      }

      const res = await response.json();

      if (!res.status) {
        throw new Error("API error: " + (res.message || "Unknown error"));
      }

      console.log("Video duration updated successfully");
    } catch (error: any) {
      console.error("Error in updatedVideoDuration:", error.message);
    }
  };

  // ⭐ Play video starting from a timestamp (seconds)
  const playFromTimestamp = async (timeInSeconds: number | string) => {
    const seconds = parseFloat(String(timeInSeconds));

    if (!isNaN(seconds) && videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.currentTime = seconds;

      await new Promise<void>((resolve) => {
        setTimeout(() => {
          console.log("play video from timestamp");
          videoElement
            .play()
            .then(() => resolve())
            .catch(() => resolve());
        }, 1000);
      });

      return true;
    }

    return false;
  };

  // 🚩 Submit report (with loading indicator & inline feedback)
  const handleReportSubmit = async () => {
    if (!currentVideoId) return;

    setReportFeedback(null);

    if (!selectedReport) {
      setReportFeedback({
        type: "error",
        message: "Please select a reason for reporting.",
      });
      return;
    }

    if (!requireAuth("report")) return;

    try {
      setReportSubmitting(true);

      const res = await fetch(`${API_BASE}video/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          video: currentVideoId,
          flag: selectedReport,
          message: reportMessage,
          token: token,
        }),
      });

      const result = await res.json();
      if (result.status) {
        setReportFeedback({
          type: "success",
          message: "Report submitted successfully.",
        });
        setSelectedReport(null);
        setReportMessage("");
        setTimeout(() => {
          setReportOpen(false);
        }, 1500);
      } else {
        setReportFeedback({
          type: "error",
          message: "Failed to submit report. Please try again.",
        });
      }
    } catch (error) {
      console.error("Report submit error:", error);
      setReportFeedback({
        type: "error",
        message: "Failed to submit report. Please try again.",
      });
    } finally {
      setReportSubmitting(false);
    }
  };

  // Save progress when video or page is about to be left
  useEffect(() => {
    return () => {
      if (
        token &&
        currentVideoId &&
        playbackTimeRef.current > 0 &&
        durationRef.current > 0
      ) {
        void saveVideoHistory(
          playbackTimeRef.current * 1000,
          durationRef.current * 1000
        );
      }
    };
  }, [currentVideoId, token]);

  // Fetch video + comments whenever the *current* video ID changes
  useEffect(() => {
    const id = currentVideoId;
    if (!id) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setLoadError(null);

      try {
        // 1) Fetch the video
        const videoRequestBody: any = { video: id, token };
        if (initialPlaylistId) {
          videoRequestBody.playlist = initialPlaylistId;
        }

        const videoRes = await fetch(API_BASE + "video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify(videoRequestBody),
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

        // 3) Fetch comments
        const commentsRes = await fetch(
          "https://webapi.ceflix.org/api/video/comments",
          {
            method: "POST",
            headers: {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Request-Method": "POST",
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
          throw new Error(videoJson.message);
        }

        if (cancelled) return;

        const v: VideoData = videoJson.data.video;
        setVideo(v);
        setVideoUrl(v.url);
        setDefaultVideoUrl(v.url);
        setLanguages(videoJson.data.languages || []);
        setSelectedLangSlug(null);

        // 👇 restore saved playback time from API (data.time)
        const apiTime = videoJson.data?.time;
        const parsedTime =
          typeof apiTime === "number"
            ? apiTime
            : apiTime != null
            ? parseFloat(String(apiTime))
            : 0;
        setResumeTime(!isNaN(parsedTime) && parsedTime > 0 ? parsedTime : null);

        // If a playlist is present, use its "pool" as up-next; otherwise fall back to upnext
        if (Array.isArray(videoJson.data.pool) && videoJson.data.pool.length) {
          const mappedPool: UpNextItem[] = videoJson.data.pool.map(
            (item: any) => ({
              id: String(item.id),
              videos_title: item.videos_title,
              thumbnail: item.thumbnail,
              duration: String(item.duration ?? 0),
              numOfViews: String(item.numOfViews ?? 0),
              uploadtime: String(item.uploadtime ?? ""),
              channel: item.channel,
              isLive: (item.isLive ?? "0") as "0" | "1",
            })
          );
          setUpNext(mappedPool);
        } else {
          setUpNext(videoJson.data.upnext || []);
        }

        setLikesCount(parseInt(v.likes ?? "0", 10) || 0);
        setLiked(!!videoJson.data.liked);
        setSubscribed(!!videoJson.data.isSubscribed);
        setSubscribers(videoJson.data.subscribers);

        // 👇 Store playlist title (if any)
        if (videoJson.data.playlist) {
          setPlaylistTitle(videoJson.data.playlist.playlist_title || "");
        } else {
          setPlaylistTitle(null);
        }

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
  }, [currentVideoId, token, user, initialPlaylistId]);

  useEffect(() => {
    if (video?.videos_title) {
      document.title = `${video.videos_title} - Ceflix Tv`;
    }
  }, [video?.videos_title]);

  const handleChangeLanguage = (lang: Language | null) => {
    if (!video || !defaultVideoUrl) return;

    if (!lang) {
      // Back to original / default source
      setVideoUrl(defaultVideoUrl);
      setSelectedLangSlug(null);
      return;
    }

    // Switch to the selected language source
    setVideoUrl(lang.url);
    setSelectedLangSlug(lang.slug);
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

  // track playback progress & duration
  const handleTimeUpdate: React.ReactEventHandler<HTMLVideoElement> = (e) => {
    const el = e.currentTarget;
    playbackTimeRef.current = el.currentTime || 0;
    if (!isNaN(el.duration)) {
      durationRef.current = el.duration;
    }
  };

  const handleLoadedMetadata: React.ReactEventHandler<HTMLVideoElement> = (
    e
  ) => {
    const el = e.currentTarget;
    if (!isNaN(el.duration)) {
      durationRef.current = el.duration;
      if (!durationUpdatedRef.current && el.duration > 0) {
        durationUpdatedRef.current = true;
        void updatedVideoDuration(el.duration);
      }
    }

    // If we have a stored timestamp from API, resume playback from there
    if (resumeTime && resumeTime > 0) {
      void playFromTimestamp(resumeTime);
    }
  };

  // First non-live up next video (for overlay + autoplay)
  const nextUpVideo = useMemo(
    () => upNext.filter((v) => v.isLive === "0")[0] ?? null,
    [upNext]
  );

  // Called when current video ends and autoplay is enabled
  const playFirstUpNext = () => {
    if (!autoplay || !upNext.length) return;
    const next = upNext.filter((v) => v.isLive === "0")[0];
    if (!next) return;

    setCurrentVideoId(next.id);
    updateUrlForVideo(next.id, next.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Start the 10s countdown + overlay
  const startAutoplayCountdown = () => {
    if (!autoplay || !nextUpVideo) return;

    // already counting down
    if (autoplayTimerRef.current) {
      return;
    }

    setShowAutoplayPreview(true);
    setAutoplayCountdown(10);

    autoplayTimerRef.current = setInterval(() => {
      setAutoplayCountdown((prev) => {
        if (prev <= 1) {
          if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
          }
          // Let it hit 0; effect will handle playing next video
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (
      !autoplay ||
      !nextUpVideo ||
      !showAutoplayPreview ||
      autoplayCountdown !== 0
    ) {
      return;
    }

    // Countdown finished: hide overlay and play the next video
    setShowAutoplayPreview(false);
    playFirstUpNext();
  }, [autoplayCountdown, autoplay, nextUpVideo, showAutoplayPreview]);

  const handleAutoplayCancel = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayPreview(false);
    setAutoplayCountdown(10);
  };

  const handleAutoplayPlayNow = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayPreview(false);
    playFirstUpNext();
  };

  const handleVideoEnded: React.ReactEventHandler<HTMLVideoElement> = () => {
    if (!autoplay || !nextUpVideo) return;
    startAutoplayCountdown();
  };

  // Up next item click handler
  const handleUpNextClick = (item: UpNextItem) => {
    setCurrentVideoId(item.id);
    updateUrlForVideo(item.id, item.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function Skeleton({ className = "" }: { className?: string }) {
    return (
      <div
        className={`animate-pulse bg-neutral-800/80 rounded-md ${className}`}
      />
    );
  }

  const isInitialLoading = loading && !videoUrl;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
        <div className="mx-auto px-4 lg:px-6 max-w-[110rem] grid gap-6 lg:grid-cols-12">
          {/* Left: player + info skeleton */}
          <div className="col-span-8 xl:col-span-9">
            {/* Video skeleton */}
            <div className="w-full bg-black rounded-lg aspect-video overflow-hidden">
              <Skeleton className="w-full h-full rounded-none" />
            </div>

            {/* Title skeleton */}
            <div className="mt-4">
              <Skeleton className="h-6 w-3/4" />
            </div>

            {/* Channel row skeleton */}
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
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>

            {/* Description card skeleton */}
            <div className="mt-4 rounded-xl bg-neutral-900/80 px-4 py-3">
              <Skeleton className="h-4 w-40 mb-3" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>

            {/* Comments skeleton */}
            <div className="mt-6">
              <Skeleton className="h-4 w-40 mb-3" />
              {/* Comment box */}
              <div className="mb-4">
                <Skeleton className="h-20 w-full rounded-md" />
                <div className="mt-2 flex justify-end">
                  <Skeleton className="h-8 w-24 rounded-full" />
                </div>
              </div>

              {/* A few comment items */}
              <div className="space-y-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-start gap-3">
                    <Skeleton className="h-11 w-11 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: “Up next” sidebar skeleton */}
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

  if (loadError || !video || !videoUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-200">
        {loadError || "Video not found."}
      </div>
    );
  }

  let authPromptTitle = "";
  let authPromptSubtitle = "";

  if (authPrompt === "like") {
    authPromptTitle = "Like this video?";
    authPromptSubtitle = "Sign in to make your opinion count.";
  } else if (authPrompt === "subscribe") {
    authPromptTitle = "Subscribe to this channel?";
    authPromptSubtitle = "Sign in to subscribe to channels.";
  } else if (authPrompt === "comment") {
    authPromptTitle = "Want to comment?";
    authPromptSubtitle = "Sign in to join the conversation.";
  } else if (authPrompt === "report") {
    authPromptTitle = "Report this video?";
    authPromptSubtitle = "Sign in to report inappropriate content.";
  }

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
          {/* Video container with theatre-mode height rules */}
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
              poster={withCloudinaryPrefix(video.thumbnail)}
              className={`w-full h-full object-contain bg-black transition-opacity ${
                loading ? "opacity-0" : "opacity-100"
              }`}
              onEnded={handleVideoEnded}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
            >
              {/* <source src={videoUrl} /> */}
              Your browser does not support the video tag.
            </video>

            {/* Skeleton overlay while loading */}
            {loading && (
              <div className="absolute inset-0">
                <Skeleton className="w-full h-full rounded-none" />
              </div>
            )}

            {/* AUTOPLAY PREVIEW OVERLAY */}
            {showAutoplayPreview && autoplay && nextUpVideo && (
              <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-8 mb-8">
                <div className="pointer-events-auto flex w-full max-w-xl items-center gap-4 rounded-2xl bg-black/80 border border-white/10 px-4 py-3 shadow-2xl">
                  {/* Thumbnail */}
                  <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                    <Image
                      src={withCloudinaryPrefix2(nextUpVideo.thumbnail)}
                      alt={nextUpVideo.videos_title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                      {duration(nextUpVideo.duration)}
                    </span>
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-neutral-400">
                      Up next in{" "}
                      <span className="font-semibold text-white">
                        {autoplayCountdown}
                      </span>
                    </p>
                    <p className="mt-1 text-sm font-semibold line-clamp-2">
                      {nextUpVideo.videos_title}
                    </p>
                    <p className="mt-0.5 text-[11px] text-neutral-400 line-clamp-1">
                      {nextUpVideo.channel}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleAutoplayCancel}
                      className="cursor-pointer rounded-full bg-neutral-700/90 px-4 py-1.5 text-xs font-semibold text-neutral-100 hover:bg-neutral-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAutoplayPlayNow}
                      className="cursor-pointer rounded-full bg-red-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-red-500"
                    >
                      Play now
                    </button>
                  </div>
                </div>
              </div>
            )}

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

            {/* REPORT MODAL (on-page) WITH BLACK TRANSPARENT BACKDROP */}
            {reportOpen && (
              <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70">
                <div className="mx-4 w-full max-w-md rounded-2xl bg-neutral-900/95 border border-white/10 px-5 py-4 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                      <FlagIcon className="w-5 h-5" />
                      Report video
                    </h2>
                    <button
                      type="button"
                      onClick={() => {
                        setReportOpen(false);
                        setReportFeedback(null);
                      }}
                      className="text-sm text-neutral-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>

                  <p className="text-xs text-neutral-300 mb-3">
                    Select a reason and optionally add more details.
                  </p>

                  <div className="max-h-40 overflow-y-auto mb-3 space-y-2 text-sm">
                    {reportOptions.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 cursor-pointer text-md"
                      >
                        <input
                          type="radio"
                          name="report-flag"
                          value={option.id}
                          checked={selectedReport === option.id}
                          onChange={() => setSelectedReport(option.id)}
                          className="h-3 w-3 text-md"
                          disabled={reportSubmitting}
                        />
                        <span className="text-md">{option.title}</span>
                      </label>
                    ))}
                    {reportOptions.length === 0 && (
                      <p className="text-xs text-neutral-500">
                        No report options available.
                      </p>
                    )}
                  </div>

                  <textarea
                    value={reportMessage}
                    onChange={(e) => setReportMessage(e.target.value)}
                    placeholder="Additional details (optional)…"
                    className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 mb-3 disabled:opacity-60"
                    rows={3}
                    disabled={reportSubmitting}
                  />

                  {reportFeedback && (
                    <p
                      className={`mb-2 text-xs ${
                        reportFeedback.type === "success"
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {reportFeedback.message}
                    </p>
                  )}

                  {reportSubmitting && (
                    <div className="flex items-center gap-2 mb-3 text-xs text-neutral-300">
                      <div className="h-3 w-3 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
                      <span>Submitting report…</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setReportOpen(false);
                        setReportFeedback(null);
                      }}
                      className="cursor-pointer rounded-full border border-neutral-600 px-4 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                      disabled={reportSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleReportSubmit}
                      disabled={reportSubmitting}
                      className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold ${
                        reportSubmitting
                          ? "bg-white text-black opacity-70 cursor-not-allowed"
                          : "bg-white text-black hover:bg-white/80"
                      }`}
                    >
                      {reportSubmitting ? "Submitting..." : "Submit report"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-8">
            <div
              className={theatre ? "col-span-3 lg:col-span-2" : "col-span-3"}
            >
              {/* Title */}
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold tracking-tight">
                {video.videos_title}
                {selectedLangSlug ? ` [${selectedLangSlug.toUpperCase()}]` : ""}
              </h1>

              {/* Channel + actions row */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                {/* Channel info */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/channel/${video.channel_id}`}
                    className="h-10 w-10 rounded-full bg-neutral-700 overflow-hidden"
                  >
                    <Image
                      src={withCloudinaryPrefix(
                        (video.channel_prefix || "") +
                          (video.channel_file || "") || video.thumbnail
                      )}
                      alt={video.channel}
                      width={40}
                      height={40}
                      unoptimized
                      className="h-full w-full object-cover aspect-video"
                    />
                  </Link>
                  <div>
                    <Link
                      href={`/channel/${video.channel_id}`}
                      className="flex items-center gap-1"
                    >
                      <span className="text-sm font-semibold">
                        {video.channel}
                      </span>
                      {video.isVerified === "1" && (
                        <CheckBadgeIcon className="w-4 h-4 text-blue-400" />
                      )}
                    </Link>
                    <p className="text-xs text-neutral-400">
                      {formatSubscribers(subscribers)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleSubscribe}
                    className={`cursor-pointer ml-2 text-xs md:text-sm font-semibold rounded-full px-4 py-2 ${
                      subscribed
                        ? "bg-neutral-700 text-white hover:bg-neutral-700/80"
                        : "bg-white text-black hover:bg-white/80"
                    }`}
                  >
                    {subscribed ? "Subscribed" : "Subscribe"}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
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

                  <button
                    type="button"
                    onClick={() => {
                      setReportFeedback(null);
                      setReportOpen(true);
                    }}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700"
                  >
                    <FlagIcon className="w-4 h-4" />
                    <span>Report</span>
                  </button>

                  <ShareModal
                    open={shareOpen}
                    setOpen={setShareOpen}
                    title={video.videos_title}
                    url={
                      typeof window !== "undefined" ? window.location.href : ""
                    }
                    hashtags={["ceflix"]}
                    id={video.id}
                  />

                  <button
                    type="button"
                    onClick={toggleTheatre}
                    aria-pressed={theatre}
                    aria-label={
                      theatre ? "Exit theater mode" : "Enter theater mode"
                    }
                    className="hidden lg:block cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700"
                  >
                    <RectangleGroupIcon className="w-5 h-5" />
                  </button>

                  {!isLive && (
                    <div className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold">
                      <Switch
                        checked={autoplay}
                        onChange={toggleAutoplay}
                        className={`${
                          autoplay ? "bg-red-600" : "bg-neutral-500"
                        } relative inline-flex h-5 w-10 items-center rounded-full`}
                      >
                        <span
                          className={`${
                            autoplay ? "translate-x-6" : "translate-x-1"
                          } inline-block h-3 w-3 transform rounded-full bg-white transition`}
                        />
                      </Switch>
                      <span className="select-none text-sm font-medium text-heading">
                        Autoplay
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Description card */}
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

              {/* Languages */}
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
                    className="w-full rounded-md bg-neutral-900 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
                  />
                  <div className="mt-2 flex items-center justify-between text-xs">
                    {postingComment && (
                      <span className="text-white">Posting…</span>
                    )}
                    <button
                      type="button"
                      onClick={handlePostComment}
                      className="cursor-pointer ml-auto text-black inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-semibold hover:bg-white/80"
                    >
                      Comment
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {comments.map((c) => (
                    <div key={c.id} className="flex items-start gap-3">
                      <div className="h-11 w-11 rounded-full overflow-hidden bg-neutral-700">
                        <Image
                          src={withCloudinaryPrefix(
                            c.profile_pic ||
                              "https://ceflix.org/images/avatar.png"
                          )}
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
              <aside className="mt-6 col-span-3 lg:col-span-1">
                {playlistTitle && (
                  <h3 className="text-md font-bold mb-2 text-white">
                    Playlist - {playlistTitle}
                  </h3>
                )}
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                  {upNext
                    .filter((v) => v.isLive === "0")
                    .map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleUpNextClick(item)}
                        className={`w-full p-2 lg:max-w-sm text-left flex flex-col lg:flex-row gap-2 lg:gap-3 cursor-pointer rounded-lg ${
                          String(item.id) === String(currentVideoId)
                            ? "bg-neutral-600/20 ring-2 ring-neutral-500"
                            : "hover:bg-neutral-900"
                        }`}
                      >
                        {/* Thumbnail with fixed desktop width, full width on mobile */}
                        <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-xl overflow-hidden bg-neutral-900">
                          <Image
                            src={withCloudinaryPrefix(item.thumbnail)}
                            className="object-cover"
                            alt={item.videos_title}
                            fill
                            sizes="(max-width: 1024px) 50vw, 160px"
                          />
                          <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                            {duration(item.duration)}
                          </span>
                        </div>

                        {/* Text */}
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
                    <p className="text-xs text-neutral-500">No more videos.</p>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>

        {/* Up next (non-theatre layout) */}
        {!theatre && (
          <aside className="col-span-8 lg:col-span-4 xl:col-span-3">
            {playlistTitle && (
              <h3 className="text-md font-bold mb-2 text-white">
                Playlist - {playlistTitle}
              </h3>
            )}

            {/* Grid on mobile/tablet, single column on large screens */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1">
              {upNext
                .filter((v) => v.isLive === "0")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUpNextClick(item)}
                    className={`w-full p-2 sm:max-w-sm text-left flex flex-col lg:flex-row gap-2 lg:gap-3 cursor-pointer rounded-lg ${
                      String(item.id) === String(currentVideoId)
                        ? "bg-neutral-600/20 ring-2 ring-neutral-500"
                        : "hover:bg-neutral-900"
                    }`}
                  >
                    <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-sm overflow-hidden bg-neutral-900">
                      <Image
                        src={withCloudinaryPrefix(item.thumbnail)}
                        className="object-cover"
                        alt={item.videos_title}
                        fill
                        unoptimized
                        sizes="(max-width: 1024px) 50vw, 160px"
                      />
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                        {duration(item.duration)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 mt-1 lg:mt-0">
                      <p className="text-sm font-semibold line-clamp-2">
                        {item.videos_title}
                      </p>

                      {String(item.id) === String(currentVideoId) && (
                        <p className="text-[11px] text-red-400 font-semibold mt-0.5">
                          Now playing
                        </p>
                      )}

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
