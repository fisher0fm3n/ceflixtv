"use client";

import {
  useRef,
  useState,
  useEffect,
  memo,
  useMemo,
  useCallback,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ShareIcon,
  FlagIcon,
  HeartIcon as HeartIconOutline,
} from "@heroicons/react/24/outline";
import {
  HeartIcon as HeartIconSolid,
  CheckBadgeIcon,
} from "@heroicons/react/24/solid";
import ShareModal from "../../components/ShareModal";
import { useAuth } from "../../components/AuthProvider";

const Plyr = dynamic(() => import("plyr-react"), {
  ssr: false,
});

import "plyr-react/plyr.css";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const LIMIT = 10;
const FALLBACK_AVATAR = "https://ceflix.org/images/avatar.png";
const HEADER_HEIGHT = 72;

const PLAYER_OPTIONS = {
  autoplay: true,
  loop: { active: true },
  hideControls: true,
  playsinline: true,
  disableContextMenu: true,
  speed: { selected: 1, options: [0.75, 1, 1.25] },
  controls: ["play-large", "play", "mute"],
};

const getInitialVideoIdFromUrl = (): number | null => {
  if (typeof window === "undefined") return null;

  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const lastPart = pathParts[pathParts.length - 1];

  if (lastPart && /^\d+$/.test(lastPart)) {
    return Number(lastPart);
  }

  const searchParams = new URLSearchParams(window.location.search);
  const queryVideoId = searchParams.get("videoID");
  if (queryVideoId && /^\d+$/.test(queryVideoId)) {
    return Number(queryVideoId);
  }

  return null;
};

