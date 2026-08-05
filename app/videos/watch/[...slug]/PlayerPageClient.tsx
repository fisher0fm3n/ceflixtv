// app/player/[...slug]/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  HandThumbUpIcon as ThumbsUpOutline,
  ShareIcon,
  RectangleGroupIcon,
  FlagIcon,
  GiftIcon,
  EllipsisHorizontalIcon,
  HeartIcon as HeartIconOutline,
} from "@heroicons/react/24/outline";
import {
  CheckBadgeIcon,
  HeartIcon,
  HandThumbUpIcon as ThumbsUpSolid,
} from "@heroicons/react/24/solid";
import { Switch } from "@headlessui/react";
import { ListBulletIcon, PlusIcon } from "@heroicons/react/24/outline";

import { useAuth } from "../../../components/AuthProvider";
import ShareModal from "../../../components/ShareModal";
import VideoJsPlayer from "@/app/components/VideoJsPlayer";
import ProcessingPlaceholder from "@/app/components/ProcessingPlaceholder";
import { Quality, normalizeQualities } from "@/app/lib/quality";

const DEFAULT_AVATAR = "https://ceflix.org/images/avatar.png";
// const API_BASE = "http://127.0.0.1:8000/api/";
const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

// ✅ Support endpoint
const SUPPORT_ENDPOINT = "https://webapi.ceflix.org/api/user/channel/support";

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
  channel_prefix?: string;
  channel_file?: string;
  subscribers?: string | number;
  qualities?: Quality[];
  /** True while the encoder is still running; url/ios_url are null. */
  is_processing?: boolean;
  processing_state?: "processing" | "ready";
  processing_message?: string | null;
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

type Playlist = {
  id: number;
  playlist_title: string;
  playlist_thumbnail: string | null;
  videos_payload: string | null;
  visibility: "public" | "private";
};

function timeSince(unix: number | string) {
  const ts =
    typeof unix === "string" ? parseInt(unix, 10) * 1000 : unix * 1000;

  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);

  const fmt = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"} ago`;

  if (minutes < 1) return "Just now";
  if (minutes < 60) return fmt(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fmt(hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 7) return fmt(days, "day");

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return fmt(weeks, "week");

  const months = Math.floor(days / 30);
  if (months < 12) return fmt(months, "month");

  const years = Math.floor(days / 365);
  return fmt(years, "year");
}

const durationFmt = (seconds: number | string) => {
  const s = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  const val = new Date(s * 1000).toISOString();
  if (val.substring(12, 13) === "0") return val.substring(14, 19);
  return val.substring(12, 19);
};

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_850/";
function withCloudinaryPrefix(src: string | null): string {
  if (!src) return "";
  const s = src.toLowerCase();
  if (s.includes("cloudinary") || s.includes("cloudfront")) return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}
function withCloudinaryPrefix2(src: string | null): string {
  if (!src) return "";
  const s = src.toLowerCase();
  if (s.includes("cloudinary") || s.includes("cloudfront")) return src;
  return `https://res.cloudinary.com/raves-music/image/fetch/w_850/${encodeURIComponent(
    src,
  )}`;
}

