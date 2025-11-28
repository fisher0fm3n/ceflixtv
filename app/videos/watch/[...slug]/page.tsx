// app/player/[...slug]/page.tsx
import type { Metadata } from "next";
import PlayerPageClient from "./PlayerPageClient";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_1200/";

// --- Types just for SEO ---
type SeoVideo = {
  id: string;
  videos_title: string;
  description: string | null;
  thumbnail: string;
};

type PageProps = {
  params: Promise<{ slug: string[] }>; // 👈 match the channel pattern
};

// --- Helpers ---
function formatTitle(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[!@#$%^&*()+={}\[\]|\\:;"'<>,.?/]+/g, "")
    .replace(/\s+/g, "-");
}

function withCloudinaryOg(src: string | null): string {
  if (!src) return "";
  const lower = src.toLowerCase();
  if (lower.includes("cloudinary") || lower.includes("cloudfront")) return src;
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

async function fetchVideoForSeo(videoId: string): Promise<SeoVideo | null> {
  try {
    const res = await fetch(`${API_BASE}video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({ video: videoId }),
      next: { revalidate: 60 }, // cache SEO a bit
    });

    const json = await res.json();
    if (!json.status) return null;
    return json.data.video as SeoVideo;
  } catch (e) {
    console.error("SEO fetchVideoForSeo error:", e);
    return null;
  }
}

const defaultMetadata: Metadata = {
  title: "Ceflix Tv",
  description:
    "Watch. Share. Shine – Only on CeFlix Live TV. Showcase your talents and watch your dreams take center stage on CeFlix Live TV.",
};

// ✅ SEO via generateMetadata – note the `await params`
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params; // 👈 IMPORTANT: unwrap params, like channel page
  const slugArray = Array.isArray(slug) ? slug : [slug];
  const videoId = slugArray[0];

  if (!videoId) {
    return defaultMetadata;
  }

  const video = await fetchVideoForSeo(videoId);
  if (!video) {
    return defaultMetadata;
  }

  const baseUrl = "https://ceflix.org"; // use your real domain
  const prettySlug = formatTitle(video.videos_title);
  const canonicalUrl = `${baseUrl}/player/${videoId}/${prettySlug}`;
  const ogImageUrl = withCloudinaryOg(video.thumbnail);

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
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

// ✅ Page component also gets params as a Promise (like channel page)
export default async function PlayerPageWrapper({ params }: PageProps) {
  await params; // we don't actually need the slug here, client uses useParams
  return <PlayerPageClient />;
}
