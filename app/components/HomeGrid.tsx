"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

type VideoItem = {
  videoID: string;
  videos_title: string;
  thumbnail: string;
  channelName: string;
  numOfViews: string;
  timeAgo: string;
  channelProfilePicture?: string;
};

type Section = {
  sectionName: string;
  sectionData: VideoItem[];
};

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_450/";

// Ensure all image URLs are prefixed with the Cloudinary fetch URL
function withCloudinaryPrefix(src: string) {
  if (!src) return src;
  // If it's already a Cloudinary URL, don't touch it
  if (
    src.toLowerCase().includes("cloudinary") ||
    src.toLowerCase().includes("cloudfront")
  )
    return src;

  // If you *don’t* want encoding, remove encodeURIComponent
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

export default function HomeInitialGrid() {
  const [sections, setSections] = useState<Section[]>([]);
  const [visibleSectionCount, setVisibleSectionCount] = useState(
    INITIAL_SECTIONS
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Initial load – single API call
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/homepage", {
          method: "GET",
        });

        const json = await res.json();

        if (!res.ok || !json.ok) {
          throw new Error(json.error || "Failed to load home feed.");
        }

        if (!cancelled) {
          const data: Section[] = json.data || [];
          setSections(data);
          // Reset visible count when data arrives
          setVisibleSectionCount(
            data.length > 0 ? Math.min(INITIAL_SECTIONS, data.length) : 0
          );
        }
      } catch (err) {
        console.error("HomeInitialGrid load error:", err);
        if (!cancelled) {
          setError("Unable to load videos right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  // Infinite scroll for sections (no extra API calls, just reveal more)
  useEffect(() => {
    if (!sections.length) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;

        setVisibleSectionCount((prev) => {
          if (prev >= sections.length) return prev;
          // Load the next batch of sections
          return Math.min(prev + SECTIONS_PER_LOAD, sections.length);
        });
      },
      {
        root: null,
        rootMargin: "0px 0px 300px 0px", // start loading a bit before reaching the bottom
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [sections.length]);

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="h-8 w-48 rounded bg-neutral-800/70 mb-4" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
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

  if (error) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="p-4 sm:p-6">
        <p className="text-sm text-neutral-400">
          No sections available right now.
        </p>
      </div>
    );
  }

  const visibleSections = sections.slice(0, visibleSectionCount);

  return (
    <div className="p-4 sm:p-6 space-y-8">
      {visibleSections.map((section) => (
        <section key={section.sectionName} className="space-y-3">
          {/* Section title */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-extrabold text-white">
              {section.sectionName}
            </h2>
          </div>

          {/* Video grid (YouTube-style) */}
          <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {section.sectionData.map((video) => (
              <Link
                key={video.videoID}
                href={`/videos/watch/${video.videoID}/${formatTitle(
                  video.videos_title
                )}`}
                className="cursor-pointer group overflow-hidden"
              >
                {/* Thumbnail */}
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

                {/* Meta row: avatar + text */}
                <div className="p-3 flex gap-3">
                  {video.channelProfilePicture && (
                    <div className="relative h-9 w-9 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                      <Image
                        src={withCloudinaryPrefix(
                          video.channelProfilePicture
                        )}
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
                      {video.numOfViews} views · {video.timeAgo}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {/* Sentinel for infinite scroll (only when there is more to load) */}
      {visibleSectionCount < sections.length && (
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