function formatCompactNumber(v: number | string | null | undefined) {
  const num = typeof v === "string" ? parseInt(v, 10) : Number(v ?? 0);
  if (!Number.isFinite(num) || num <= 0) return "0";
  if (num < 1000) return String(num);
  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]}`;
}

type ReportFlag = {
  id: number;
  title: string;
};

type PlayerProps = {
  view: boolean;
  title: string;
  src: string;
  poster: string | null;
  channelId: number;
  channelName: string;
  channelProfilePicture: string | null;
  channelVerified?: boolean;
  liked: boolean;
  likesCount: number;
  subscribed: boolean;
  onLike: () => void;
  onSubscribe: () => void;
  onShare: () => void;
  onReport: () => void;
};

const Player = memo(
  function Player({
    view,
    title,
    src,
    poster,
    channelId,
    channelName,
    channelProfilePicture,
    channelVerified = false,
    liked,
    likesCount,
    subscribed,
    onLike,
    onSubscribe,
    onShare,
    onReport,
  }: PlayerProps) {
    const ref = useRef<any>(null);

    const source = useMemo(
      () => ({
        type: "video",
        title,
        sources: [
          {
            src: view ? src : "",
            type: "video/mp4",
            size: 1080,
          },
        ],
        poster: poster || undefined,
      }),
      [view, src, title, poster],
    );

    return (
      <div className="h-full w-full bg-black">
        <div className="flex h-full w-full items-center justify-center px-0 md:px-6">
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden">
            <div className="relative h-full w-full max-w-[430px] overflow-hidden rounded-none bg-black md:h-[calc(100svh-110px)] md:rounded-2xl">
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 h-64 bg-gradient-to-t from-black via-black/85 to-transparent md:h-52" />

              <div className="absolute inset-x-0 bottom-0 z-40 px-3 pb-[max(2.6rem,env(safe-area-inset-bottom))] text-white sm:px-4 md:pb-8">
                <div className="max-w-[calc(100%-72px)] md:max-w-[calc(100%-84px)]">
                  <h1 className="line-clamp-3 text-sm font-semibold leading-snug sm:text-base">
                    {title}
                  </h1>

                  <div className="mt-3 flex items-center gap-3">
                    <Link
                      href={`/channel/${channelId}`}
                      className="flex min-w-0 items-center"
                    >
                      <img
                        alt="avatar"
                        className="h-9 w-9 rounded-full object-cover sm:h-10 sm:w-10"
                        src={channelProfilePicture || FALLBACK_AVATAR}
                      />
                      <div className="ml-2 min-w-0">
                        <div className="flex items-center gap-1">
                          <h2 className="truncate text-xs font-semibold sm:text-sm">
                            {channelName}
                          </h2>
                          {channelVerified && (
                            <CheckBadgeIcon className="h-4 w-4 shrink-0 text-blue-400" />
                          )}
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={onSubscribe}
                      className={`inline-flex cursor-pointer shrink-0 items-center rounded-full px-4 py-2 text-xs font-semibold sm:text-sm ${
                        subscribed
                          ? "bg-neutral-700/95 text-white hover:bg-neutral-600"
                          : "bg-white text-black hover:bg-white/90"
                      }`}
                    >
                      {subscribed ? "Following" : "Follow"}
                    </button>
                  </div>
                </div>
              </div>

              <Plyr ref={ref} source={source} options={PLAYER_OPTIONS} />
            </div>

            <div className="absolute right-2 bottom-24 z-50 flex flex-col items-center gap-4 text-white md:right-[max(calc(50%-295px),1rem)] md:bottom-16">
              <button
                type="button"
                onClick={onLike}
                className="inline-flex cursor-pointer flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800/90 backdrop-blur hover:bg-neutral-700 active:bg-neutral-600">
                  {liked ? (
                    <HeartIconSolid className="h-7 w-7 text-white" />
                  ) : (
                    <HeartIconOutline className="h-7 w-7 text-white" />
                  )}
                </span>
                <span className="text-xs font-semibold">
                  {formatCompactNumber(likesCount)}
                </span>
              </button>

              <button
                type="button"
                onClick={onReport}
                className="inline-flex cursor-pointer flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800/90 backdrop-blur hover:bg-neutral-700 active:bg-neutral-600">
                  <FlagIcon className="h-7 w-7 text-white" />
                </span>
                <span className="text-xs font-semibold">Report</span>
              </button>

              <button
                type="button"
                onClick={onShare}
                className="inline-flex cursor-pointer flex-col items-center gap-1"
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-800/90 backdrop-blur hover:bg-neutral-700 active:bg-neutral-600">
                  <ShareIcon className="h-7 w-7 text-white" />
                </span>
                <span className="text-xs font-semibold">Share</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.view === next.view &&
    prev.title === next.title &&
    prev.src === next.src &&
    prev.poster === next.poster &&
    prev.channelId === next.channelId &&
    prev.channelName === next.channelName &&
    prev.channelProfilePicture === next.channelProfilePicture &&
    prev.channelVerified === next.channelVerified &&
    prev.liked === next.liked &&
    prev.likesCount === next.likesCount &&
    prev.subscribed === next.subscribed &&
    prev.onLike === next.onLike &&
    prev.onSubscribe === next.onSubscribe &&
    prev.onShare === next.onShare &&
    prev.onReport === next.onReport,
);

type ClipItem = {
  id: number;
  title: string;
  src: string;
  poster: string | null;
  channelId: number;
  channelName: string;
  channelProfilePicture: string | null;
  channelVerified?: boolean;
  likes?: number;
  liked?: boolean;
  subscribed?: boolean;
};

export default function CeClipsComponent() {
  const { token, user } = useAuth();

  const [items, setItems] = useState<ClipItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const [likedMap, setLikedMap] = useState<Record<number, boolean>>({});
  const [likesCountMap, setLikesCountMap] = useState<Record<number, number>>(
    {},
  );
  const [subscribedMap, setSubscribedMap] = useState<Record<number, boolean>>(
    {},
  );

  const [reportOptions, setReportOptions] = useState<ReportFlag[]>([]);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [reportMessage, setReportMessage] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportFeedback, setReportFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [authPrompt, setAuthPrompt] = useState<
    null | "like" | "subscribe" | "report"
  >(null);

  const splideRef = useRef<any>(null);

  const itemsRef = useRef<ClipItem[]>([]);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastRequestedOffsetRef = useRef(0);
  const initialVideoIdRef = useRef<number | null>(null);
  const countedViewIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    initialVideoIdRef.current = getInitialVideoIdFromUrl();
  }, []);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const requireAuth = useCallback(
    (action: "like" | "subscribe" | "report") => {
      if (!user || !token) {
        setAuthPrompt(action);
        return false;
      }
      return true;
    },
    [token, user],
  );

  const countView = useCallback(
    async (videoId: number) => {
      if (!videoId || countedViewIdsRef.current.has(videoId)) return;

      countedViewIdsRef.current.add(videoId);

      try {
        if (user?.email && token) {
          await fetch(API_BASE + "countvideoview", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Application-Key": APP_KEY,
              "X-TOKEN": token,
            },
            body: JSON.stringify({
              email: user.email,
              video: videoId,
              language: null,
            }),
          });
        } else {
          await fetch(API_BASE + "video/offline-view-count", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Application-Key": APP_KEY,
            },
            body: JSON.stringify({
              video: videoId,
              device:
                typeof navigator !== "undefined"
                  ? navigator.userAgent
                  : "unknown-device",
            }),
          });
        }
      } catch (error) {
        countedViewIdsRef.current.delete(videoId);
        console.error("Error counting clip view:", error);
      }
    },
    [token, user],
  );

  const loadShorts = async (initial = false) => {
    if (!initial && (loadingMoreRef.current || !hasMoreRef.current)) return;

    try {
      if (initial) {
        setLoading(true);
        setLikedMap({});
        setLikesCountMap({});
        setSubscribedMap({});
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }

      const currentOffset = initial ? 0 : itemsRef.current.length;

      const body: Record<string, any> = {
        offset: currentOffset,
        limit: LIMIT,
        token: token ?? "",
      };

      if (initial && initialVideoIdRef.current) {
        body.videoID = initialVideoIdRef.current;
      }

      const res = await fetch(API_BASE + "video/shorts/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const json = await res.json();
      const data = Array.isArray(json?.data) ? json.data : [];

      const mapped: ClipItem[] = data.map((v: any) => ({
        id: Number(v.id),
        title: v.videos_title ?? "",
        src: v.url ?? "",
        poster: v.thumbnail ?? null,
        channelId: Number(v.channel_id ?? v.channel?.id ?? 0),
        channelName: v.channel?.channel ?? "",
        channelProfilePicture: v.channel?.url ?? null,
        channelVerified:
          String(v.channel?.isVerified ?? v.isVerified ?? "0") === "1",
        likes: parseInt(String(v.likes ?? 0), 10) || 0,
        liked: !!v.liked,
        subscribed: !!v.isSubscribed,
      }));

      setItems((prev) => {
        if (initial) return mapped;

        const existingIds = new Set(prev.map((item) => item.id));
        const deduped = mapped.filter((item) => !existingIds.has(item.id));
        return [...prev, ...deduped];
      });

      setLikedMap((prev) => {
        const next = initial ? {} : { ...prev };
        for (const item of mapped) {
          next[item.id] = !!item.liked;
        }
        return next;
      });

      setLikesCountMap((prev) => {
        const next = initial ? {} : { ...prev };
        for (const item of mapped) {
          next[item.id] = Number(item.likes ?? 0);
        }
        return next;
      });

      setSubscribedMap((prev) => {
        const next = initial ? {} : { ...prev };
        for (const item of mapped) {
          next[item.channelId] = !!item.subscribed;
        }
        return next;
      });

      if (initial) {
        hasMoreRef.current = data.length >= LIMIT;
        setHasMore(data.length >= LIMIT);
        lastRequestedOffsetRef.current = 0;

        const initialId = initialVideoIdRef.current;
        if (initialId) {
          const foundIndex = mapped.findIndex((item) => item.id === initialId);
          setIndex(foundIndex >= 0 ? foundIndex : 0);
          setTimeout(() => {
            const splide = splideRef.current?.splide;
            if (splide && foundIndex > 0) {
              splide.go(foundIndex);
            }
          }, 0);
        } else {
          setIndex(0);
          setTimeout(() => {
            const splide = splideRef.current?.splide;
            if (splide) splide.go(0);
          }, 0);
        }
      } else {
        if (data.length < LIMIT) {
          hasMoreRef.current = false;
          setHasMore(false);
        } else {
          hasMoreRef.current = true;
          setHasMore(true);
        }

        setTimeout(() => {
          const splide = splideRef.current?.splide;
          if (splide) splide.refresh();
        }, 0);
      }
    } catch (e) {
      console.error("Error fetching shorts", e);
    } finally {
      if (initial) {
        setLoading(false);
      } else {
        setLoadingMore(false);
        loadingMoreRef.current = false;
      }
    }
  };

  useEffect(() => {
    loadShorts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const activeItem = items[index];
    if (!activeItem || typeof window === "undefined") return;

    const newPath = `/ceclips/${activeItem.id}`;
    if (window.location.pathname !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [index, items]);

  useEffect(() => {
    const activeItem = items[index];
    if (!activeItem) return;
    void countView(activeItem.id);
  }, [index, items, countView]);

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

  const NEAR_END_BUFFER = 3;

  const handleMoved = (_splide: any, newIndex: number) => {
    setIndex(newIndex);

    const total = itemsRef.current.length;
    const nearEnd = total - newIndex <= NEAR_END_BUFFER;

    if (!nearEnd) return;
    if (!hasMoreRef.current || loadingMoreRef.current) return;

    const currentOffset = total;
    if (currentOffset <= lastRequestedOffsetRef.current) return;

    lastRequestedOffsetRef.current = currentOffset;
    loadShorts(false);
  };

  const handleOpenShare = useCallback(() => {
    setShareOpen(true);
  }, []);

  const activeItem = items[index] ?? null;

  const handleToggleLike = useCallback(async () => {
    if (!activeItem) return;
    if (!requireAuth("like")) return;

    const videoId = activeItem.id;
    const currentLiked = likedMap[videoId] ?? !!activeItem.liked;
    const currentCount = likesCountMap[videoId] ?? activeItem.likes ?? 0;

    setLikedMap((prev) => ({ ...prev, [videoId]: !currentLiked }));
    setLikesCountMap((prev) => ({
      ...prev,
      [videoId]: Math.max(0, currentCount + (currentLiked ? -1 : 1)),
    }));

    try {
      await fetch(API_BASE + "user/video/like", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token ?? "",
        },
        body: JSON.stringify({ token, video: videoId }),
      });
    } catch (err) {
      console.error("Failed to like video:", err);
      setLikedMap((prev) => ({ ...prev, [videoId]: currentLiked }));
      setLikesCountMap((prev) => ({ ...prev, [videoId]: currentCount }));
    }
  }, [activeItem, likedMap, likesCountMap, requireAuth, token]);

  const handleToggleSubscribe = useCallback(async () => {
    if (!activeItem) return;
    if (!requireAuth("subscribe")) return;

    const channelId = activeItem.channelId;
    const previous = subscribedMap[channelId] ?? !!activeItem.subscribed;

    setSubscribedMap((prev) => ({ ...prev, [channelId]: !previous }));

    try {
      await fetch(API_BASE + "channel/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({ channel: channelId, token }),
      });
    } catch (err) {
      console.error("Failed to subscribe:", err);
      setSubscribedMap((prev) => ({ ...prev, [channelId]: previous }));
    }
  }, [activeItem, requireAuth, subscribedMap, token]);

  const handleOpenReport = useCallback(() => {
    if (!requireAuth("report")) return;
    setSelectedReport(null);
    setReportMessage("");
    setReportFeedback(null);
    setReportOpen(true);
  }, [requireAuth]);

  const handleReportSubmit = async () => {
    if (!activeItem) return;
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
      setReportFeedback(null);

      const res = await fetch(`${API_BASE}video/report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify({
          video: activeItem.id,
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
        setTimeout(() => {
          setReportOpen(false);
          setReportFeedback(null);
        }, 1200);
      } else {
        setReportFeedback({
          type: "error",
          message: result?.message || "Failed to submit report.",
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

  const shareUrl =
    typeof window !== "undefined" && activeItem
      ? `${window.location.origin}/ceclips/${activeItem.id}`
      : "";
  const shareTitle = activeItem?.title ?? "";

  if (loading && !items.length) {
    return (
      <div
        className="flex w-screen items-center justify-center bg-black text-white"
        style={{ height: `calc(100svh - ${HEADER_HEIGHT}px)` }}
      >
        Loading…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div
        className="flex w-screen items-center justify-center bg-black text-white"
        style={{ height: `calc(100svh - ${HEADER_HEIGHT}px)` }}
      >
        No clips available.
      </div>
    );
  }

  let authPromptTitle = "";
  let authPromptSubtitle = "";
  if (authPrompt === "like") {
    authPromptTitle = "Like this clip?";
    authPromptSubtitle = "Sign in to like videos.";
  } else if (authPrompt === "subscribe") {
    authPromptTitle = "Follow this channel?";
    authPromptSubtitle = "Sign in to follow channels.";
  } else if (authPrompt === "report") {
    authPromptTitle = "Report this clip?";
    authPromptSubtitle = "Sign in to report inappropriate content.";
  }

  return (
    <>
      <style jsx global>{`
        .ceclips .splide__track,
        .ceclips .splide__list,
        .ceclips .splide__slide {
          height: 100%;
        }

        .ceclips .plyr,
        .ceclips .plyr__video-wrapper,
        .ceclips .plyr video {
          height: 100%;
        }

        .ceclips .plyr {
          width: 100%;
        }

        .ceclips .plyr video {
          object-fit: cover;
        }
      `}</style>

      {reportOpen && (
        <div className="fixed inset-0 z-[100] flex items-center text-white justify-center bg-black/70">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/95 px-5 py-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-semibold">
                <FlagIcon className="h-5 w-5" />
                Report clip
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

            <p className="mb-3 text-xs text-neutral-300">
              Please select a reason for reporting this content.
            </p>

            <div className="max-h-48 space-y-2 overflow-y-auto">
              {reportOptions.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 ${
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

            <div className="mt-3">
              <label className="mb-1 block text-xs text-neutral-300">
                Additional details (optional)
              </label>
              <textarea
                rows={3}
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neutral-500"
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

      {authPrompt && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-xs rounded-2xl border border-white/10 bg-neutral-900/95 px-5 py-4 text-center shadow-xl">
            <p className="mb-1 text-lg font-semibold">{authPromptTitle}</p>
            <p className="mb-4 text-sm text-neutral-300">{authPromptSubtitle}</p>
            <Link
              href="/login"
              onClick={() => setAuthPrompt(null)}
              className="mb-2 block w-full rounded-full bg-white py-2 text-sm font-semibold text-black hover:bg-neutral-100"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={() => setAuthPrompt(null)}
              className="cursor-pointer text-sm text-neutral-300 hover:text-white"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      <Splide
        ref={splideRef}
        options={{
          direction: "ttb",
          height: `calc(100svh - ${HEADER_HEIGHT}px)`,
          perPage: 1,
          perMove: 1,
          drag: true,
          dragMinThreshold: { mouse: 0, touch: 10 },
          flickPower: 500,
          flickMaxPages: 1,
          wheel: !isMobile,
          releaseWheel: !isMobile,
          waitForTransition: true,
          wheelSleep: 800,
          wheelMinThreshold: 20,
          arrows: !isMobile,
          pagination: false,
        }}
        onMoved={handleMoved}
        className="ceclips relative w-full px-0 md:px-4"
      >
        {items.map((item, i) => (
          <SplideSlide key={item.id}>
            <div
              className="w-full"
              style={{ height: `calc(100svh - ${HEADER_HEIGHT}px)` }}
            >
              <Player
                view={i === index}
                title={item.title}
                src={item.src}
                poster={item.poster}
                channelId={item.channelId}
                channelName={item.channelName}
                channelProfilePicture={item.channelProfilePicture}
                channelVerified={!!item.channelVerified}
                liked={likedMap[item.id] ?? !!item.liked}
                likesCount={likesCountMap[item.id] ?? item.likes ?? 0}
                subscribed={subscribedMap[item.channelId] ?? !!item.subscribed}
                onLike={handleToggleLike}
                onSubscribe={handleToggleSubscribe}
                onShare={handleOpenShare}
                onReport={handleOpenReport}
              />
            </div>
          </SplideSlide>
        ))}
      </Splide>

      <ShareModal
        open={shareOpen}
        setOpen={setShareOpen}
        title={shareTitle}
        url={shareUrl}
        hashtags={["ceflix", "ceclips"]}
        id={activeItem?.id}
      />

      {loadingMore && (
        <div className="absolute bottom-4 right-4 z-50 text-xs text-white/70">
          Loading more…
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-50 text-xs text-white/40">
          End of clips
        </div>
      )}
    </>
  );
}