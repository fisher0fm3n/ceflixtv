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
import { useAuth } from "../components/AuthProvider";
import { slugify, timeSinceUnix } from "@/app/assets/scripts/script";

const EXTERNAL_VIDEO_SEARCH_API =
  "https://nmt.loveworldapis.com/api/kingsspace/search/external/videos";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

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

type ChannelResult = {
  channelID: string;
  channelName: string;
  description: string;
  profilepic: string;
  score: string;
};

type PlaylistResult = {
  playlistID?: string;
  id?: string | number;
  title?: string;
  playlist_title?: string;
  description?: string;
  playlist_description?: string;
  thumbnail?: string;
  playlist_thumbnail?: string;
  cover?: string;
  numOfViews?: string;
  uploadtime?: string;
  created_at?: string;
  updated_at?: string;
  videos_payload?: string;
  totalVideos?: string | number;
};

type InternalSearchApiResponse = {
  status?: boolean;
  data?: {
    videos?: any[];
    channels?: any[];
    playlists?: any[] | Record<string, any>;
  };
};

type ResultFilter = "all" | "videos" | "channels" | "playlists";
type SortOption =
  | "relevance"
  | "date_desc"
  | "date_asc"
  | "views_desc"
  | "views_asc";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, initialized } = useAuth() as {
    token?: string | null;
    initialized?: boolean;
  };

  const queryFromUrl = (searchParams.get("q") || "").trim();

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<ExternalVideoResult[]>([]);
  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);

  const PAGE_SIZE_VIDEOS = 10;
  const PAGE_SIZE_CHANNELS = 12;
  const PAGE_SIZE_PLAYLISTS = 12;

  const [visibleVideoCount, setVisibleVideoCount] = useState(PAGE_SIZE_VIDEOS);
  const [visibleChannelCount, setVisibleChannelCount] =
    useState(PAGE_SIZE_CHANNELS);
  const [visiblePlaylistCount, setVisiblePlaylistCount] =
    useState(PAGE_SIZE_PLAYLISTS);

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

  const getPlaylistVideoCount = (videosPayload?: string) => {
    if (!videosPayload || typeof videosPayload !== "string") return 0;

    return videosPayload
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean).length;
  };

  const getUnixFromDate = (value?: string) => {
    if (!value) return 0;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : 0;
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

  async function getSearchResults(term: string, currentToken?: string | null) {
    if (!term) {
      setVideos([]);
      setChannels([]);
      setPlaylists([]);
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

      const [videoReq, internalReq] = await Promise.all([
        fetch(
          `${EXTERNAL_VIDEO_SEARCH_API}?q=${encodeURIComponent(term)}&limit=50&sort=${encodeURIComponent(externalSort)}`,
          {
            method: "GET",
            signal: controller.signal,
          },
        ),
        fetch(API_BASE + "search", {
          method: "POST",
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Request-Method": "POST",
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify(
            currentToken ? { param: term, token: currentToken } : { param: term },
          ),
          signal: controller.signal,
        }),
      ]);

      if (!videoReq.ok) {
        throw new Error("Failed to fetch videos from external search API.");
      }

      const videoRes: ExternalVideoApiResponse = await videoReq.json();
      const internalRes: InternalSearchApiResponse = await internalReq.json();

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

      const rawChannels = internalRes?.data?.channels || [];
      const rawPlaylists = Array.isArray(internalRes?.data?.playlists)
        ? internalRes.data.playlists
        : Object.values(internalRes?.data?.playlists || {});

      const channelResults: ChannelResult[] = rawChannels.filter(
        (item: any) => item.channelID && item.profilepic,
      );

      const playlistResults: PlaylistResult[] = rawPlaylists
        .filter(
          (item: any) =>
            item?.playlistID ||
            item?.id ||
            item?.playlist_title ||
            item?.title,
        )
        .map((item: any) => ({
          ...item,
          totalVideos:
            item?.totalVideos ?? getPlaylistVideoCount(item?.videos_payload),
        }));

      setVideos(externalVideoResults);
      setChannels(channelResults);
      setPlaylists(playlistResults);

      if (
        externalVideoResults.length === 0 &&
        channelResults.length === 0 &&
        playlistResults.length === 0
      ) {
        setError("No results found.");
      }
    } catch (e: any) {
      if (e?.name === "AbortError") return;

      console.error(e);
      setError("Something went wrong while searching.");
      setVideos([]);
      setChannels([]);
      setPlaylists([]);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    if (initialized === false) return;

    if (!queryFromUrl) {
      abortControllerRef.current?.abort();
      setVideos([]);
      setChannels([]);
      setPlaylists([]);
      setError(null);
      return;
    }

    getSearchResults(queryFromUrl, token);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [queryFromUrl, token, initialized, sortOption]);

  useEffect(() => {
    const onFocus = () => {
      if (!queryFromUrl || initialized === false) return;
      getSearchResults(queryFromUrl, token);
    };

    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [queryFromUrl, token, initialized, sortOption]);

  useEffect(() => {
    setVisibleVideoCount(PAGE_SIZE_VIDEOS);
    setVisibleChannelCount(PAGE_SIZE_CHANNELS);
    setVisiblePlaylistCount(PAGE_SIZE_PLAYLISTS);
  }, [videos, channels, playlists, sortOption, resultFilter]);

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
  const hasResults =
    videos.length > 0 || channels.length > 0 || playlists.length > 0;

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

  const sortedChannels = useMemo(() => {
    const copy = [...channels];

    copy.sort((a, b) => {
      const aScore = parseNum(a.score);
      const bScore = parseNum(b.score);
      const aViews = parseNum((a as any).numOfViews);
      const bViews = parseNum((b as any).numOfViews);

      switch (sortOption) {
        case "views_asc":
          return aViews - bViews || aScore - bScore;
        case "views_desc":
          return bViews - aViews || bScore - aScore;
        case "date_asc":
        case "date_desc":
        case "relevance":
        default:
          return bScore - aScore;
      }
    });

    return copy;
  }, [channels, sortOption]);

  const sortedPlaylists = useMemo(() => {
    const copy = [...playlists];

    copy.sort((a, b) => {
      const aDate = getUnixFromDate(a.updated_at || a.created_at);
      const bDate = getUnixFromDate(b.updated_at || b.created_at);
      const aViews = parseNum(a.numOfViews);
      const bViews = parseNum(b.numOfViews);

      switch (sortOption) {
        case "date_asc":
          return aDate - bDate;
        case "date_desc":
          return bDate - aDate;
        case "views_asc":
          return aViews - bViews;
        case "views_desc":
          return bViews - aViews;
        case "relevance":
        default:
          return bDate - aDate;
      }
    });

    return copy;
  }, [playlists, sortOption]);

  const canLoadMore =
    (resultFilter === "videos" && visibleVideoCount < sortedVideos.length) ||
    (resultFilter === "channels" &&
      visibleChannelCount < sortedChannels.length) ||
    (resultFilter === "playlists" &&
      visiblePlaylistCount < sortedPlaylists.length) ||
    (resultFilter === "all" &&
      (visibleVideoCount < sortedVideos.length ||
        visibleChannelCount < sortedChannels.length ||
        visiblePlaylistCount < sortedPlaylists.length));

  useEffect(() => {
    if (!loadMoreRef.current) return;
    const el = loadMoreRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry.isIntersecting) return;
        if (loading) return;
        if (!hasResults) return;

        if (resultFilter === "videos") {
          setVisibleVideoCount((prev) =>
            Math.min(prev + PAGE_SIZE_VIDEOS, sortedVideos.length),
          );
          return;
        }

        if (resultFilter === "channels") {
          setVisibleChannelCount((prev) =>
            Math.min(prev + PAGE_SIZE_CHANNELS, sortedChannels.length),
          );
          return;
        }

        if (resultFilter === "playlists") {
          setVisiblePlaylistCount((prev) =>
            Math.min(prev + PAGE_SIZE_PLAYLISTS, sortedPlaylists.length),
          );
          return;
        }

        setVisibleVideoCount((prev) =>
          Math.min(prev + PAGE_SIZE_VIDEOS, sortedVideos.length),
        );
        setVisibleChannelCount((prev) =>
          Math.min(prev + PAGE_SIZE_CHANNELS, sortedChannels.length),
        );
        setVisiblePlaylistCount((prev) =>
          Math.min(prev + PAGE_SIZE_PLAYLISTS, sortedPlaylists.length),
        );
      },
      { root: null, rootMargin: "200px", threshold: 0.1 },
    );

    observer.observe(el);

    return () => {
      observer.unobserve(el);
    };
  }, [
    loading,
    hasResults,
    resultFilter,
    sortedVideos.length,
    sortedChannels.length,
    sortedPlaylists.length,
  ]);

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
              placeholder="Search videos, channels and playlists"
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
                <button
                  type="button"
                  onClick={() => setResultFilter("all")}
                  className={tabClass(resultFilter === "all")}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setResultFilter("videos")}
                  className={tabClass(resultFilter === "videos")}
                >
                  Videos
                </button>
                <button
                  type="button"
                  onClick={() => setResultFilter("channels")}
                  className={tabClass(resultFilter === "channels")}
                >
                  Channels
                </button>
                <button
                  type="button"
                  onClick={() => setResultFilter("playlists")}
                  className={tabClass(resultFilter === "playlists")}
                >
                  Playlists
                </button>

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

                const rawChannelId = v.channel?.id ?? v.channelId ?? "";
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

        {!loading &&
          (resultFilter === "all" || resultFilter === "channels") &&
          sortedChannels.length > 0 && (
            <section className={resultFilter === "all" ? "mt-10" : "mt-0"}>
              {resultFilter === "all" && (
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Channels</h2>
                </div>
              )}

              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {sortedChannels.slice(0, visibleChannelCount).map((c) => (
                  <Link
                    key={c.channelID}
                    href={`/channel/${encodeURIComponent(c.channelID)}`}
                    className="flex items-center gap-3 rounded-lg hover:bg-neutral-900/70 transition p-2 -mx-2"
                  >
                    <div className="relative h-14 w-14 rounded-full overflow-hidden bg-neutral-800 flex-shrink-0">
                      <Image
                        src={c.profilepic}
                        alt={c.channelName}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-md font-semibold line-clamp-1">
                        {c.channelName || "Channel"}
                      </p>
                      {c.description && (
                        <p className="text-sm text-neutral-400 line-clamp-2">
                          {c.description}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

        {!loading &&
          (resultFilter === "all" || resultFilter === "playlists") &&
          sortedPlaylists.length > 0 && (
            <section className={resultFilter === "all" ? "mt-10" : "mt-0"}>
              {resultFilter === "all" && (
                <h3 className="text-sm font-semibold mb-3 text-neutral-200">
                  Playlists
                </h3>
              )}

              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {sortedPlaylists
                  .slice(0, visiblePlaylistCount)
                  .map((playlist, index) => {
                    const playlistId =
                      playlist.playlistID || playlist.id || `${index}`;
                    const title =
                      playlist.playlist_title || playlist.title || "Playlist";
                    const thumb =
                      playlist.playlist_thumbnail ||
                      playlist.thumbnail ||
                      playlist.cover ||
                      "";

                    const playlistTimestamp = getUnixFromDate(
                      playlist.updated_at || playlist.created_at,
                    );

                    const since = playlistTimestamp
                      ? timeSinceUnix(playlistTimestamp)
                      : "";

                    const totalVideos =
                      playlist.totalVideos ??
                      getPlaylistVideoCount(playlist.videos_payload);

                    return (
                      <Link
                        key={String(playlistId)}
                        href={`/playlists/${encodeURIComponent(String(playlistId))}`}
                        className="rounded-lg hover:bg-neutral-900/70 transition p-2 -mx-2"
                      >
                        <div className="relative w-full aspect-video rounded-md overflow-hidden bg-neutral-900 mb-3">
                          {thumb ? (
                            <Image
                              src={thumb}
                              alt={title}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
                              No thumbnail
                            </div>
                          )}
                        </div>

                        <h4 className="text-base font-semibold line-clamp-2 mb-1">
                          {title}
                        </h4>

                        <p className="text-sm text-neutral-400">
                          {totalVideos} videos
                          {since ? ` • ${since}` : ""}
                        </p>

                        {(playlist.playlist_description ||
                          playlist.description) && (
                          <p className="text-sm text-neutral-400 line-clamp-2 mt-1">
                            {playlist.playlist_description ||
                              playlist.description}
                          </p>
                        )}
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