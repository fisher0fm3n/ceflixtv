// app/api/initialhome/route.ts
import { NextResponse } from "next/server";

const CEFLEX_INITIAL_HOME_URL = "https://webapi.ceflix.org/api/initialhome";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d"; // same as login

export async function GET() {
  try {
    const res = await fetch(CEFLEX_INITIAL_HOME_URL, {
      method: "POST", // if their docs say POST, change this to "POST"
      headers: {
        "Application-Key": APP_KEY,
        Accept: "application/json",
      },
      // don't cache, we want fresh home every time
      cache: "no-store",
    });

    const json = await res.json().catch(() => ({} as any));

    if (!res.ok || !json?.status) {
      const msg =
        json?.message || json?.error || "Failed to load home sections.";
      return NextResponse.json({ ok: false, error: msg }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: json.data ?? [] });
  } catch (err) {
    console.error("initialhome API error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error contacting Ceflix API." },
      { status: 500 }
    );
  }
}
