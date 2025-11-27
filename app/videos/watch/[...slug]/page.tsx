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
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768); // tweak breakpoint if you want
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // which action is asking the user to sign in ("like" | "subscribe" | "comment")
  const [authPrompt, setAuthPrompt] = useState<
    null | "like" | "subscribe" | "comment"
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

    // 1) Set up the media source for this URL
    (async () => {
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

        plyrRef.current = player;

        player.on("ready", () => {
          player.play().catch(() => {
            // autoplay blocked
          });
        });
      }

      // 3) Update the "ended" handler for the new upNext/autoplay values
      player.off("ended"); // remove previous handler if any
      player.on("ended", () => {
        if (autoplay && upNext.length > 0) {
          const next = upNext[0];
          setCurrentVideoId(next.id);
          updateUrlForVideo(next.id, next.videos_title);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      });

      // Try to start playing the new language/source
      player.play().catch(() => {
        // ignore autoplay errors
      });
    })();
  }, [videoUrl, autoplay, upNext, router]);

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
  const requireAuth = (action: "like" | "subscribe" | "comment"): boolean => {
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

  // Called when current video ends and autoplay is enabled
  const playFirstUpNext = () => {
    if (!autoplay || !upNext.length) return;
    const next = upNext[0];
    setCurrentVideoId(next.id);
    updateUrlForVideo(next.id, next.videos_title);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVideoEnded: React.ReactEventHandler<HTMLVideoElement> = () => {
    playFirstUpNext();
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

  // if (loading) {
  //   return (
  //     <div className="min-h-screen bg-neutral-950 text-white pt-4 pb-10">
  //       <div className="mx-auto px-4 lg:px-6 max-w-[110rem] grid gap-6 lg:grid-cols-12">
  //         {/* Left: player + info skeleton */}
  //         <div className="col-span-8 xl:col-span-9">
  //           {/* Video skeleton */}
  //           <div className="w-full bg-black rounded-lg aspect-video overflow-hidden">
  //             <Skeleton className="w-full h-full rounded-none" />
  //           </div>

  //           {/* Title skeleton */}
  //           <div className="mt-4">
  //             <Skeleton className="h-6 w-3/4" />
  //           </div>

  //           {/* Channel row skeleton */}
  //           <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
  //             <div className="flex items-center gap-3">
  //               <Skeleton className="h-10 w-10 rounded-full" />
  //               <div className="space-y-1">
  //                 <Skeleton className="h-4 w-28" />
  //                 <Skeleton className="h-3 w-20" />
  //               </div>
  //               <Skeleton className="h-8 w-24 rounded-full ml-2" />
  //             </div>

  //             <div className="flex flex-wrap items-center gap-2 md:gap-3">
  //               <Skeleton className="h-8 w-20 rounded-full" />
  //               <Skeleton className="h-8 w-20 rounded-full" />
  //               <Skeleton className="h-8 w-24 rounded-full" />
  //               <Skeleton className="h-8 w-24 rounded-full" />
  //             </div>
  //           </div>

  //           {/* Description card skeleton */}
  //           <div className="mt-4 rounded-xl bg-neutral-900/80 px-4 py-3">
  //             <Skeleton className="h-4 w-40 mb-3" />
  //             <Skeleton className="h-3 w-full mb-2" />
  //             <Skeleton className="h-3 w-5/6 mb-2" />
  //             <Skeleton className="h-3 w-2/3" />
  //           </div>

  //           {/* Comments skeleton */}
  //           <div className="mt-6">
  //             <Skeleton className="h-4 w-40 mb-3" />
  //             {/* Comment box */}
  //             <div className="mb-4">
  //               <Skeleton className="h-20 w-full rounded-md" />
  //               <div className="mt-2 flex justify-end">
  //                 <Skeleton className="h-8 w-24 rounded-full" />
  //               </div>
  //             </div>

  //             {/* A few comment items */}
  //             <div className="space-y-4">
  //               {[0, 1, 2].map((i) => (
  //                 <div key={i} className="flex items-start gap-3">
  //                   <Skeleton className="h-11 w-11 rounded-full" />
  //                   <div className="flex-1 space-y-2">
  //                     <Skeleton className="h-4 w-32" />
  //                     <Skeleton className="h-3 w-full" />
  //                     <Skeleton className="h-3 w-4/5" />
  //                   </div>
  //                 </div>
  //               ))}
  //             </div>
  //           </div>
  //         </div>

  //         {/* Right: “Up next” sidebar skeleton */}
  //         <aside className="col-span-8 lg:col-span-4 xl:col-span-3">
  //           <Skeleton className="h-5 w-40 mb-3" />
  //           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-1 gap-2">
  //             {[0, 1, 2, 3].map((i) => (
  //               <div
  //                 key={i}
  //                 className="w-full p-2 sm:max-w-sm flex flex-col lg:flex-row gap-2 rounded-lg"
  //               >
  //                 <div className="relative w-full lg:w-40 flex-shrink-0 aspect-video rounded-md overflow-hidden bg-neutral-900">
  //                   <Skeleton className="w-full h-full rounded-none" />
  //                 </div>
  //                 <div className="flex-1 min-w-0 mt-1 lg:mt-0 space-y-2">
  //                   <Skeleton className="h-4 w-full" />
  //                   <Skeleton className="h-3 w-2/3" />
  //                   <Skeleton className="h-3 w-1/2" />
  //                 </div>
  //               </div>
  //             ))}
  //           </div>
  //         </aside>
  //       </div>
  //     </div>
  //   );
  // }

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
              poster={video.thumbnail}
              className={`w-full h-full object-contain bg-black transition-opacity ${
                loading ? "opacity-0" : "opacity-100"
              }`}
              onEnded={handleVideoEnded}
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
                  <div className="h-10 w-10 rounded-full bg-neutral-700 overflow-hidden">
                    <img
                      src={
                        (video.channel_prefix || "") +
                          (video.channel_file || "") || video.thumbnail
                      }
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
                    className="inline-flex items-center gap-2 rounded-full bg-neutral-800 px-3 py-2 text-[11px] md:text-xs font-medium hover:bg-neutral-700"
                  >
                    {theatre ? "Default view" : "Theater mode"}
                  </button>

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
                          <img
                            src={item.thumbnail}
                            className="w-full h-full object-cover"
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
                      <img
                        src={item.thumbnail}
                        className="w-full h-full object-cover"
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
