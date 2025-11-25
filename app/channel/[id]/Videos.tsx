"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ChannelData, ChannelVideo } from "./page";

type Props = {
  data: ChannelData;
  channelProfilePicture: string | null;
};

function truncate(text: string | null | undefined, max: number) {
  if (!text) return "";
  if (text.length <= max) return text;
  return text.slice(0, max) + "…";
}

function abbreviateViews(v: string | number) {
  const num = typeof v === "string" ? parseInt(v, 10) : v;
  if (!Number.isFinite(num)) return "0";
  if (num < 1000) return `${num}`;
  const units = ["K", "M", "B"];
  let u = -1;
  let n = num;
  while (n >= 1000 && u < units.length - 1) {
    n /= 1000;
    u++;
  }
  return `${n.toFixed(1).replace(/\.0$/, "")}${units[u]}`;
}

function timeSince(unix: number | string) {
  const ts = typeof unix === "string" ? parseInt(unix, 10) * 1000 : unix * 1000;
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minutes ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} months ago`;
  const years = Math.floor(days / 365);
  return `${years} years ago`;
}

function duration(seconds: number | string) {
  const s = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  const val = new Date(s * 1000).toISOString();
  if (val.substring(12, 13) === "0") {
    return val.substring(14, 19);
  } else {
    return val.substring(12, 19);
  }
}

export default function ChannelVideos({ data }: Props) {
  const channelId = data.channel.id;
  const perPage = 12;

  // Sort once whenever data.videos changes
  const sortedVideos: ChannelVideo[] = useMemo(
    () =>
      (data.videos || [])
        .slice()
        .sort((a, b) => (b.uploadtime ?? 0) - (a.uploadtime ?? 0)),
    [data.videos]
  );

  const totalVideos = sortedVideos.length;

  const [visibleCount, setVisibleCount] = useState(
    Math.min(perPage, totalVideos)
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const hasMore = visibleCount < totalVideos;

  // Reset when channel or video list changes
  useEffect(() => {
    setVisibleCount(Math.min(perPage, totalVideos));
  }, [channelId, totalVideos]);

  // IntersectionObserver to auto-load more on scroll bottom
  useEffect(() => {
    if (!hasMore) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    let ticking = false;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        const entry = entries[0];
        if (!entry.isIntersecting || ticking) return;

        ticking = true;
        setLoadingMore(true);

        // Simulate async batch (even though it's just local data)
        // So we can show "Loading..." and avoid spamming updates.
        setTimeout(() => {
          setVisibleCount((prev) => {
            const next = Math.min(prev + perPage, totalVideos);
            if (next >= totalVideos) {
              obs.disconnect();
            }
            return next;
          });
          setLoadingMore(false);
          ticking = false;
        }, 150);
      },
      {
        root: null,
        rootMargin: "200px", // trigger a bit before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, perPage, totalVideos]);

  const pageVideos = sortedVideos.slice(0, visibleCount);

  return (
    <div className="text-white">
      {/* grid */}
      <div className="grid gap-2 gap-y-6 2xl:gap-y-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {pageVideos.map((item) => (
          <div key={item.id} className="video-block flex flex-col cursor">
            <div className="relative thumbnail img-hover-zoom img-hover-zoom--slowmo">
              <Link
                href={`/videos/watch/${item.id}/${item.videos_title
                  .replace(/[\s+-]/g, "-")
                  .toLowerCase()}`}
              >
                <img
                  src={item.thumbnail}
                  // alt={item.videos_title}
                  className="w-full h-full rounded-md object-cover aspect-video"
                />
                <span className="text-white absolute bottom-2 right-2 text-xs px-2 py-1 rounded-md bg-neutral-900/60 timestamp">
                  {duration(item.duration)}
                </span>
              </Link>
            </div>
            <div className="mt-4 pb-3">
              <div className="flex flex-col">
                <Link
                  href={`/videos/watch/${item.id}/${item.videos_title
                    .replace(/[\s+-]/g, "-")
                    .toLowerCase()}`}
                >
                  <h1 className="text-xs font-semibold leading-tight text-white mr-2">
                    {truncate(item.videos_title, 46)}
                  </h1>
                </Link>
                <div className="text-gray-300 justify-start items-center mt-2">
                  {item.channelID && item.channelName && (
                    <Link
                      href={`/channel/${item.channelID}/`}
                      className="text-xs hover:text-red-600 mr-1"
                    >
                      {item.channelName}
                    </Link>
                  )}
                  <span className="text-xs">
                    {abbreviateViews(item.numOfViews)} Views •{" "}
                    {timeSince(item.uploadtime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}

        {pageVideos.length === 0 && (
          <h1 className="col-span-full text-center">No videos available.</h1>
        )}
      </div>

      {/* sentinel for infinite scroll */}
      <div ref={sentinelRef} className="h-10 w-full mt-4" />

      {/* loading / end message */}
      <div className="flex items-center justify-center mt-4">
        {loadingMore && (
          <p className="text-xs text-neutral-400">Loading more videos…</p>
        )}
        {!hasMore && totalVideos > 0 && !loadingMore && (
          <p className="text-xs text-neutral-500">You’ve reached the end.</p>
        )}
      </div>
    </div>
  );
}
