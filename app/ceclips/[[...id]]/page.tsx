"use client";

import { useRef, useState, useEffect, memo } from "react";
import dynamic from "next/dynamic";

const Plyr = dynamic(() => import("plyr-react"), {
  ssr: false,
});

import "plyr-react/plyr.css";

import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const LIMIT = 10;

/**
 * Player component
 */
const Player = memo(function Player({
  view,
  title,
  src,
  poster,
  channelName,
  channelProfilePicture,
}: {
  view: boolean;
  title: string;
  src: string;
  poster: string | null;
  channelName: string;
  channelProfilePicture: string | null;
}) {
  const ref = useRef<any>();
  const plyrProps = {
    source: {
      type: "video",
      title: title,
      sources: [
        {
          src: view ? src : "",
          type: "video/mp4",
          size: 1080,
        },
      ],
      poster: poster || undefined,
    },
    options: {
      autoplay: true,
      loop: { active: true },
      hideControls: true,
      playsinline: true,
      disableContextMenu: true,
      speed: { selected: 1, options: [0.75, 1, 1.25] },
      controls: ["play-large", "play", "mute"],
    },
  };

  const [ready, setReady] = useState(false); // kept for future use if needed
  const [subscribe, setSubscribe] = useState(false);

  return (
    <>
      <div className="flex flex-row h-full">
        <div className="flex flex-row h-full w-full md:h-[94.8vh] md:h-[92.8vh] justify-center items-center lg:flex-row gap-3 mx-auto">
          <div className="relative mx-auto h-full md:h-[82vh] w-full sm:w-auto md:rounded-xl overflow-hidden">
            {/* bottom overlay */}
            <div className="z-50 px-4 pb-3 gap-4 flex flex-col absolute w-full bottom-0 text-white font-semibold text-sm">
              <h1 className="text-sm">{title}</h1>
              <div className="flex flex-row items-center justify-between w-full">
                <div className="flex flex-row items-center">
                  <img
                    alt="avatar"
                    className="rounded-full w-10 h-10 object-cover"
                    src={
                      channelProfilePicture ||
                      "https://ceflix.org/images/avatar.png"
                    }
                  />
                  <h1 className="font-semibold text-xs ml-2">{channelName}</h1>
                </div>

                <button
                  type="button"
                  className={`text-white font-semibold ${
                    !subscribe
                      ? "bg-red-600 hover:bg-red-500"
                      : "bg-neutral-600 hover:bg-neutral-500"
                  } px-4 py-2 rounded-full text-xs`}
                  onClick={() => setSubscribe((s) => !s)}
                >
                  {!subscribe ? "Subscribe" : "Unsubscribe"}
                </button>
              </div>
            </div>

            {/* Plyr video */}
            <Plyr
              ref={ref}
              source={plyrProps.source}
              options={plyrProps.options}
            />
          </div>
        </div>
      </div>
    </>
  );
});

type ClipItem = {
  id: number;
  title: string;
  src: string;
  poster: string | null;
  channelName: string;
  channelProfilePicture: string | null;
};

export default function CeClipsComponent() {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Splide instance ref
  const splideRef = useRef<any>(null);

  // Refs to track current items & loading without stale closures
  const itemsRef = useRef<ClipItem[]>([]);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastRequestedOffsetRef = useRef(0); // offset we last requested

  // keep itemsRef in sync with state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Disable page scroll while this component is mounted
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Core loader: offset = number of items we already have
  const loadShorts = async (initial = false) => {
    if (!initial) {
      if (loadingMoreRef.current || !hasMoreRef.current) return;
    }

    try {
      if (initial) {
        setLoading(true);
      } else {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      }

      const currentOffset = itemsRef.current.length;

      const body: any = {
        offset: currentOffset,
        limit: LIMIT,
      };

      const res = await fetch(API_BASE + "video/shorts/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);

      const json = await res.json();
      const data = json.data || [];

      const mapped: ClipItem[] = data.map(
        (v: any, i: number): ClipItem => ({
          id: currentOffset + i, // unique over time as offset increases
          title: v.videos_title,
          src: v.url,
          poster: v.channel?.url ?? null,
          channelName: v.channel?.channel ?? "",
          channelProfilePicture: v.channel?.url ?? null,
        })
      );

      setItems((prev) => (initial ? mapped : [...prev, ...mapped]));

      // If the batch is smaller than LIMIT, assume no further pages
      if (data.length < LIMIT) {
        hasMoreRef.current = false;
        setHasMore(false);
      }

      // Refresh Splide after new slides are appended (non-initial)
      if (!initial) {
        setTimeout(() => {
          const splide = splideRef.current?.splide;
          if (splide) {
            splide.refresh();
          }
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

  // Initial load
  useEffect(() => {
    loadShorts(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const NEAR_END_BUFFER = 3;

  const handleMoved = (_splide: any, newIndex: number) => {
    setIndex(newIndex);

    const total = itemsRef.current.length;
    const nearEnd = total - newIndex <= NEAR_END_BUFFER;

    if (!nearEnd) return;
    if (!hasMoreRef.current || loadingMoreRef.current) return;

    // offset = how many items we have now
    const currentOffset = total;

    // only request if this offset hasn't been requested before
    if (currentOffset <= lastRequestedOffsetRef.current) return;

    lastRequestedOffsetRef.current = currentOffset;
    loadShorts(false);
  };

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
              channelName={item.channelName}
              channelProfilePicture={item.channelProfilePicture}
            />
          </SplideSlide>
        ))}
      </Splide>

      {loadingMore && (
        <div className="absolute bottom-4 right-4 text-xs text-white/70">
          Loading more…
        </div>
      )}
    </>
  );
}
