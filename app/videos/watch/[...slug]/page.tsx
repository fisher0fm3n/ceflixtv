// app/player/[...slug]/page.tsx
import type { Metadata } from "next";
import PlayerPageClient from "./PlayerPageClient";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

// helper to build a nice slug (same as your formatTitle)
function formatTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[!@#$%^&*()+={}\[\]|\\:;"'<>,.?/]+/g, "")
    .replace(/\s+/g, "-");
}

// small server-safe helper for Cloudinary thumbnail
function withCloudinaryOg(src: string | null) {
  if (!src) return "";
  const lower = src.toLowerCase();
  if (lower.includes("cloudinary") || lower.includes("cloudfront")) return src;

  return `https://res.cloudinary.com/raves-music/image/fetch/w_1200/${encodeURIComponent(
    src
  )}`;
}

async function fetchVideoSafely(id: string) {
  try {
    const res = await fetch(`${API_BASE}video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({ video: id }),
      next: { revalidate: 60 },
    });

    const json = await res.json();
    if (!json.status) return null;

    return json.data.video as {
      id: string;
      videos_title: string;
      description: string | null;
      thumbnail: string;
    };
  } catch {
    return null;
  }
}

// Default / fallback metadata (used when we can't resolve a video yet)
const defaultMetadata: Metadata = {
  title: "Ceflix Tv",
  description:
    "Watch. Share. Shine – Only on CeFlix Live TV. Showcase your talents and watch your dreams take center stage on CeFlix Live TV.",
};

// 👇 This runs on the server and sets SEO/OG/Twitter per video
export async function generateMetadata({
  params,
}: {
  params: { slug: string[] };
}): Promise<Metadata> {
  const slugArray = Array.isArray(params.slug) ? params.slug : [params.slug];
  const videoId = slugArray[0];

  // If we don’t have an id yet (during some transitions), just use generic SEO
  if (!videoId) {
    return defaultMetadata;
  }

  const video = await fetchVideoSafely(videoId);

  // If the fetch fails or video doesn’t exist, still use generic SEO
  if (!video) {
    return defaultMetadata;
  }

  const baseUrl = "https://ceflix.org"; // <-- your real domain
  const prettySlug = formatTitle(video.videos_title);
  const canonicalUrl = `${baseUrl}/player/${videoId}/${prettySlug}`;
  const ogImage = withCloudinaryOg(video.thumbnail);

  const title = `${video.videos_title} - Ceflix Tv`;
  const description =
    video.description ??
    "Watch this video on CeFlix TV – Watch. Share. Shine.";

  return {
    title,
    description,
    openGraph: {
      type: "video.other",
      title,
      description,
      url: canonicalUrl,
      images: ogImage ? [ogImage] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

// 👇 This just renders your client component
export default function PlayerPage() {
  return <PlayerPageClient />;
}
