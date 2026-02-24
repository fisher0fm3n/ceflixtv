"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export type VideoItem = {
  videoID: string;
  videos_title: string;
  thumbnail: string;
  channelName: string;
  numOfViews: string;
  timeAgo: string;
  channelProfilePicture?: string;
};

export type Section = {
  sectionName: string;
  sectionData: VideoItem[];
};

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_850/";

function withCloudinaryPrefix(src: string) {
  if (!src) return src;

  if (
    src.toLowerCase().includes("cloudinary") ||
    src.toLowerCase().includes("cloudfront")
  ) {
    return src;
  }

  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

function formatTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[!@#$%^&*()+={}\[\]|\\:;"'<>,.?/]+/g, "")
    .replace(/\s+/g, "-");
}

const INITIAL_SECTIONS = 2;
const SECTIONS_PER_LOAD = 2;

type Props = {
  sections: Section[];
  loading: boolean;
  error: string | null;
};

/** ---- tiny storage helpers ---- */
function readJSON<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function writeJSON<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

// optional: persist last good sections snapshot
function readLS<T>(key: string): T | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}
function writeLS<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export default function InitialHomeGrid({ sections, loading, error }: Props) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // keys: scoped to this page/component
  const COUNT_KEY = "ceflix:homegrid:visibleCount:v1";
  const SNAPSHOT_KEY = "ceflix:homegrid:sectionsSnapshot:v1";

  // 1) restore last visible count (session-scoped)
  const initialCount = useMemo(() => {
    const saved = readJSON<number>(COUNT_KEY);
    return typeof saved === "number" && saved > 0 ? saved : INITIAL_SECTIONS;
  }, []);

  const [visibleSectionCount, setVisibleSectionCount] = useState(initialCount);

  // 2) optional snapshot: if parent is briefly loading on remount, we can render cached content
  const [snapshotSections, setSnapshotSections] = useState<Section[]>(() => {
    return readLS<Section[]>(SNAPSHOT_KEY) ?? [];
  });

  // choose what to render:
  // - if we have fresh `sections`, use them
  // - else if loading and snapshot exists, show snapshot (prevents skeleton flashes)
  const effectiveSections = sections.length ? sections : loading ? snapshotSections : [];

  // whenever we receive real sections, cache snapshot
  useEffect(() => {
    if (sections.length) {
      setSnapshotSections(sections);
      writeLS(SNAPSHOT_KEY, sections);
    }
  }, [sections]);

  // Reset/Clamp visible count whenever the *effective* sections list changes
  useEffect(() => {
    if (!effectiveSections.length) {
      setVisibleSectionCount(0);
      writeJSON(COUNT_KEY, 0);
      return;
    }

    setVisibleSectionCount((prev) => {
      const next = Math.min(
        Math.max(prev || INITIAL_SECTIONS, INITIAL_SECTIONS),
        effectiveSections.length
      );
      writeJSON(COUNT_KEY, next);
      return next;
    });
  }, [effectiveSections.length]);

  // Infinite scroll reveal (no extra API calls, just reveal more)
  useEffect(() => {
    if (!effectiveSections.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;

        setVisibleSectionCount((prev) => {
          const next = Math.min(prev + SECTIONS_PER_LOAD, effectiveSections.length);
          writeJSON(COUNT_KEY, next); // cache progress
          return next;
        });
      },
      { root: null, rootMargin: "0px 0px 300px 0px", threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [effectiveSections.length]);

  // --- UI states ---
  // If we have snapshot sections, prefer showing them over skeletons even when loading=true
  const shouldShowSkeleton = loading && effectiveSections.length === 0;

  if (shouldShowSkeleton) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 rounded bg-neutral-800/70 mb-4" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-md overflow-hidden bg-neutral-900"
            >
              <div className="aspect-video bg-neutral-800" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 bg-neutral-800 rounded" />
                <div className="h-3 w-1/2 bg-neutral-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error && effectiveSections.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!effectiveSections.length) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-neutral-400">No sections available right now.</p>
      </div>
    );
  }

  const visibleSections = effectiveSections.slice(0, visibleSectionCount);

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {visibleSections.map((section) => (
        <section key={section.sectionName} className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {section.sectionName}
            </h2>
          </div>

          <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {section.sectionData.map((video) => (
              <Link
                key={video.videoID}
                href={`/videos/watch/${video.videoID}/${formatTitle(video.videos_title)}`}
                className="cursor-pointer group overflow-hidden"
              >
                <div className="relative rounded-md aspect-video overflow-hidden">
                  <Image
                    src={withCloudinaryPrefix(video.thumbnail)}
                    alt={video.videos_title}
                    fill
                    unoptimized
                    loading="lazy"
                    sizes="(max-width: 640px) 100vw,
                           (max-width: 1024px) 50vw,
                           25vw"
                    className="object-contain bg-black object-top group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                <div className="p-3 flex gap-3">
                  {video.channelProfilePicture && (
                    <div className="relative h-9 w-9 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                      <Image
                        src={withCloudinaryPrefix(video.channelProfilePicture)}
                        alt={video.channelName}
                        fill
                        unoptimized
                        loading="lazy"
                        sizes="36px"
                        className="object-cover"
                      />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-extrabold text-white line-clamp-2 mb-1">
                      {video.videos_title}
                    </h3>
                    <p className="text-xs text-neutral-400 line-clamp-1">
                      {video.channelName}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-500">
                                            {video.timeAgo}
                      {/* {video.numOfViews} views · {video.timeAgo} */}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {visibleSectionCount < effectiveSections.length && (
        <div
          ref={sentinelRef}
          className="h-10 flex items-center justify-center text-xs text-neutral-500"
        >
          Loading more sections…
        </div>
      )}
    </div>
  );
}
