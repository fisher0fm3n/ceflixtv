// app/api/homepage/route.ts
//
// Personalised home feed.
//
// Calls the API's `smarthome` endpoint, which merges admin-curated rows with
// per-user rows (Continue Watching, From Your Subscriptions, Because You
// Watched, ...) and applies the viewer's own show/hide and ordering choices.
// See CeFlix-API `docs/personalization.md`.
//
// The response is mapped down to the shape HomeGrid already renders, so the
// switch from the old `initialhome` endpoint needs no component changes.
import { NextResponse } from "next/server";

const SMART_HOME_URL = "https://webapi.ceflix.org/api/smarthome";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

/**
 * layout_version 1 tells the API to withhold its own Clips row.
 *
 * The web homepage renders its own <ShortsShelf /> above the grid, so taking
 * the server's row as well would show clips twice.
 */
const LAYOUT_VERSION = 1;

type Card = {
  videoId?: number;
  id?: number;
  title?: string;
  imgUrl?: string;
  imgChannel?: string;
  channel?: string;
  views?: number;
  uploadtime?: number;
};

function timeAgo(uploadtime?: number): string {
  const seconds = Number(uploadtime ?? 0);
  if (!seconds) return "";

  const diff = Math.floor(Date.now() / 1000) - seconds;
  if (diff < 0) return "just now";

  const units: [number, string][] = [
    [31536000, "year"],
    [2592000, "month"],
    [604800, "week"],
    [86400, "day"],
    [3600, "hour"],
    [60, "minute"],
  ];

  for (const [secs, name] of units) {
    const value = Math.floor(diff / secs);
    if (value >= 1) {
      return `${value} ${name}${value === 1 ? "" : "s"} ago`;
    }
  }

  return "just now";
}

function mapCard(card: Card) {
  return {
    videoID: String(card.videoId ?? card.id ?? ""),
    videos_title: String(card.title ?? ""),
    thumbnail: String(card.imgUrl ?? ""),
    channelName: String(card.channel ?? ""),
    numOfViews: String(card.views ?? 0),
    timeAgo: timeAgo(card.uploadtime),
    channelProfilePicture: String(card.imgChannel ?? ""),
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}) as any);
    const token = typeof body?.token === "string" ? body.token : "";

    const res = await fetch(SMART_HOME_URL, {
      method: "POST",
      headers: {
        "Application-Key": APP_KEY,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        token,
        layout_version: LAYOUT_VERSION,
      }),
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({}) as any);

    if (!res.ok || !json?.status) {
      const msg =
        json?.message || json?.error || "Failed to load home sections.";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    const rawSections = Array.isArray(json?.sections) ? json.sections : [];

    const sections = rawSections
      .map((section: any) => ({
        sectionName: String(section?.title ?? ""),
        sectionData: (Array.isArray(section?.data) ? section.data : []).map(
          mapCard,
        ),
      }))
      .filter((section: any) => section.sectionData.length > 0);

    // The ranked block closes the page, where an endless feed belongs.
    const recommended = Array.isArray(json?.recommended?.data)
      ? json.recommended.data
      : [];

    if (recommended.length > 0) {
      sections.push({
        sectionName: String(json?.recommended?.title ?? "Recommended For You"),
        sectionData: recommended.map(mapCard),
      });
    }

    return NextResponse.json({
      ok: true,
      data: {
        sections,
        stations: Array.isArray(json?.stations) ? json.stations : [],
        homeSlides: Array.isArray(json?.homeSlides) ? json.homeSlides : [],
        personalized: Boolean(json?.personalized),
      },
    });
  } catch (err) {
    console.error("smarthome API error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error contacting Ceflix API." },
      { status: 500 },
    );
  }
}