function formatSubscribers(v: string | number) {
  const num = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(num)) return "0 followers";
  if (num < 1000) return `${num} follower${num === 1 ? "" : "s"}`;
  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]} followers`;
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

export default function PlayerPage() {
  const params = useParams<{ slug: string[] | string }>();
  const router = useRouter();
  const { token, user } = useAuth();

  const slugParam = params.slug;
  const slugArray = Array.isArray(slugParam) ? slugParam : [slugParam];
  const initialVideoId = slugArray[0] || null;

  const possiblePlaylist = slugArray[1];
  const initialPlaylistId =
    possiblePlaylist && /^\d+$/.test(possiblePlaylist)
      ? possiblePlaylist
      : null;

  const [currentVideoId, setCurrentVideoId] = useState<string | null>(
    initialVideoId ?? null,
  );

  useEffect(() => {
    const arr = Array.isArray(params.slug) ? params.slug : [params.slug];
    const vid = arr[0] || null;
    if (vid && vid !== currentVideoId) setCurrentVideoId(vid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [video, setVideo] = useState<VideoData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [defaultVideoUrl, setDefaultVideoUrl] = useState<string | null>(null);
  const [qualities, setQualities] = useState<Quality[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
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
  const [support, setSupport] = useState(false);

  const [autoplay, setAutoplay] = useState(false);
  const [theatre, setTheatre] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [isMobile, setIsMobile] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState<string | null>(null);

  // Autoplay preview
  const [showAutoplayPreview, setShowAutoplayPreview] = useState(false);
  const [autoplayCountdown, setAutoplayCountdown] = useState(4);
  const autoplayTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Resume time from API (seconds)
  const [resumeTime, setResumeTime] = useState<number | null>(null);

  // Playback tracking (seconds)
  const playbackTimeRef = useRef(0);
  const durationRef = useRef(0);
  const durationUpdatedRef = useRef(false);

  const INITIAL_COMMENTS = 14;
  const COMMENTS_STEP = 10;

  const [visibleComments, setVisibleComments] = useState(INITIAL_COMMENTS);

  // Report
  const [reportOptions, setReportOptions] = useState<ReportFlag[]>([]);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // auth prompt
  const [authPrompt, setAuthPrompt] = useState<
    null | "like" | "subscribe" | "comment" | "report" | "support"
  >(null);

  // ✅ SUPPORT MODAL STATE
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportKcUsername, setSupportKcUsername] = useState("");
  const [supportPin, setSupportPin] = useState("");
  const [supportAmount, setSupportAmount] = useState<string>("0");
  const [supportMessage, setSupportMessage] = useState<string>("");
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportFeedback, setSupportFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [supportResult, setSupportResult] = useState<null | {
    payin_reference: string;
    payout?: {
      payout_amount: number;
      client_reference: string;
      payout_reference: string;
      wallet_address: string;
    } | null;
  }>(null);

  const isLive = useMemo(
    () => !!videoUrl && videoUrl.endsWith(".m3u8"),
    [videoUrl],
  );

  // Translated audio tracks are single files with no rendition ladder behind
  // them, so the quality menu has nothing to offer while one is selected.
  const playerQualities = useMemo(
    () => (selectedLangSlug || isLive ? [] : qualities),
    [selectedLangSlug, isLive, qualities],
  );

  // More menu (ellipsis) + auto flip
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [moreMenuPlacement, setMoreMenuPlacement] = useState<"top" | "bottom">(
    "top",
  );
  const moreWrapRef = useRef<HTMLDivElement | null>(null);
  const moreBtnRef = useRef<HTMLButtonElement | null>(null);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  // ✅ PLAYLIST MODAL STATE
  const [playlistOpen, setPlaylistOpen] = useState(false);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistFeedback, setPlaylistFeedback] = useState<null | {
    type: "success" | "error";
    message: string;
  }>(null);

  const [createPlaylistMode, setCreatePlaylistMode] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [newPlaylistVisibility, setNewPlaylistVisibility] = useState<
    "public" | "private"
  >("public");
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const [playlistUpdatingId, setPlaylistUpdatingId] = useState<number | null>(
    null,
  );

  const isInPlaylist = (videoId: string | null, payload: string | null) => {
    if (!videoId || !payload) return false;
    try {
      return payload
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .includes(String(videoId));
    } catch {
      return false;
    }
  };

  const fetchPlaylists = async () => {
    if (!token) return;
    setPlaylistsLoading(true);
    setPlaylistFeedback(null);
    try {
      const res = await fetch(`${API_BASE}user/playlists`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (data?.status && Array.isArray(data.data)) {
        setPlaylists(data.data as Playlist[]);
      } else {
        setPlaylists([]);
        setPlaylistFeedback({
          type: "error",
          message: data?.message || "Failed to load playlists.",
        });
      }
    } catch (e) {
      setPlaylistFeedback({
        type: "error",
        message: "Network error loading playlists.",
      });
    } finally {
      setPlaylistsLoading(false);
    }
  };

  const toggleVideoInPlaylist = async (
    playlistId: number,
    playlistName: string,
  ) => {
    if (!currentVideoId || !token) return;

    setPlaylistUpdatingId(playlistId);
    setPlaylistFeedback(null);

    // ✅ OPTIMISTIC UPDATE (instant UI)
    setPlaylists((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;

        const ids = (pl.videos_payload ?? "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

        const vid = String(currentVideoId);
        const exists = ids.includes(vid);

        const nextIds = exists ? ids.filter((x) => x !== vid) : [...ids, vid];

        return { ...pl, videos_payload: nextIds.join(",") };
      }),
    );

    try {
      const res = await fetch(`${API_BASE}user/playlist/insert`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          token,
          playlist: playlistId,
          video: currentVideoId,
        }),
      });

      // Some endpoints don’t return JSON reliably on PATCH — don’t fail because of that.
      let data: any = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }

      // ✅ Success (even if data.status is missing/false)
      setPlaylistFeedback({
        type: "success",
        message: `"${playlistName}" updated.`,
      });
    } catch (e) {
      // ❌ Only rollback when it truly fails
      await fetchPlaylists(); // or remove this if you prefer to trust optimistic update
      setPlaylistFeedback({
        type: "error",
        message: "Failed to update playlist. Please try again.",
      });
    } finally {
      setPlaylistUpdatingId(null);
    }
  };

  const createPlaylist = async () => {
    if (!requireAuth("like")) return;
    if (!token) return;

    const title = newPlaylistTitle.trim();
    if (!title) {
      setPlaylistFeedback({
        type: "error",
        message: "Playlist title is required.",
      });
      return;
    }

    if (!currentVideoId) {
      setPlaylistFeedback({
        type: "error",
        message: "Video id not available.",
      });
      return;
    }

    setCreatingPlaylist(true);
    setPlaylistFeedback(null);

    try {
      const res = await fetch(`${API_BASE}user/playlist/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          token,
          video: Number(currentVideoId), // ✅ pass video id on create
          title,
          visibility: newPlaylistVisibility,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || `Request failed (${res.status})`);
      }

      if (!data?.status || !data?.data) {
        setPlaylistFeedback({
          type: "error",
          message: data?.message || "Failed to create playlist.",
        });
        return;
      }

      const created: Playlist = {
        id: Number(data.data.id),
        playlist_title: data.data.playlist_title,
        playlist_thumbnail: data.data.playlist_thumbnail ?? null,
        videos_payload:
          data.data.videos_payload != null
            ? String(data.data.videos_payload)
            : null,
        visibility: data.data.visibility === "public" ? "public" : "private",
      };

      // ✅ instantly add it to the list at the top
      setPlaylists((prev) => [created, ...prev]);

      setPlaylistFeedback({
        type: "success",
        message: `Playlist "${created.playlist_title}" created.`,
      });

      setNewPlaylistTitle("");
      setCreatePlaylistMode(false);

      // Optional: refresh in background to stay perfectly in sync (not required)
      // await fetchPlaylists();
    } catch (e) {
      setPlaylistFeedback({
        type: "error",
        message: "Network error creating playlist.",
      });
    } finally {
      setCreatingPlaylist(false);
    }
  };

  const openPlaylistModal = async () => {
    if (!requireAuth("like")) return;
    setPlaylistOpen(true);
    setCreatePlaylistMode(false);
    setPlaylistFeedback(null);
    await fetchPlaylists();
  };

  useEffect(() => {
    setVisibleComments(INITIAL_COMMENTS);
  }, [currentVideoId]);

  // responsive breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // restore theatre preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ceflix.theatre");
      if (stored !== null) setTheatre(JSON.parse(stored));
    } catch {}
  }, []);

  // restore autoplay preference
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ceflix.autoplay");
      if (stored !== null) setAutoplay(JSON.parse(stored));
    } catch {}
  }, []);

  // close menu on outside click / escape
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!moreWrapRef.current) return;
      if (!moreWrapRef.current.contains(e.target as Node))
        setMoreMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMoreMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // auto flip placement when menu opens
  useEffect(() => {
    if (!moreMenuOpen) return;

    const raf = requestAnimationFrame(() => {
      const btn = moreBtnRef.current;
      const menu = moreMenuRef.current;
      if (!btn || !menu) return;

      const btnRect = btn.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();

      const spaceAbove = btnRect.top;
      const spaceBelow = window.innerHeight - btnRect.bottom;

      const gap = 10;
      const fitsTop = spaceAbove >= menuRect.height + gap;
      const fitsBottom = spaceBelow >= menuRect.height + gap;

      if (!fitsTop && fitsBottom) setMoreMenuPlacement("bottom");
      else setMoreMenuPlacement("top");
    });

    return () => cancelAnimationFrame(raf);
  }, [moreMenuOpen]);

  // Fetch report flags once
  useEffect(() => {
    const fetchFlags = async () => {
      try {
        const res = await fetch(`${API_BASE}video/report/flags`, {
          headers: { "Application-Key": APP_KEY },
        });
        const data = await res.json();
        if (data?.status && Array.isArray(data.data)) {
          setReportOptions(
            data.data.map((f: any) => ({ id: f.id, title: f.title })),
          );
        }
      } catch (err) {
        console.error("Error fetching report flags", err);
      }
    };
    fetchFlags();
  }, []);

  const toggleAutoplay = () => {
    setAutoplay((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ceflix.autoplay", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    if (!autoplay) {
      if (autoplayTimerRef.current) {
        clearInterval(autoplayTimerRef.current);
        autoplayTimerRef.current = null;
      }
      setShowAutoplayPreview(false);
      setAutoplayCountdown(4);
    }
  }, [autoplay]);

  useEffect(() => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayPreview(false);
    setAutoplayCountdown(4);

    playbackTimeRef.current = 0;
    durationRef.current = 0;
    durationUpdatedRef.current = false;
    setResumeTime(null);
    setMoreMenuOpen(false);
  }, [currentVideoId]);

  const toggleTheatre = () => {
    setTheatre((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("ceflix.theatre", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const updateUrlForVideo = (id: string, title: string) => {
    const slug = formatTitle(title);
    const href = initialPlaylistId
      ? `/videos/watch/${id}/${initialPlaylistId}/${slug}`
      : `/videos/watch/${id}/${slug}`;
    router.push(href);
  };

  const requireAuth = (
    action: "like" | "subscribe" | "comment" | "report" | "support",
  ): boolean => {
    if (!user || !token) {
      setAuthPrompt(action);
      return false;
    }
    return true;
  };

  // ✅ Open Support Modal (prefill kc_username with channel name)
  const openSupportModal = () => {
    if (!requireAuth("support")) return;
    if (!video) return;

    setSupportFeedback(null);
    setSupportResult(null);

    // prefill kc username as channel (can be edited)
    setSupportKcUsername("");
    setSupportPin("");
    setSupportAmount("0");
    setSupportMessage("");
    setSupportOpen(true);
  };

  const submitSupport = async () => {
    if (!video) return;
    if (!token) return;

    setSupportFeedback(null);
    setSupportResult(null);

    const amt = parseFloat(supportAmount);
    if (!supportKcUsername.trim()) {
      setSupportFeedback({
        type: "error",
        message: "Espees username is required.",
      });
      return;
    }
    if (!supportPin.trim()) {
      setSupportFeedback({ type: "error", message: "PIN is required." });
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setSupportFeedback({
        type: "error",
        message: "Enter a valid amount greater than 0.",
      });
      return;
    }

    // user_name payload (your backend expects it per your example)
    const userName = user?.email
      ? `kc:${user.email}`
      : user?.username
        ? `kc:${user.username}`
        : "kc:unknown";

    const payload = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : undefined,
      token,
      channel_id: Number(video.channel_id),
      channel_name: video.channel,
      user_name: userName,
      user_message: supportMessage,
      kc_username: supportKcUsername.trim(),
      pin: supportPin.trim(),
      amount: amt,
    };

    setSupportSubmitting(true);
    try {
      const res = await fetch(SUPPORT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Application-Key": APP_KEY, // ✅ keep consistent with the rest of your API calls
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // HTTP error (e.g., 500, 422)
        const msg =
          data?.message ||
          (typeof data === "string" ? data : null) ||
          `Request failed (${res.status})`;
        setSupportFeedback({ type: "error", message: msg });
        return;
      }

      if (!data?.status) {
        setSupportFeedback({
          type: "error",
          message:
            data?.message ||
            "Unable to process support payment. Please try again.",
        });
        return;
      }

      setSupportFeedback({
        type: "success",
        message: data?.message || "Payment recorded.",
      });
      setSupportResult({
        payin_reference: data?.data?.payin_reference,
        payout: data?.data?.payout ?? null,
      });

      // clear pin after success
      setSupportPin("");
    } catch (e) {
      console.error("Support payment error:", e);
      setSupportFeedback({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      });
    } finally {
      setSupportSubmitting(false);
    }
  };

  const saveVideoHistory = async (
    currentTimeMillis: number,
    durationMillis: number,
  ) => {
    try {
      if (!token || !currentVideoId) return;

      const req = await fetch(`${API_BASE}savevideotime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          token,
          video: currentVideoId,
          currentTime: currentTimeMillis / 1000,
          duration: durationMillis / 1000,
        }),
      });

      const res = await req.json();
      if (res.status) console.log(res);
    } catch (error) {
      console.error("Error saving video history:", error);
    }
  };

  const updatedVideoDuration = async (durationInSeconds: number) => {
    try {
      if (!token || !currentVideoId)
        throw new Error(
          "Token or video id is not available for authentication.",
        );

      const response = await fetch(`${API_BASE}updatevideoduration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          video: currentVideoId,
          duration: durationInSeconds,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update video duration. Status: ${response.status}, Message: ${errorText}`,
        );
      }

      const res = await response.json();
      if (!res.status)
        throw new Error("API error: " + (res.message || "Unknown error"));
    } catch (error: any) {
      console.error("Error in updatedVideoDuration:", error.message);
    }
  };

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
          token,
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
        setTimeout(() => setReportOpen(false), 1500);
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

  // Save progress on unmount
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
          durationRef.current * 1000,
        );
      }
    };
  }, [currentVideoId, token]);

  // Fetch video + comments
  useEffect(() => {
    const id = currentVideoId;
    if (!id) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setLoadError(null);

      try {
        const videoRequestBody: any = { video: id, token };
        if (initialPlaylistId) videoRequestBody.playlist = initialPlaylistId;

        const videoRes = await fetch(API_BASE + "video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify(videoRequestBody),
        });

        // X-TOKEN from localStorage
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

        const commentsRes = await fetch(`${API_BASE}video/comments`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
            ...(xToken ? { "X-TOKEN": xToken } : {}),
          },
          body: JSON.stringify({ video: id }),
        });

        const videoJson = await videoRes.json();
        const commentsJson = await commentsRes.json();

        if (!videoJson.status) throw new Error(videoJson.message);
        if (cancelled) return;

        const v: VideoData = videoJson.data.video;
        setVideo(v);
        // The API withholds playback URLs while the encoder is still running,
        // so `url` is null here rather than a link that would 403.
        setIsProcessing(Boolean(v.is_processing));
        setVideoUrl(v.url);
        setDefaultVideoUrl(v.url);
        setQualities(normalizeQualities(v.qualities));
        setLanguages(videoJson.data.languages || []);
        setSelectedLangSlug(null);

        const apiTime = videoJson.data?.time;
        const parsedTime =
          typeof apiTime === "number"
            ? apiTime
            : apiTime != null
              ? parseFloat(String(apiTime))
              : 0;
        setResumeTime(!isNaN(parsedTime) && parsedTime > 0 ? parsedTime : null);

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
            }),
          );
          setUpNext(mappedPool);
        } else {
          setUpNext(videoJson.data.upnext || []);
        }

        setLikesCount(parseInt(v.likes ?? "0", 10) || 0);
        setLiked(!!videoJson.data.liked);
        setSupport(!!videoJson.data.creator_support);
        setSubscribed(!!videoJson.data.isSubscribed);
        setSubscribers(videoJson.data.subscribers);

        if (videoJson.data.playlist)
          setPlaylistTitle(videoJson.data.playlist.playlist_title || "");
        else setPlaylistTitle(null);

        if (commentsJson.status) setComments(commentsJson.data || []);
        else setComments([]);

        setVisibleComments(INITIAL_COMMENTS);

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
            body: JSON.stringify({ video: id, device: navigator.userAgent }),
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

  /**
   * Poll while the encoder is still running.
   *
   * Encoding takes anywhere from seconds to several minutes, so rather than
   * leaving the viewer to guess and refresh, re-check until the API hands back
   * a playable URL and then swap the placeholder for the player.
   */
  useEffect(() => {
    if (!isProcessing || !currentVideoId) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const check = async () => {
      try {
        const res = await fetch(API_BASE + "video", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify({ video: currentVideoId }),
        });

        const json = await res.json();
        const v = json?.data?.video;

        if (cancelled) return;

        if (json?.status && v && !v.is_processing && v.url) {
          setVideo(v);
          setVideoUrl(v.url);
          setDefaultVideoUrl(v.url);
          setQualities(normalizeQualities(v.qualities));
          setIsProcessing(false);
          return;
        }
      } catch {
        // A failed poll is not worth surfacing — the next one may succeed.
      }

      if (!cancelled) timer = setTimeout(check, 15_000);
    };

    timer = setTimeout(check, 15_000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isProcessing, currentVideoId]);

  useEffect(() => {
    if (video?.videos_title)
      document.title = `${video.videos_title} - Ceflix Tv`;
  }, [video?.videos_title]);

  const handleChangeLanguage = (lang: Language | null) => {
    if (!video || !defaultVideoUrl) return;
    if (!lang) {
      setVideoUrl(defaultVideoUrl);
      setSelectedLangSlug(null);
      return;
    }
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
        body: JSON.stringify({ token, video: currentVideoId }),
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
        body: JSON.stringify({ channel: video.channel_id, token }),
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
        setVisibleComments((prev) => Math.max(prev, INITIAL_COMMENTS)); // keeps at least 6 visible
        setCommentText("");
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    } finally {
      setPostingComment(false);
    }
  };

  // Video.js progress hooks
  const handleProgress = (currentTime: number, dur: number) => {
    playbackTimeRef.current = currentTime || 0;
    if (!isNaN(dur)) durationRef.current = dur;
  };

  const handleLoadedMetadata = (dur: number) => {
    if (!isNaN(dur)) {
      durationRef.current = dur;
      if (!durationUpdatedRef.current && dur > 0) {
        durationUpdatedRef.current = true;
        void updatedVideoDuration(dur);
      }
    }
  };

  // Build a non-live playlist queue (stable order)
  const playlistQueue = useMemo(
    () => upNext.filter((v) => v.isLive === "0"),
    [upNext],
  );

  // Find current index inside the queue
  const currentQueueIndex = useMemo(() => {
    if (!currentVideoId) return -1;
    return playlistQueue.findIndex(
      (v) => String(v.id) === String(currentVideoId),
    );
  }, [playlistQueue, currentVideoId]);

  // Next video (wrap to first if last)
  const nextUpVideo = useMemo(() => {
    if (!playlistQueue.length) return null;

    // If current isn't in the queue, fallback to first
    if (currentQueueIndex < 0) return playlistQueue[0];

    const nextIndex =
      currentQueueIndex + 1 < playlistQueue.length ? currentQueueIndex + 1 : 0;

    return playlistQueue[nextIndex] ?? null;
  }, [playlistQueue, currentQueueIndex]);

  const playNextInQueue = () => {
    if (!autoplay) return;
    if (!nextUpVideo) return;

    setCurrentVideoId(nextUpVideo.id);
    updateUrlForVideo(nextUpVideo.id, nextUpVideo.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const playFirstUpNext = () => {
    if (!autoplay || !upNext.length) return;
    const next = upNext.filter((v) => v.isLive === "0")[0];
    if (!next) return;

    setCurrentVideoId(next.id);
    updateUrlForVideo(next.id, next.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startAutoplayCountdown = () => {
    if (!autoplay || !nextUpVideo) return;
    if (autoplayTimerRef.current) return;

    setShowAutoplayPreview(true);
    setAutoplayCountdown(4);

    autoplayTimerRef.current = setInterval(() => {
      setAutoplayCountdown((prev) => {
        if (prev <= 1) {
          if (autoplayTimerRef.current) {
            clearInterval(autoplayTimerRef.current);
            autoplayTimerRef.current = null;
          }
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
    )
      return;
    setShowAutoplayPreview(false);
    playNextInQueue();
  }, [autoplayCountdown, autoplay, nextUpVideo, showAutoplayPreview]);

  const handleAutoplayCancel = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayPreview(false);
    setAutoplayCountdown(4);
  };

  const handleAutoplayPlayNow = () => {
    if (autoplayTimerRef.current) {
      clearInterval(autoplayTimerRef.current);
      autoplayTimerRef.current = null;
    }
    setShowAutoplayPreview(false);
    playNextInQueue();
  };

  const handleVideoEnded = () => {
    if (!autoplay || !nextUpVideo) return;
    startAutoplayCountdown();
  };

  const handleUpNextClick = (item: UpNextItem) => {
    setCurrentVideoId(item.id);
    updateUrlForVideo(item.id, item.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const isInitialLoading = loading && !videoUrl;

  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
        <div className="mx-auto px-4 lg:px-6 max-w-[110rem] grid gap-6 lg:grid-cols-12">
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
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
            <div className="mt-4 rounded-lg bg-neutral-900/80 px-4 py-3">
              <Skeleton className="h-4 w-40 mb-3" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-3 w-5/6 mb-2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>

          <aside className="col-span-8 lg:col-span-4 xl:col-span-3">
            <Skeleton className="h-5 w-40 mb-3" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2 px-4">
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
  } else if (authPrompt === "support") {
    authPromptTitle = "Support this channel?";
    authPromptSubtitle = "Sign in to send support.";
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white pb-10">
      {/* 🎵 PLAYLIST MODAL */}
      {playlistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-neutral-900/95 border border-white/10 px-5 py-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <ListBulletIcon className="w-5 h-5" />
                Save to playlist
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (
                    playlistsLoading ||
                    creatingPlaylist ||
                    playlistUpdatingId
                  )
                    return;
                  setPlaylistOpen(false);
                  setPlaylistFeedback(null);
                }}
                className="cursor-pointer text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 mb-3">
              Add this video to one or more playlists.
            </p>

            {/* List */}
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {playlistsLoading ? (
                <div className="text-xs text-neutral-300 flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
                  <span>Loading playlists…</span>
                </div>
              ) : playlists.length === 0 ? (
                <p className="text-xs text-neutral-500">No playlists yet.</p>
              ) : (
                playlists.map((pl) => {
                  const checked = isInPlaylist(
                    currentVideoId,
                    pl.videos_payload,
                  );
                  const rowBusy = playlistUpdatingId === pl.id;

                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() =>
                        toggleVideoInPlaylist(pl.id, pl.playlist_title)
                      }
                      disabled={rowBusy}
                      className={[
                        "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left",
                        "border-white/10 hover:bg-white/5 active:bg-white/10",
                        rowBusy
                          ? "opacity-70 cursor-not-allowed"
                          : "cursor-pointer",
                      ].join(" ")}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">
                          {pl.playlist_title}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {pl.visibility === "public" ? "Public" : "Private"}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {rowBusy ? (
                          <div className="h-4 w-4 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
                        ) : (
                          <div
                            className={[
                              "h-4 w-4 rounded border",
                              checked
                                ? "bg-red-600 border-red-600"
                                : "border-neutral-500",
                            ].join(" ")}
                          />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Feedback */}
            {playlistFeedback && (
              <p
                className={`mt-3 text-xs ${
                  playlistFeedback.type === "success"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {playlistFeedback.message}
              </p>
            )}

            {/* Footer */}
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setCreatePlaylistMode((v) => !v)}
                className="cursor-pointer inline-flex items-center gap-2 text-xs font-semibold text-neutral-200 hover:text-white"
              >
                <PlusIcon className="w-4 h-4" />
                {createPlaylistMode ? "Cancel" : "Create playlist"}
              </button>

              <button
                type="button"
                onClick={fetchPlaylists}
                className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                disabled={
                  playlistsLoading || creatingPlaylist || !!playlistUpdatingId
                }
              >
                Refresh
              </button>
            </div>

            {/* Create */}
            {createPlaylistMode && (
              <div className="mt-4 rounded-xl border border-white/10 bg-black/30 p-3 space-y-3">
                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    Title
                  </label>
                  <input
                    value={newPlaylistTitle}
                    onChange={(e) => setNewPlaylistTitle(e.target.value)}
                    className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    disabled={creatingPlaylist}
                  />
                </div>

                <div>
                  <label className="block text-xs text-neutral-300 mb-1">
                    Visibility
                  </label>
                  <select
                    value={newPlaylistVisibility}
                    onChange={(e) =>
                      setNewPlaylistVisibility(
                        e.target.value === "public" ? "public" : "private",
                      )
                    }
                    className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
                    disabled={creatingPlaylist}
                  >
                                        <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={createPlaylist}
                    disabled={creatingPlaylist}
                    className={`cursor-pointer rounded-full px-4 py-2 text-xs font-semibold ${
                      creatingPlaylist
                        ? "bg-white text-black opacity-70 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/80"
                    }`}
                  >
                    {creatingPlaylist ? "Creating..." : "Create"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 🚩 REPORT MODAL */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-neutral-900/95 border border-white/10 px-5 py-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <FlagIcon className="w-5 h-5" />
                Report video
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (reportSubmitting) return;
                  setReportOpen(false);
                  setReportFeedback(null);
                }}
                className="cursor-pointer text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 mb-3">
              Please select a reason for reporting this content.
            </p>

            {/* Reasons */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {reportOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2 cursor-pointer ${
                    selectedReport === opt.id
                      ? "border-red-500 bg-red-500/10"
                      : "border-white/10 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    checked={selectedReport === opt.id}
                    onChange={() => setSelectedReport(opt.id)}
                    className="hidden"
                  />
                  <span className="text-sm">{opt.title}</span>
                </label>
              ))}
            </div>

            {/* Message */}
            <div className="mt-3">
              <label className="block text-xs text-neutral-300 mb-1">
                Additional details (optional)
              </label>
              <textarea
                rows={3}
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
                disabled={reportSubmitting}
              />
            </div>

            {reportFeedback && (
              <p
                className={`mt-2 text-xs ${
                  reportFeedback.type === "success"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {reportFeedback.message}
              </p>
            )}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                disabled={reportSubmitting}
                className="cursor-pointer rounded-full border border-neutral-600 px-4 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-60"
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
      {/* ✅ SUPPORT MODAL */}
      {supportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-neutral-900/95 border border-white/10 px-5 py-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GiftIcon className="w-5 h-5" />
                Gift {video.channel}
              </h2>
              <button
                type="button"
                onClick={() => {
                  if (supportSubmitting) return;
                  setSupportOpen(false);
                  setSupportFeedback(null);
                  setSupportResult(null);
                }}
                className="cursor-pointer text-sm text-neutral-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 mb-3">
              Enter your Espees details and amount to support this channel.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  Espees Username
                </label>
                <input
                  value={supportKcUsername}
                  onChange={(e) => setSupportKcUsername(e.target.value)}
                  placeholder=""
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
                  disabled={supportSubmitting}
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  PIN
                </label>
                <input
                  type="password"
                  value={supportPin}
                  onChange={(e) => setSupportPin(e.target.value)}
                  placeholder="****"
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
                  disabled={supportSubmitting}
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.00000001"
                  min="0"
                  value={supportAmount}
                  onChange={(e) => setSupportAmount(e.target.value)}
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
                  disabled={supportSubmitting}
                />
                <p className="mt-1 text-[11px] text-neutral-400">
                  Amount is in Espees.
                </p>
              </div>

              {/* Optional message (kept, since backend supports it) */}
              <div>
                <label className="block text-xs text-neutral-300 mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={supportMessage}
                  onChange={(e) => setSupportMessage(e.target.value)}
                  rows={2}
                  placeholder=""
                  className="w-full rounded-md bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
                  disabled={supportSubmitting}
                />
              </div>

              {supportFeedback && (
                <p
                  className={`text-xs ${supportFeedback.type === "success" ? "text-green-400" : "text-red-400"}`}
                >
                  {supportFeedback.message}
                </p>
              )}

              {supportSubmitting && (
                <div className="flex items-center gap-2 text-xs text-neutral-300">
                  <div className="h-3 w-3 rounded-full border border-neutral-400 border-t-transparent animate-spin" />
                  <span>Processing payment…</span>
                </div>
              )}

              {supportResult?.payin_reference && (
                <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-xs">
                  <p className="text-neutral-300">
                    Reference:{" "}
                    <span className="text-white font-semibold">
                      {supportResult.payin_reference}
                    </span>
                  </p>
                  {/* {supportResult.payout && (
                    <p className="text-neutral-400 mt-1">
                      Payout:{" "}
                      <span className="text-white font-semibold">{supportResult.payout.payout_amount}</span>{" "}
                      → {supportResult.payout.wallet_address}
                    </p>
                  )} */}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (supportSubmitting) return;
                  setSupportOpen(false);
                  setSupportFeedback(null);
                  setSupportResult(null);
                }}
                className="cursor-pointer rounded-full border border-neutral-600 px-4 py-1.5 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:opacity-60"
                disabled={supportSubmitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitSupport}
                disabled={supportSubmitting}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-xs font-semibold ${
                  supportSubmitting
                    ? "bg-white text-black opacity-70 cursor-not-allowed"
                    : "bg-white text-black hover:bg-white/80"
                }`}
              >
                {supportSubmitting ? "Processing..." : "Support"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`mx-auto lg:px-6 grid gap-3 ${
          theatre
            ? "max-w-[1400px] grid-cols-1"
            : "max-w-[110rem] grid-cols-1 lg:grid-cols-[8.6fr_3.4fr]"
        }`}
      >
        {/* LEFT */}
        <div className="min-w-0">
          {/* Player container */}
          <div
            className="relative w-full bg-black overflow-hidden mb-3 lg:rounded-lg"
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
            <div
              className={
                theatre && !isMobile
                  ? "h-full relative"
                  : "relative aspect-video"
              }
            >
              {isProcessing ? (
                <ProcessingPlaceholder
                  poster={withCloudinaryPrefix(video.thumbnail)}
                  message={video.processing_message}
                />
              ) : (
                <VideoJsPlayer
                  src={videoUrl}
                  poster={withCloudinaryPrefix(video.thumbnail)}
                  autoplay
                  muted={false}
                  playsInline
                  loading={loading}
                  qualities={playerQualities}
                  startTime={resumeTime}
                  onProgress={handleProgress}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={handleVideoEnded}
                  className="absolute inset-0"
                />
              )}
            </div>

            {/* AUTOPLAY PREVIEW OVERLAY */}
            {showAutoplayPreview && autoplay && nextUpVideo && (
              <div className="pointer-events-none absolute inset-0 z-30 flex items-end justify-center pb-8">
                <div className="pointer-events-auto mx-4 flex w-full max-w-xl items-center gap-4 rounded-2xl bg-black/80 border border-white/10 px-4 py-3 shadow-2xl">
                  <div className="relative h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg bg-neutral-900">
                    <Image
                      src={withCloudinaryPrefix2(nextUpVideo.thumbnail)}
                      alt={nextUpVideo.videos_title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                      {durationFmt(nextUpVideo.duration)}
                    </span>
                  </div>

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

            {/* AUTH PROMPT OVERLAY */}
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

          {/* Main content */}
          <div className="grid grid-cols-3 gap-8 px-4 lg:px-0">
            <div
              className={theatre ? "col-span-3 lg:col-span-2" : "col-span-3"}
            >
              <h1 className="mt-2 text-xl md:text-2xl font-extrabold tracking-tight">
                {video.videos_title}
                {selectedLangSlug ? ` [${selectedLangSlug.toUpperCase()}]` : ""}
              </h1>

              {/* Channel + actions */}
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                {/* Channel info */}
                <div className="flex items-center gap-3">
                  <Link
                    href={`/channel/${video.channel_id}`}
                    className="relative h-10 w-10 rounded-full bg-neutral-700 overflow-hidden"
                  >
                    <Image
                      src={withCloudinaryPrefix(
                        (video.channel_prefix || "") +
                          (video.channel_file || "") || video.thumbnail,
                      )}
                      alt={video.channel}
                      fill
                      unoptimized
                      className="object-cover"
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
                    <p className="text-sm text-neutral-400">
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
                    {subscribed ? "Following" : "Follow"}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  {/* Like */}
                  <button
                    type="button"
                    onClick={handleToggleLike}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700 active:bg-neutral-600"
                  >
                    {liked ? (
                      <HeartIcon className="w-4 h-4 text-red-500" />
                    ) : (
                      <HeartIconOutline className="w-4 h-4" />
                    )}
                    <span>{likesCount}</span>
                  </button>

                  <button
                    type="button"
                    onClick={openPlaylistModal}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700 active:bg-neutral-600"
                  >
                    <ListBulletIcon className="w-4 h-4" />
                    <span>Playlist</span>
                  </button>

                  {/* Share */}
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700 active:bg-neutral-600"
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
                    hashtags={["ceflix"]}
                    id={video.id}
                  />

                  {support && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        openSupportModal();
                      }}
                      className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800 px-4 py-2 text-xs md:text-sm font-semibold hover:bg-neutral-700 active:bg-neutral-600"
                    >
                      <GiftIcon className="w-4 h-4" />
                      <span>Gift Creator</span>
                    </button>
                  )}

                  {/* Ellipsis menu */}
                  <div ref={moreWrapRef} className="relative">
                    <button
                      ref={moreBtnRef}
                      type="button"
                      onClick={() => setMoreMenuOpen((v) => !v)}
                      aria-haspopup="menu"
                      aria-expanded={moreMenuOpen}
                      className={`cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-600 ${
                        moreMenuOpen ? "ring-2 ring-white/10" : ""
                      }`}
                    >
                      <EllipsisHorizontalIcon className="h-5 w-5" />
                    </button>

                    {moreMenuOpen && (
                      <div
                        ref={moreMenuRef}
                        role="menu"
                        className={[
                          "absolute right-[-6rem] sm:right-0 z-40 w-64 max-w-[90vw] max-h-[70vh] overflow-auto",
                          "rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur",
                          "transition-all duration-150 ease-out",
                          moreMenuPlacement === "top"
                            ? "bottom-full mb-2 origin-bottom"
                            : "top-full mt-2 origin-top",
                        ].join(" ")}
                      >
                        {/* ✅ Support */}
                        {/* {support && (
                          <button
                            role="menuitem"
                            type="button"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              openSupportModal();
                            }}
                            className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 active:bg-white/10"
                          >
                            <GiftIcon className="h-5 w-5 text-neutral-200" />
                            <span className="font-medium">Gift Creator</span>
                          </button>
                        )} */}

                        {/* Report */}
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMoreMenuOpen(false);
                            setReportFeedback(null);
                            setReportOpen(true);
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 active:bg-white/10"
                        >
                          <FlagIcon className="h-5 w-5 text-neutral-200" />
                          <span className="font-medium">Report</span>
                        </button>

                        {/* Theatre */}
                        <button
                          role="menuitem"
                          type="button"
                          onClick={() => {
                            setMoreMenuOpen(false);
                            toggleTheatre();
                          }}
                          className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 active:bg-white/10"
                        >
                          <RectangleGroupIcon className="h-5 w-5 text-neutral-200" />
                          <span className="font-medium">
                            {theatre ? "Exit theatre mode" : "Theatre mode"}
                          </span>
                        </button>

                        {!isLive && (
                          <>
                            <div className="mx-2 h-px bg-white/10" />
                            <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span
                                  className={`h-2.5 w-2.5 rounded-full ${autoplay ? "bg-red-500" : "bg-neutral-500"}`}
                                />
                                <span className="text-sm font-medium">
                                  Autoplay
                                </span>
                              </div>

                              <Switch
                                checked={autoplay}
                                onChange={(v) => {
                                  setAutoplay(() => {
                                    try {
                                      localStorage.setItem(
                                        "ceflix.autoplay",
                                        JSON.stringify(v),
                                      );
                                    } catch {}
                                    return v;
                                  });
                                }}
                                className={`${autoplay ? "bg-red-600" : "bg-neutral-600"} relative inline-flex h-5 w-10 cursor-pointer items-center rounded-full`}
                              >
                                <span
                                  className={`${autoplay ? "translate-x-6" : "translate-x-1"} inline-block h-3 w-3 transform rounded-full bg-white transition`}
                                />
                              </Switch>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mt-4 rounded-lg bg-neutral-900/80 px-4 py-3 text-sm">
                <p className="font-semibold text-neutral-100">
                  {/* {formatViews(video.numOfViews)} •{" "} */}
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
                    className="cursor-pointer mt-2 text-xs font-semibold text-neutral-200 hover:text-white"
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
                      className={`cursor-pointer text-xs rounded-full px-3 py-1 ${
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
                        className={`cursor-pointer text-xs rounded-full px-3 py-1 ${
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
                  {comments.slice(0, visibleComments).map((c) => (
                    <div key={c.id} className="flex items-start gap-3 min-w-0">
                      <div className="relative h-11 w-11 rounded-full overflow-hidden bg-neutral-700 aspect-square">
                        <Image
                          src={c.profile_pic ? c.profile_pic : DEFAULT_AVATAR}
                          alt=""
                          fill
                          unoptimized
                          className="object-cover"
                          onError={(e) => {
                            const img =
                              e.currentTarget as unknown as HTMLImageElement;
                            if (img.src !== DEFAULT_AVATAR)
                              img.src = DEFAULT_AVATAR;
                          }}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-white font-bold">
                            {c.fname} {c.lname}
                          </span>
                          <span className="text-neutral-400">
                            {timeSince(c.com_time)}
                          </span>
                        </div>

                        <p className="text-sm mt-1 whitespace-pre-wrap break-words">
                          {c.comment}
                        </p>
                      </div>
                    </div>
                  ))}
                  {comments.length > visibleComments && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleComments((prev) =>
                            Math.min(prev + COMMENTS_STEP, comments.length),
                          )
                        }
                        className="cursor-pointer rounded-full border border-neutral-700 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-900"
                      >
                        Show more
                      </button>
                    </div>
                  )}
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
                        className={`cursor-pointer w-full p-2 lg:max-w-sm text-left flex flex-col lg:flex-row gap-2 lg:gap-3 rounded-lg ${
                          String(item.id) === String(currentVideoId)
                            ? "bg-neutral-600/20 ring-2 ring-neutral-500"
                            : "hover:bg-neutral-900"
                        }`}
                      >
                        <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-neutral-900">
                          <Image
                            src={withCloudinaryPrefix(item.thumbnail)}
                            alt={item.videos_title}
                            fill
                            unoptimized
                            sizes="(max-width: 1024px) 50vw, 160px"
                            className="object-cover"
                          />
                          <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                            {durationFmt(item.duration)}
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
                            {/* {formatViews(item.numOfViews)} •{" "} */}
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

        {/* RIGHT (non-theatre) */}
        {!theatre && (
          <aside className="min-w-0">
            {playlistTitle && (
              <h3 className="text-md font-bold mb-2 text-white">
                Playlist - {playlistTitle}
              </h3>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 px-4">
              {upNext
                .filter((v) => v.isLive === "0")
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleUpNextClick(item)}
                    className={`cursor-pointer w-full p-2 sm:max-w-sm text-left flex flex-col lg:flex-row gap-2 lg:gap-3 rounded-lg ${
                      String(item.id) === String(currentVideoId)
                        ? "bg-neutral-600/20 ring-2 ring-neutral-500"
                        : "hover:bg-neutral-900"
                    }`}
                  >
                    <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-lg overflow-hidden bg-neutral-900">
                      <Image
                        src={withCloudinaryPrefix(item.thumbnail)}
                        alt={item.videos_title}
                        fill
                        unoptimized
                        sizes="(max-width: 1024px) 50vw, 160px"
                        className="object-cover"
                      />
                      <span className="absolute bottom-1 right-1 rounded-sm bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold">
                        {durationFmt(item.duration)}
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
                        {/* {formatViews(item.numOfViews)} •{" "} */}
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
