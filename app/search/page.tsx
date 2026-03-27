"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { slugify, timeSinceUnix } from "@/app/assets/scripts/script";

const EXTERNAL_VIDEO_SEARCH_API =
  "https://nmt.loveworldapis.com/api/kingsspace/search/external/videos";

type ExternalChannelResult = {
  id: number | string;
  name: string;
  thumbnail?: string;
  slug?: string;
  isVerified?: boolean;
  matchedVideosCount?: number;
  latestUploadTs?: number;
  isLiveNow?: boolean;
};

type ExternalVideoResult = {
  videoId: number | string;
  channelId?: number | string | null;
  title: string;
  slug?: string;
  description?: string;
  category?: string;
  tags?: string[];
  rawTags?: string;
  thumbnail?: string;
  playbackUrl?: string;
  iosUrl?: string;
  vodPlayBack?: string;
  hlsPlayBack?: string;
  rawUrl?: string;
  durationSeconds?: number | null;
  views?: number | string;
  likes?: number | string;
  comments?: number | string;
  isShort?: boolean | string | number;
  isPremium?: boolean | string | number;
  isPublic?: boolean | string | number;
  isLive?: boolean | string | number;
  active?: boolean | string | number;
  processingStatus?: string;
  schedule?: string;
  filename?: string;
  uploadtime?: number | string | null;
  uploadtimeTs?: number | string | null;
  start?: string | null;
  end?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  showdate?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  relevanceScore?: number;
  source?: string;

  channel?: {
    id?: number | string;
    name?: string;
    thumbnail?: string;
    slug?: string;
    isVerified?: boolean;
  };
  channelName?: string;
  channelThumbnail?: string;
};

type ExternalVideoApiResponse = {
  status?: boolean;
  source?: string;
  query?: string;
  sort?: string;
  count?: number;
  results?: ExternalVideoResult[];
};

