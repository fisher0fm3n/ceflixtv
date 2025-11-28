// app/channel/[id]/ChannelPageClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ChevronRightIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "../../components/AuthProvider";
import ChannelVideos from "./Videos";
import RowSlider from "../../components/RowSliderChannel";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_650/";

// If URL already contains "cloudinary", leave it as is.
// Otherwise, prefix it with the Cloudinary fetch URL.
function withCloudinaryPrefix(src: string | null): string {
  if (!src) return "";
  if (src.toLowerCase().includes("cloudinary") || src.toLowerCase().includes("cloudfront")) return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

export type ChannelInfo = {
  id: string;
  channel: string;
  description: string;
  total_views: string;
  cover: string | null;
  url: string | null;
  userID: string;
};

export type ChannelVideo = {
  id: string;
  videos_title: string;
  thumbnail: string;
  duration: string;
  numOfViews: string;
  uploadtime: number;
  likes: string;
  description: string;
  channelId?: string;
  channelID?: string;
  channelName?: string;
};

export type ChannelData = {
  channel: ChannelInfo;
  videos: ChannelVideo[];
  isSubscribed: boolean;
};

const navigation = [
  { name: "Home", src: "home" },
  { name: "Videos", src: "videos" },
  { name: "About", src: "about" },
] as const;

type View = (typeof navigation)[number]["src"];

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

function duration(seconds: number | string) {
  const s = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;
  const val = new Date(s * 1000).toISOString();
  if (val.substring(12, 13) === "0") {
    return val.substring(14, 19);
  } else {
    return val.substring(12, 19);
  }
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

// Simple loading skeleton for this page
function ChannelSkeleton() {
  return (
    <div className="flex flex-col max-w-6xl mx-auto mb-8 px-6 lg:px-0 animate-pulse">
      {/* Cover skeleton */}
      <div className="w-full relative max-h-[40rem] h-[6rem] md:h-[14rem] bg-neutral-800 rounded-xl" />

      <div className="max-w-screen-2xl w-full mx-auto">
        {/* Header skeleton */}
        <div className="px-0 border-b-1 border-neutral-200/15 mt-6">
          <div className="py-4 gap-8 lg:gap-0 flex text-white flex-row lg:space-x-4 items-center justify-start">
            <div className="rounded-full bg-neutral-800 aspect-square max-w-[6rem] max-h-[6rem] w-full h-full lg:max-w-[10rem] lg:max-h-[10rem]" />
            <div className="pb-8 lg:pb-0 text-left space-y-3 w-full max-w-xs">
              <div className="h-6 bg-neutral-800 rounded w-3/4" />
              <div className="hidden lg:block h-4 bg-neutral-800 rounded w-full" />
              <div className="h-8 bg-neutral-800 rounded-full w-24 mt-2" />
            </div>
          </div>

          {/* Tabs skeleton */}
          <div className="flex flex-col text-white mx-4 lg:mt-4 pb-3">
            <div className="w-full space-x-8 mt-2 items-center flex flex-row">
              <div className="h-6 bg-neutral-800 rounded w-16" />
              <div className="h-6 bg-neutral-800 rounded w-20" />
              <div className="h-6 bg-neutral-800 rounded w-16" />
            </div>
          </div>
        </div>

        {/* Body skeleton: grid of cards */}
        <div className="mt-8 grid gap-2 gap-y-6 2xl:gap-y-8 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="w-full aspect-video bg-neutral-800 rounded-md" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-neutral-800 rounded w-5/6" />
                <div className="h-4 bg-neutral-800 rounded w-3/4" />
                <div className="h-3 bg-neutral-800 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type ClientProps = {
  channelId?: string; // optional, since we also read from useParams
};

export default function ChannelPageClient({ channelId }: ClientProps) {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user, loading: authLoading, initialized } = useAuth();
  const fetchKeyRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ChannelData | null>(null);
  const [highlight, setHighlight] = useState<ChannelVideo | null>(null);
  const [view, setView] = useState<View>("home");
  const [subscribe, setSubscribe] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // 👇 track highlight image loading
  const [highlightImageLoaded, setHighlightImageLoaded] = useState(false);

  const paramId = channelId ?? params.id; // prefer prop if passed
  const isLoggedIn = !!user && !!token;
  const isOwner =
    isLoggedIn && data
      ? String((user as any).id ?? (user as any).userID) === data.channel.userID
      : false;

  useEffect(() => {
    if (!paramId) return;

    // 1) Wait until auth has finished hydrating from storage
    if (!initialized) return;

    // 2) If a login is currently in-flight, wait as well
    if (authLoading) return;

    const key = `${paramId}-${token ?? "guest"}`;

    // 3) Avoid duplicate fetches for same channel+auth combo
    if (fetchKeyRef.current === key) return;
    fetchKeyRef.current = key;

    // Only pass token if it exists
    getChannel(paramId, token ?? undefined);
  }, [paramId, token, authLoading, initialized]);

  async function getChannel(channelId: string, authToken?: string) {
    setLoading(true);
    try {
      const body: any = { channel: channelId };
      if (authToken) {
        body.token = authToken; // only include if defined/truthy
      }

      const req = await fetch(API_BASE + "channel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
        },
        body: JSON.stringify(body),
      });

      const res = await req.json();

      if (res.status) {
        const payload: ChannelData = res.data;
        setData(payload);
        setSubscribe(!!payload.isSubscribed);

        const videos: ChannelVideo[] = payload.videos || [];
        const sorted = [...videos].sort(
          (a, b) => (b.uploadtime ?? 0) - (a.uploadtime ?? 0)
        );
        const first = sorted[0] ?? null;
        setHighlight(first);
        // reset highlight image loading when highlight changes
        setHighlightImageLoaded(false);
      }
    } catch (err) {
      console.error("Failed to load channel:", err);
    } finally {
      setLoading(false);
    }
  }

  async function channelSubscription() {
    if (!paramId || !token) return;
    try {
      await fetch(API_BASE + "channel/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ token, channel: paramId }),
      });
    } catch (err) {
      console.error("Failed to subscribe:", err);
    }
  }

  if (loading || !data) {
    return <ChannelSkeleton />;
  }

  const sortedVideos = (data.videos || [])
    .slice()
    .sort((a, b) => (b.uploadtime ?? 0) - (a.uploadtime ?? 0));

  // Slider items for homepage – limited to 12
  const sliderItems = sortedVideos.slice(0, 12).map((video) => ({
    id: video.id,
    title: truncate(video.videos_title, 60),
    image: withCloudinaryPrefix(video.thumbnail),
    subtitle: truncate(video.description, 80),
    meta: `${abbreviateViews(video.numOfViews)} Views • ${timeSince(
      video.uploadtime
    )}`,
    tags: [duration(video.duration)],
  }));

  return (
    <>
      {/* Sign-in prompt modal */}
      {showSignInPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="max-w-xs rounded-xl bg-white px-6 py-5 text-center text-black">
            <p className="mb-4 text-sm font-medium">
              Please sign in to subscribe to this channel
            </p>
            <div className="flex justify-center gap-3">
              <button
                className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white"
                onClick={() => {
                  setShowSignInPrompt(false);
                  router.push("/login");
                }}
              >
                Sign in
              </button>
              <button
                className="rounded-md bg-neutral-200 px-4 py-2 text-sm font-semibold text-black"
                onClick={() => setShowSignInPrompt(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col max-w-6xl mx-auto mb-8 px-6 lg:px-0">
        {/* Cover */}
        <div className="w-full relative bg-cover max-h-[40rem] h-[6rem] channel-cover md:h-[14rem] overflow-hidden max-w-screen-2xl mx-auto rounded-xl">
          <img
            alt="cover"
            className="w-full relative bg-white object-cover object-center h-full"
            src={withCloudinaryPrefix(
              data.channel.cover || "/images/channel/background.jpg"
            )}
          />
        </div>

        <div className="max-w-screen-2xl w-full mx-auto">
          {/* Header */}
          <div className="px-0 border-b-1 border-neutral-200/15 mt-6">
            <div className="py-4 gap-8 lg:gap-0 flex text-white flex-row lg:space-x-4 items-center justify-start text-center lg:text-left">
              <img
                className="rounded-full aspect-square object-cover max-w-[6rem] max-h-[6rem] w-full h-full lg:max-w-[10rem] lg:max-h-[10rem]"
                src={withCloudinaryPrefix(
                  data.channel.url || "/images/channel/background.jpg"
                )}
              />
              <div className="pb-8 lg:pb-0 text-left gap-8">
                <p className="text-2xl lg:text-3xl font-extrabold">
                  {data.channel.channel}
                </p>
                <p className="text-sm font-medium text-neutral-400">
                  {abbreviateViews((data as any).subscribers)} Subscribers
                </p>

                <button
                  type="button"
                  onClick={() => setView("about")}
                  className="hidden transition lg:flex flex-row items-center mt-2 lg:text-center lg:text-left text-neutral-400 hover:text-neutral-300"
                >
                  <p className="text-sm">
                    {truncate(data.channel.description, 80)}
                  </p>
                  {data.channel.description &&
                    data.channel.description.length > 80 && (
                      <ChevronRightIcon
                        className="hidden lg:block ml-2 h-5 w-5"
                        aria-hidden="true"
                      />
                    )}
                </button>

                {/* Subscribe / Edit */}
                {!isOwner && (
                  <button
                    type="button"
                    className={`mt-4 text-black transition font-bold rounded-full ${
                      !subscribe
                        ? "bg-white hover:bg-white-10"
                        : "bg-neutral-600 hover:bg-neutral-500 text:white"
                    } px-4 py-2 text-sm cursor-pointer`}
                    onClick={() => {
                      if (!token) {
                        setShowSignInPrompt(true);
                        return;
                      }
                      channelSubscription();
                      setSubscribe((prev) => !prev);
                    }}
                  >
                    {!subscribe ? "Subscribe" : "Unsubscribe"}
                  </button>
                )}

                {isLoggedIn && isOwner && (
                  <Link
                    className="w-fit mt-3 inline-flex flex-row bg-white px-4 py-2 text-xs hover:bg-white-10 text-black transition font-bold rounded-full"
                    href={`/studio/channels/edit/${data.channel.id}`}
                  >
                    <PencilIcon className="h-4 w-4 mr-2" aria-hidden="true" />
                    Edit
                  </Link>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col text-white mx-4 lg:mt-4">
              <div>
                <div className="w-full space-x-8 mt-2 items-center flex flex-row">
                  {navigation.map((item) => (
                    <button
                      type="button"
                      key={item.name}
                      onClick={() => setView(item.src)}
                      className={`${
                        item.src === view
                          ? "border-b-2 border-solid border-white-500 text-white"
                          : "text-neutral-400"
                      } pb-1 font-semibold border-solid gap-x-3 text-md cursor-pointer`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* HOME VIEW */}
          {view === "home" && (
            <>
              {highlight && (
                <>
                  {/* Featured / highlighted video */}
                  <div className="flex flex-col lg:flex-row pt-4 my-8 md:gap-x-4">
                    <div className="relative thumbnail">
                      <div className="relative w-full min-w-[24rem] lg:max-w-[24rem]">
                        {/* Placeholder block while image loads */}
                        {!highlightImageLoaded && (
                          <div className="w-full aspect-video rounded-md bg-neutral-800 animate-pulse" />
                        )}

                        <Link
                          href={`/videos/watch/${
                            highlight.id
                          }/${highlight.videos_title
                            .replace(/[\s+-]/g, "-")
                            .toLowerCase()}`}
                        >
                          <img
                            alt="cover"
                            className={`rounded-md w-full aspect-video object-contain bg-black ${
                              highlightImageLoaded ? "block" : "hidden"
                            }`}
                            src={withCloudinaryPrefix(highlight.thumbnail)}
                            onLoad={() => setHighlightImageLoaded(true)}
                            onError={() => setHighlightImageLoaded(true)}
                          />
                        </Link>
                      </div>
                    </div>
                    <div className="text-white max-w-[38rem]">
                      <Link
                        href={`/videos/watch/${
                          highlight.id
                        }/${highlight.videos_title
                          .replace(/[\s+-]/g, "-")
                          .toLowerCase()}`}
                      >
                        <h1 className="mt-2 font-bold text-lg">
                          {highlight.videos_title}
                        </h1>
                      </Link>
                      <div className="mt-2 mb-4 flex flex-row gap-x-4 text-sm font-medium">
                        {`${abbreviateViews(
                          highlight.numOfViews
                        )} Views • ${timeSince(highlight.uploadtime)}`}
                      </div>
                      <p className="text-md lime-clamp-3">
                        {truncate(highlight.description, 300)}
                      </p>
                    </div>
                  </div>

                  {/* Slider limited to 12 items */}
                  {sliderItems.length > 0 && (
                    <>
                      <h1 className="text-xl font-semibold text-white">
                        Latest videos
                      </h1>
                      <RowSlider title="" items={sliderItems} />
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* VIDEOS VIEW */}
          {view === "videos" && (
            <div className="mt-8">
              <h1 className="mb-4 text-lg font-semibold text:white">Videos</h1>
              <ChannelVideos
                data={data}
                channelProfilePicture={data.channel.url}
              />
            </div>
          )}

          {/* ABOUT VIEW */}
          {view === "about" && (
            <div className="mt-8 text-white">
              <h1 className="mb-4 text-lg font-semibold">About</h1>
              <p className="text-sm">{data.channel.description}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
