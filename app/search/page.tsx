"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../components/AuthProvider";
import {
  formatViews,
  slugify,
  timeSinceUnix,
} from "@/app/assets/scripts/script";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type VideoResult = {
  id: string;
  videoID: string;
  videos_title: string;
  description: string;
  isLive: "0" | "1" | string;
  thumbnail: string;
  numOfComments: string;
  numOfViews: string;
  uploadtime: string;
  likes: string;
  isPremium: "0" | "1" | string;
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

type ApiResponse = {
  status?: boolean;
  data?: {
    videos?: any[];
    channels?: any[];
    playlists?: any[] | Record<string, any>;
  };
};

type ResultFilter = "all" | "videos" | "channels" | "playlists";
type SortOption = "date_desc" | "date_asc" | "views_desc" | "views_asc";

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, initialized } = useAuth() as {
    token?: string | null;
    initialized?: boolean;
  };

  const queryFromUrl = (searchParams.get("q") || "").trim();

  const [loading, setLoading] = useState(false);
  const [videos, setVideos] = useState<VideoResult[]>([]);
  const [channels, setChannels] = useState<ChannelResult[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date_desc");
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
  const lastSearchKeyRef = useRef("");
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
      const body: any = { param: term };
      if (currentToken) body.token = currentToken;

      const req = await fetch(API_BASE + "search", {
        method: "POST",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Request-Method": "POST",
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const res: ApiResponse = await req.json();

      if (controller.signal.aborted) return;

      if (!res?.data) {
        setError("No results found.");
        setVideos([]);
        setChannels([]);
        setPlaylists([]);
        return;
      }

      const rawVideos = res.data.videos || [];
      const rawChannels = res.data.channels || [];
      const rawPlaylists = Array.isArray(res.data.playlists)
        ? res.data.playlists
        : Object.values(res.data.playlists || {});

      const videoResults: VideoResult[] = rawVideos.filter(
        (item: any) => item.videoID && item.thumbnail,
      );

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

      setVideos(videoResults);
      setChannels(channelResults);
      setPlaylists(playlistResults);
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
      lastSearchKeyRef.current = "";
      return;
    }

    const searchKey = `${queryFromUrl}::${token || ""}`;
    if (lastSearchKeyRef.current === searchKey) return;

    lastSearchKeyRef.current = searchKey;
    getSearchResults(queryFromUrl, token);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [queryFromUrl, token, initialized]);

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

  const parseNum = (value?: string | number) => {
    const n = Number(value ?? 0);
    return Number.isFinite(n) ? n : 0;
  };

  const sortVideos = (items: VideoResult[]) => {
    const copy = [...items];
    copy.sort((a, b) => {
      const aDate = parseNum(a.uploadtime);
      const bDate = parseNum(b.uploadtime);
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
        default:
          return bDate - aDate;
      }
    });
    return copy;
  };

  const sortChannels = (items: ChannelResult[]) => {
    const copy = [...items];
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
        default:
          return bScore - aScore;
      }
    });
    return copy;
  };

  const sortPlaylists = (items: PlaylistResult[]) => {
    const copy = [...items];
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
        default:
          return bDate - aDate;
      }
    });
    return copy;
  };

  const sortedVideos = useMemo(() => sortVideos(videos), [videos, sortOption]);
  const sortedChannels = useMemo(
    () => sortChannels(channels),
    [channels, sortOption],
  );
  const sortedPlaylists = useMemo(
    () => sortPlaylists(playlists),
    [playlists, sortOption],
  );

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
              placeholder="Search Ceflix"
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
          <div className="space-y-4">
            {skeletonArray.map((_, idx) => (
              <div key={idx} className="flex gap-4 animate-pulse">
                <div className="w-40 sm:w-90 aspect-video bg-neutral-800 rounded-md" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-neutral-800 rounded w-4/5" />
                  <div className="h-3 bg-neutral-800 rounded w-3/4" />
                  <div className="h-3 bg-neutral-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
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
                const isLive = v.isLive === "1";

                return (
                  <Link
                    key={v.videoID}
                    href={`/videos/watch/${encodeURIComponent(
                      v.videoID,
                    )}/${encodeURIComponent(slugify(v.videos_title))}`}
                    className="flex flex-col sm:flex-row gap-3 sm:gap-4 rounded-lg hover:bg-neutral-900/70 transition p-4 -mx-2"
                  >
                    <div className="relative w-full sm:w-90 aspect-video rounded-md overflow-hidden bg-neutral-900 flex-shrink-0">
                      <Image
                        src={v.thumbnail}
                        alt={v.videos_title}
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

                    <div className="flex-1 flex flex-col">
                      <h2 className="text-base sm:text-lg font-semibold leading-snug mb-1 line-clamp-2">
                        {v.videos_title}
                      </h2>
                      {v.description && (
                        <p className="text-sm text-neutral-400 line-clamp-2">
                          {v.description}
                        </p>
                      )}
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
              <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
                {sortedChannels.slice(0, visibleChannelCount).map((c) => (
                  <Link
                    key={c.channelID}
                    href={`/channel/${c.channelID}`}
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
                    <div className="flex-1">
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
              <h3 className="text-sm font-semibold mb-3 text-neutral-200">
                Playlists
              </h3>

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
                        key={playlistId}
                        href={`/playlists/${playlistId}`}
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