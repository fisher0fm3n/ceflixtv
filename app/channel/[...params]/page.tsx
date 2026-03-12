// app/channel/[...params]/page.tsx
import type { Metadata } from "next";
import ChannelPageClient from "./ChannelPageClient";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

const CLOUDINARY_PREFIX =
  "https://res.cloudinary.com/raves-music/image/fetch/w_650/";

// ---- Types (minimal for SEO) ----
type ChannelInfo = {
  id: string;
  channel: string;
  description: string;
  total_views: string;
  cover: string | null;
  url: string | null;
  userID: string;
};

type ChannelVideo = {
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

type PageProps = {
  params: Promise<{ params?: string[] }>;
};

// ---- Helpers ----
function withCloudinaryPrefix(src: string | null): string {
  if (!src) return "";
  if (
    src.toLowerCase().includes("cloudinary") ||
    src.toLowerCase().includes("cloudfront")
  ) {
    return src;
  }
  return `${CLOUDINARY_PREFIX}${encodeURIComponent(src)}`;
}

function getChannelIdFromParams(parts?: string[]): string | null {
  const id = parts?.[0]?.trim();
  return id ? id : null;
}

// Server-side fetch just for metadata
async function fetchChannelForSeo(channelId: string): Promise<ChannelData | null> {
  try {
    const res = await fetch(API_BASE + "channel", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({ channel: channelId }),
      next: { revalidate: 300 },
    });

    const json = await res.json();
    if (!json.status) return null;
    return json.data as ChannelData;
  } catch (e) {
    console.error("SEO fetchChannelForSeo error:", e);
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolved = await params;
  const channelId = getChannelIdFromParams(resolved.params);

  if (!channelId) {
    return {
      title: "Channel - Ceflix Tv",
      description: "Watch videos on Ceflix Tv.",
    };
  }

  const data = await fetchChannelForSeo(channelId);

  if (!data) {
    return {
      title: "Channel - Ceflix Tv",
      description: "Watch videos on Ceflix Tv.",
    };
  }

  const channel = data.channel;
  const seoTitle = `${channel.channel} - Ceflix Tv`;
  const descriptionText =
    channel.description && channel.description.length > 0
      ? channel.description.slice(0, 155)
      : `Watch videos from ${channel.channel} on Ceflix Tv.`;

  const ogImageUrl = channel.cover
    ? withCloudinaryPrefix(channel.cover)
    : undefined;

  return {
    title: seoTitle,
    description: descriptionText,
    openGraph: {
      title: seoTitle,
      description: descriptionText,
      images: ogImageUrl ? [{ url: ogImageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seoTitle,
      description: descriptionText,
      images: ogImageUrl ? [ogImageUrl] : undefined,
    },
  };
}

export default async function ChannelPageWrapper({ params }: PageProps) {
  const resolved = await params;
  const channelId = getChannelIdFromParams(resolved.params);

  return <ChannelPageClient channelId={channelId ?? ""} />;
}