type ResultFilter = "all" | "videos";
type SortOption =
  | "relevance"
  | "date_desc"
  | "date_asc"
  | "views_desc"
  | "views_asc";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const queryFromUrl = (searchParams.get("q") || "").trim();

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<ExternalVideoResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE_VIDEOS = 10;
  const [visibleVideoCount, setVisibleVideoCount] = useState(PAGE_SIZE_VIDEOS);

  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [searchInput, setSearchInput] = useState(queryFromUrl);

  useEffect(() => {
    setSearchInput(queryFromUrl);
  }, [queryFromUrl]);

  const handleLocalSearch = () => {
    const term = (searchInput || "").trim();
    if (!term) return;
    if (term === queryFromUrl) return;

    const params = new URLSearchParams();
    params.set("q", term);

    router.push(`/search?${params.toString()}`);
  };

  const parseNum = (value?: string | number | null) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeBoolLike = (value: unknown) => {
    if (typeof value === "boolean") return value;
    const str = String(value ?? "").trim().toLowerCase();
    return str === "1" || str === "true" || str === "yes";
  };

  const isInactiveLiveStream = (item: ExternalVideoResult) => {
    const isLive = normalizeBoolLike(item.isLive);
    const isActive = normalizeBoolLike(item.active);
    return isLive && !isActive;
  };

  const formatCount = (num: number) => {
    if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(1)}B`;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return `${num}`;
  };

  const mapSortOptionToApiSort = (sort: SortOption): string => {
    switch (sort) {
      case "date_desc":
        return "latest";
      case "date_asc":
        return "oldest";
      case "views_desc":
        return "most_viewed";
      case "views_asc":
        return "least_viewed";
      case "relevance":
      default:
        return "relevance";
    }
  };

  async function getSearchResults(term: string) {
    if (!term) {
      setVideos([]);
      setError(null);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const externalSort = mapSortOptionToApiSort(sortOption);

      const videoReq = await fetch(
        `${EXTERNAL_VIDEO_SEARCH_API}?q=${encodeURIComponent(term)}&limit=50&sort=${encodeURIComponent(externalSort)}`,
        {
          method: "GET",
          signal: controller.signal,
        },
      );

      if (!videoReq.ok) {
        throw new Error("Failed to fetch videos from external search API.");
      }

      const videoRes: ExternalVideoApiResponse = await videoReq.json();

      if (controller.signal.aborted) return;

      const externalVideoResults = Array.isArray(videoRes?.results)
        ? videoRes.results.filter(
            (item) =>
              item?.videoId &&
              item?.thumbnail &&
              item?.title &&
              !isInactiveLiveStream(item),
          )
        : [];

      setVideos(externalVideoResults);

      if (externalVideoResults.length === 0) {
        setError("No results found.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;

      console.error(e);
      setError("Something went wrong while searching.");
      setVideos([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (!queryFromUrl) {
      abortControllerRef.current?.abort();
      setVideos([]);
      setError(null);
      return;
    }

    getSearchResults(queryFromUrl);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [queryFromUrl, sortOption]);

  useEffect(() => {
    setVisibleVideoCount(PAGE_SIZE_VIDEOS);
  }, [videos, sortOption, resultFilter]);

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(event.target as Node)
      ) {
        setShowFilters(false);
      }
    };

    if (showFilters) {
      document.addEventListener("mousedown", onClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [showFilters]);

  const skeletonArray = useMemo(() => Array.from({ length: 6 }), []);
  const hasResults = videos.length > 0;

  const sortedVideos = useMemo(() => {
    const copy = [...videos];

    switch (sortOption) {
      case "date_desc":
        copy.sort(
          (a, b) =>
            parseNum(b.uploadtimeTs ?? b.uploadtime) -
            parseNum(a.uploadtimeTs ?? a.uploadtime),
        );
        break;
      case "date_asc":
        copy.sort(
          (a, b) =>
            parseNum(a.uploadtimeTs ?? a.uploadtime) -
            parseNum(b.uploadtimeTs ?? b.uploadtime),
        );
        break;
      case "views_desc":
        copy.sort((a, b) => parseNum(b.views) - parseNum(a.views));
        break;
      case "views_asc":
        copy.sort((a, b) => parseNum(a.views) - parseNum(b.views));
        break;
      case "relevance":
      default:
        copy.sort(
          (a, b) => parseNum(b.relevanceScore) - parseNum(a.relevanceScore),
        );
        break;
    }

    return copy;
  }, [videos, sortOption]);

  const channels = useMemo<ExternalChannelResult[]>(() => {
    const map = new Map<string, ExternalChannelResult>();

    for (const video of sortedVideos) {
      const rawId =
        video.channel?.id ?? video.channelId ?? video.channelName ?? "";
      const id = String(rawId || "").trim();
      const name = (video.channel?.name || video.channelName || "").trim();
      const thumbnail =
        video.channel?.thumbnail || video.channelThumbnail || "";
      const slug = video.channel?.slug?.trim() || (name ? slugify(name) : "");
      const isVerified = Boolean(video.channel?.isVerified);

      if (!id || !name) continue;

      const existing = map.get(id);

      if (!existing) {
        map.set(id, {
          id,
          name,
          thumbnail,
          slug,
          isVerified,
          matchedVideosCount: 1,
          latestUploadTs: parseNum(video.uploadtimeTs ?? video.uploadtime),
          isLiveNow:
            normalizeBoolLike(video.isLive) && normalizeBoolLike(video.active),
        });
      } else {
        existing.matchedVideosCount = (existing.matchedVideosCount || 0) + 1;
        existing.latestUploadTs = Math.max(
          existing.latestUploadTs || 0,
          parseNum(video.uploadtimeTs ?? video.uploadtime),
        );
        existing.isLiveNow =
          Boolean(existing.isLiveNow) ||
          (normalizeBoolLike(video.isLive) && normalizeBoolLike(video.active));

        if (!existing.thumbnail && thumbnail) existing.thumbnail = thumbnail;
        if (!existing.slug && slug) existing.slug = slug;
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (Boolean(b.isLiveNow) !== Boolean(a.isLiveNow)) {
        return Number(Boolean(b.isLiveNow)) - Number(Boolean(a.isLiveNow));
      }
      if ((b.matchedVideosCount || 0) !== (a.matchedVideosCount || 0)) {
        return (b.matchedVideosCount || 0) - (a.matchedVideosCount || 0);
      }
      return (b.latestUploadTs || 0) - (a.latestUploadTs || 0);
    });
  }, [sortedVideos]);

  const canLoadMore = visibleVideoCount < sortedVideos.length;

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading) return;
        if (!hasResults) return;

        setVisibleVideoCount((prev) =>
          Math.min(prev + PAGE_SIZE_VIDEOS, sortedVideos.length),
        );
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [loading, hasResults, sortedVideos.length]);

  const tabClass = (active: boolean) =>
    `cursor-pointer px-3 py-1.5 rounded-md text-sm font-semibold transition ${
      active
        ? "bg-white text-black"
        : "bg-neutral-800 text-neutral-200 hover:bg-neutral-600"
    }`;

  const filterItemClass = (active: boolean) =>
    `w-full text-left px-3 py-1.5 rounded-lg text-sm transition cursor-pointer ${
      active
        ? "bg-white text-black font-semibold"
        : "text-neutral-200 hover:bg-neutral-800"
    }`;

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto px-4 sm:px-8 pt-2 lg:pt-6 pb-10">
        <div className="mb-4 sm:hidden">
          <div className="flex items-center gap-2 w-full px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800">
            <MagnifyingGlassIcon className="h-5 w-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Search videos and channels"
              className="flex-1 bg-transparent text-sm text-white placeholder-neutral-400 focus:outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleLocalSearch();
                }
              }}
            />
            <button
              type="button"
              onClick={handleLocalSearch}
              className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/10 text-xs font-semibold text-white hover:bg-white/20"
            >
              Search
            </button>
          </div>
        </div>

        {queryFromUrl && (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm text-neutral-400">
                Search results for{" "}
                <span className="font-semibold text-white">
                  “{queryFromUrl}”
                </span>
              </p>
            </div>

            {hasResults && (
              <div className="mb-6 flex flex-wrap items-center gap-2">
                <div className="relative ml-auto" ref={filterMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowFilters((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white cursor-pointer"
                  >
                    <AdjustmentsHorizontalIcon className="h-5 w-5" />
                    Filters
                  </button>

                  {showFilters && (
                    <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-neutral-800 bg-neutral-900 p-2 shadow-2xl z-50">
                      <p className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-400">
                        Sort results
                      </p>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOption("relevance");
                          setShowFilters(false);
                        }}
                        className={filterItemClass(sortOption === "relevance")}
                      >
                        Relevance
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOption("date_desc");
                          setShowFilters(false);
                        }}
                        className={filterItemClass(sortOption === "date_desc")}
                      >
                        Date - Newest first
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOption("date_asc");
                          setShowFilters(false);
                        }}
                        className={filterItemClass(sortOption === "date_asc")}
                      >
                        Date - Oldest first
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOption("views_desc");
                          setShowFilters(false);
                        }}
                        className={filterItemClass(sortOption === "views_desc")}
                      >
                        Views - Highest first
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSortOption("views_asc");
                          setShowFilters(false);
                        }}
                        className={filterItemClass(sortOption === "views_asc")}
                      >
                        Views - Lowest first
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        {loading && (
          <section className="space-y-4">
            {skeletonArray.map((_, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-4 -mx-2 animate-pulse"
              >
                <div className="relative w-full sm:w-90 aspect-video rounded-md overflow-hidden bg-neutral-900 flex-shrink-0" />
                <div className="flex-1 flex flex-col min-w-0">
                  <div className="h-5 bg-neutral-800 rounded w-4/5 mb-3" />

                  <div className="mb-3 flex items-center gap-2 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-neutral-800 flex-shrink-0" />
                    <div className="h-3.5 bg-neutral-800 rounded w-40" />
                  </div>

                  <div className="space-y-2 mb-3">
                    <div className="h-3.5 bg-neutral-800 rounded w-full" />
                    <div className="h-3.5 bg-neutral-800 rounded w-5/6" />
                  </div>

                  <div className="flex gap-3">
                    <div className="h-3 bg-neutral-800 rounded w-20" />
                    <div className="h-3 bg-neutral-800 rounded w-16" />
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {!loading && !hasResults && !error && queryFromUrl && (
          <div className="mt-10 rounded-xl border border-dashed border-neutral-700 bg-neutral-900/40 p-6 text-center text-sm text-neutral-300">
            No results found. Try a different search.
          </div>
        )}

        {!loading &&
          (resultFilter === "all" || resultFilter === "videos") &&
          sortedVideos.length > 0 && (
            <section className="space-y-4">
              {sortedVideos.slice(0, visibleVideoCount).map((v) => {
                const isLive = normalizeBoolLike(v.isLive);
                const videoId = String(v.videoId || "");
                const title = v.title || "";
                const hrefSlug = v.slug?.trim()
                  ? encodeURIComponent(v.slug)
                  : encodeURIComponent(slugify(title));

                const rawChannelId =
                  v.channel?.id ?? v.channelId ?? "";
                const channelId = String(rawChannelId || "").trim();
                const channelName =
                  v.channel?.name || v.channelName || "Unknown channel";
                const channelThumbnail =
                  v.channel?.thumbnail ||
                  v.channelThumbnail ||
                  "/placeholder.png";
                const channelHref = channelId
                  ? `/channel/${encodeURIComponent(channelId)}`
                  : "#";

                return (
                  <Link
                    key={videoId}
                    href={`/videos/watch/${encodeURIComponent(videoId)}/${hrefSlug}`}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-lg hover:bg-neutral-900/70 transition p-4 -mx-2"
                  >
                    <div className="relative w-full sm:w-90 aspect-video rounded-md overflow-hidden bg-neutral-900 flex-shrink-0">
                      <Image
                        src={v.thumbnail || "/placeholder.png"}
                        alt={title}
                        fill
                        unoptimized
                        className="object-contain w-full h-full"
                      />
                      {isLive && (
                        <span className="absolute bottom-1 left-1 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-600 text-white">
                          LIVE
                        </span>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col min-w-0">
                      <h2 className="text-base sm:text-lg font-semibold leading-snug mb-1 line-clamp-2">
                        {title}
                      </h2>

                      <div className="mb-2 py-2">
                        {channelId ? (
                          <Link
                            href={channelHref}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-2 min-w-0 hover:opacity-80 transition"
                          >
                            <div className="relative h-6 w-6 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                              <Image
                                src={channelThumbnail}
                                alt={channelName}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <span className="text-sm text-neutral-400 truncate">
                              {channelName}
                            </span>
                            {v.channel?.isVerified && (
                              <CheckBadgeIcon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                            )}
                          </Link>
                        ) : (
                          <div className="inline-flex items-center gap-2 min-w-0">
                            <div className="relative h-6 w-6 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                              <Image
                                src={channelThumbnail}
                                alt={channelName}
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            </div>
                            <span className="text-sm text-neutral-400 truncate">
                              {channelName}
                            </span>
                            {v.channel?.isVerified && (
                              <CheckBadgeIcon className="h-4 w-4 text-neutral-400 flex-shrink-0" />
                            )}
                          </div>
                        )}
                      </div>

                      {(v.description || "").trim() && (
                        <p className="text-sm text-neutral-400 line-clamp-1 mb-2">
                          {v.description}
                        </p>
                      )}

                      <div className="text-sm text-neutral-500 flex flex-wrap gap-x-3 gap-y-1">
                        {parseNum(v.uploadtimeTs ?? v.uploadtime) > 0 && (
                          <span>
                            {timeSinceUnix(
                              parseNum(v.uploadtimeTs ?? v.uploadtime),
                            )}
                          </span>
                        )}
                        {v.category && <span>{v.category}</span>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </section>
          )}

        {!loading && resultFilter === "all" && channels.length > 0 && (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Channels</h2>
            </div>

            <div className="space-y-4">
              {channels.slice(0, Math.min(3, channels.length)).map((channel) => {
                const channelHref = `/channel/${encodeURIComponent(String(channel.id))}`;

                return (
                  <Link
                    key={String(channel.id)}
                    href={channelHref}
                    className="flex items-center gap-4 rounded-xl p-3 sm:p-4 hover:bg-neutral-900/70 transition"
                  >
                    <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-full overflow-hidden bg-neutral-900 flex-shrink-0 border border-neutral-800">
                      <Image
                        src={channel.thumbnail || "/placeholder.png"}
                        alt={channel.name}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-semibold truncate">
                          {channel.name}
                        </h3>
                        {channel.isVerified && (
                          <CheckBadgeIcon className="h-5 w-5 text-neutral-300 flex-shrink-0" />
                        )}
                        {channel.isLiveNow && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-600 text-white">
                            LIVE
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-neutral-400">
                        {!!channel.matchedVideosCount && (
                          <span>
                            {formatCount(channel.matchedVideosCount)} matching{" "}
                            video
                            {channel.matchedVideosCount === 1 ? "" : "s"}
                          </span>
                        )}
                        {!!channel.latestUploadTs && (
                          <span>{timeSinceUnix(channel.latestUploadTs)}</span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {!loading && hasResults && canLoadMore && (
          <div ref={loadMoreRef} className="h-10 w-full" />
        )}
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageContent />
    </Suspense>
  );
}