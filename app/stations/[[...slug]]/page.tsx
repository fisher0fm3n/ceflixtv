// app/live/[[...slug]]/page.tsx
import type { Metadata } from "next";
import LiveStationsClient from "./LiveStationsClient";

const LIVE_API = "https://webapi.ceflix.org/api/livestations";

type Station = {
  id: number;
  name: string;
  desc: string;
  src: string;
  imgChannel: string;
};

type LiveStationsResponse = {
  status: boolean;
  data: Station[];
};

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

const defaultMetadata: Metadata = {
  title: "Live Stations - Ceflix Live TV",
  description: "Watch live stations on CeFlix Live TV.",
};

async function fetchStations(): Promise<Station[]> {
  try {
    const res = await fetch(LIVE_API, { next: { revalidate: 60 } });
    const json = (await res.json()) as LiveStationsResponse;
    if (!json?.status || !Array.isArray(json.data)) return [];
    return json.data;
  } catch {
    return [];
  }
}

function pickStationBySlug(stations: Station[], slug?: string[]) {
  if (!stations.length) return null;

  const first = stations[0];
  const rawId = slug?.[0]; // /live/:id
  const id = rawId && /^\d+$/.test(rawId) ? Number(rawId) : null;

  if (id == null) return first;

  return stations.find((s) => s.id === id) ?? first;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const stations = await fetchStations();
  const station = pickStationBySlug(stations, slug);

  if (!station) return defaultMetadata;

  const title = `${station.name} – Live on Ceflix`;
  const description =
    station.desc?.trim() ||
    `Watch ${station.name} live on CeFlix Live TV.`;

  // Optional: canonical URL pattern (adjust domain if needed)
  const baseUrl = "https://ceflix.org";
  const canonicalUrl = `${baseUrl}/stations/${station.id}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "video.other",
      title,
      description,
      url: canonicalUrl,
      images: station.imgChannel ? [{ url: station.imgChannel }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: station.imgChannel ? [station.imgChannel] : undefined,
    },
  };
}

export default async function LiveStationsPage({ params }: PageProps) {
  await params; // client reads useParams
  return <LiveStationsClient />;
}
