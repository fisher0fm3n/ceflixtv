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
import { ShareIcon } from "@heroicons/react/24/outline";
import ShareModal from "../../components/ShareModal";

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

type PlayerProps = {
  view: boolean;
  title: string;
  src: string;
  poster: string | null;
  channelId: number;
  channelName: string;
  channelProfilePicture: string | null;
  onShare: () => void;
};

const Player = memo(function Player({
  view,
  title,
  src,
  poster,
  channelId,
  channelName,
  channelProfilePicture,
  onShare,
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
    <div className="flex flex-row h-full">
      <div className="flex flex-row h-full w-full md:h-[94.8vh] md:h-[92.8vh] justify-center items-center lg:flex-row gap-3 mx-auto">
        <div className="relative mx-auto h-full md:h-[82vh] w-full sm:w-auto md:rounded-xl overflow-hidden bg-black">
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 h-44 bg-gradient-to-t from-black via-black/70 to-transparent" />

          <div className="z-50 px-4 pb-4 gap-3 flex flex-col absolute w-full bottom-0 text-white text-sm">
            <h1 className="text-sm font-semibold">{title}</h1>

            <div className="flex flex-row items-center justify-between gap-3 w-full">
              <Link
                href={`/channel/${channelId}`}
                className="flex flex-row items-center min-w-0"
              >
                <img
                  alt="avatar"
                  className="rounded-full w-10 h-10 object-cover"
                  src={channelProfilePicture || FALLBACK_AVATAR}
                />
                <h2 className="font-semibold text-sm ml-2 truncate">
                  {channelName}
                </h2>
              </Link>

              <button
                type="button"
                onClick={onShare}
                className="cursor-pointer inline-flex items-center gap-2 rounded-full bg-neutral-800/90 px-4 py-2 text-xs font-semibold text-white hover:bg-neutral-700 active:bg-neutral-600"
              >
                <ShareIcon className="w-4 h-4" />
                <span>Share</span>
              </button>
            </div>
          </div>

          <Plyr ref={ref} source={source} options={PLAYER_OPTIONS} />
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
  prev.onShare === next.onShare
);

type ClipItem = {
  id: number;
  title: string;
  src: string;
  poster: string | null;
  channelId: number;
  channelName: string;
  channelProfilePicture: string | null;
};

export default function CeClipsComponent() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  const splideRef = useRef<any>(null);

  const itemsRef = useRef<ClipItem[]>([]);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastRequestedOffsetRef = useRef(0);
  const initialVideoIdRef = useRef<number | null>(null);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    initialVideoIdRef.current = getInitialVideoIdFromUrl();
  }, []);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const loadShorts = async (initial = false) => {
    if (!initial && (loadingMoreRef.current || !hasMoreRef.current)) return;

    try {
      if (initial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }

      const currentOffset = itemsRef.current.length;

      const body: Record<string, any> = {
        offset: currentOffset,
        limit: LIMIT,
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
      }));

      setItems((prev) => {
        if (initial) return mapped;

        const existingIds = new Set(prev.map((item) => item.id));
        const deduped = mapped.filter((item) => !existingIds.has(item.id));
        return [...prev, ...deduped];
      });

      if (data.length < LIMIT) {
        hasMoreRef.current = false;
        setHasMore(false);
      }

      if (!initial) {
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
  }, []);

  useEffect(() => {
    const activeItem = items[index];
    if (!activeItem || typeof window === "undefined") return;

    const newPath = `/ceclips/${activeItem.id}`;
    if (window.location.pathname !== newPath) {
      window.history.replaceState({}, "", newPath);
    }
  }, [index, items]);

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
  const shareUrl =
    typeof window !== "undefined" && activeItem
      ? `${window.location.origin}/ceclips/${activeItem.id}`
      : "";
  const shareTitle = activeItem?.title ?? "";

  if (loading && !items.length) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        Loading…
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-black text-white">
        No clips available.
      </div>
    );
  }

  return (
    <>
      <Splide
        ref={splideRef}
        options={{
          direction: "ttb",
          height: "100vh",
          perPage: 1,
          perMove: 1,
          drag: true,
          dragMinThreshold: { mouse: 0, touch: 10 },
          flickPower: 500,
          flickMaxPages: 1,
          wheel: true,
          releaseWheel: true,
          waitForTransition: true,
          wheelSleep: 800,
          wheelMinThreshold: 20,
          arrows: true,
          pagination: false,
        }}
        onMoved={handleMoved}
        className="ceclips relative px-4 w-full h-screen"
      >
        {items.map((item, i) => (
          <SplideSlide key={item.id}>
            <Player
              view={i === index}
              title={item.title}
              src={item.src}
              poster={item.poster}
              channelId={item.channelId}
              channelName={item.channelName}
              channelProfilePicture={item.channelProfilePicture}
              onShare={handleOpenShare}
            />
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
        <div className="absolute bottom-4 right-4 text-xs text-white/70">
          Loading more…
        </div>
      )}
    </>
  );
}