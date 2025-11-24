// app/api/kingschat/user/route.ts
import { NextRequest, NextResponse } from "next/server";

const CEFLEX_KC_USER_URL = "https://webapi.ceflix.org/api/kingschat/user";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

export async function POST(req: NextRequest) {
  try {
    // 1️⃣ Prefer cookies that your KingsChat callback already set
    const cookieAccess = req.cookies.get("kc_access_token")?.value ?? null;
    const cookieRefresh = req.cookies.get("kc_refresh_token")?.value ?? null;

    // 2️⃣ Allow body override if you ever want to POST tokens directly
    let bodyAccess = cookieAccess;
    let bodyRefresh = cookieRefresh;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const jsonBody = await req.json().catch(() => null);
      if (jsonBody) {
        bodyAccess = jsonBody.accessToken ?? bodyAccess;
        bodyRefresh = jsonBody.refreshToken ?? bodyRefresh;
      }
    }

    const accessToken = bodyAccess;
    const refreshToken = bodyRefresh;

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { ok: false, error: "KingsChat accessToken and refreshToken are required" },
        { status: 400 }
      );
    }

    // 3️⃣ Call Ceflix KC user API (JSON body)
    const kcRes = await fetch(CEFLEX_KC_USER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
      },
      body: JSON.stringify({ accessToken, refreshToken }),
    });

    const json = await kcRes.json().catch(() => ({} as any));

    if (!kcRes.ok) {
      const apiErrorMsg =
        json?.data?.message ||
        json?.message ||
        json?.error ||
        "Unable to fetch KingsChat user.";
      return NextResponse.json(
        { ok: false, error: apiErrorMsg },
        { status: kcRes.status }
      );
    }

    // Same shape as /api/login: { status: true, data: { user, token, purchase_token, encID } }
    let statusFlag = false;
    let payload: any = null;

    if (typeof json.status !== "undefined" && json.data) {
      statusFlag = !!json.status;
      payload = json.data;
    } else if (json.ok && json.data?.status && json.data.data) {
      statusFlag = !!json.data.status;
      payload = json.data.data;
    }

    if (!statusFlag || !payload) {
      const apiErrorMsg =
        json?.data?.message ||
        json?.message ||
        json?.error ||
        "KingsChat login failed. Invalid response from server.";
      return NextResponse.json(
        { ok: false, error: apiErrorMsg },
        { status: 500 }
      );
    }

    const {
      user,
      token,
      purchase_token: purchaseToken,
      encID,
    } = payload;

    if (!token || !user) {
      return NextResponse.json(
        { ok: false, error: "Login succeeded but token or user missing." },
        { status: 500 }
      );
    }

    // ✅ Normalized payload for the frontend / AuthProvider
    return NextResponse.json({
      ok: true,
      user,
      token,
      purchaseToken,
      encID,
    });
  } catch (err) {
    console.error("KingsChat user API error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
