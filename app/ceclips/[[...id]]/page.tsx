// app/ceclips/[id]/page.tsx
import type { Metadata } from "next";
import CeClipsComponent from "./CeClipsComponent";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_850/";

type SeoClip = {
  id: string | number;
  videos_title: string;
  description: string | null;
  thumbnail: string | null;
};

type PageProps = {
  params: Promise<{ id: string }>;
};

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

async function fetchClipForSeo(videoId: string): Promise<SeoClip | null> {
  try {
    const res = await fetch(`${API_BASE}video`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({ video: videoId }),
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const json = await res.json();
    if (!json?.status || !json?.data?.video) return null;

    return json.data.video as SeoClip;
  } catch (error) {
    console.error("SEO fetchClipForSeo error:", error);
    return null;
  }
}

const defaultMetadata: Metadata = {
  title: "CeClips - Ceflix Tv",
  description:
    "Watch CeClips on Ceflix TV. Discover short videos, share moments, and follow creators.",
  openGraph: {
    title: "CeClips - Ceflix Tv",
    description:
      "Watch CeClips on Ceflix TV. Discover short videos, share moments, and follow creators.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CeClips - Ceflix Tv",
    description:
      "Watch CeClips on Ceflix TV. Discover short videos, share moments, and follow creators.",
  },
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;

  if (!id) {
    return defaultMetadata;
  }

  const clip = await fetchClipForSeo(id);
  if (!clip) {
    return defaultMetadata;
  }

  const baseUrl = "https://ceflix.org";
  const prettySlug = formatTitle(clip.videos_title || "clip");
  const canonicalUrl = `${baseUrl}/ceclips/${id}`;
  const ogImageUrl = withCloudinaryOg(clip.thumbnail);

  const title = `${clip.videos_title} - CeClips | Ceflix Tv`;
  const description =
    clip.description?.trim() ||
    "Watch this clip on CeFlix TV – Watch. Share. Shine.";

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
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

export default async function CeClipPageWrapper({ params }: PageProps) {
  await params;
  return <CeClipsComponent />;
}