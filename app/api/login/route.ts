// app/api/login/route.ts
import { NextRequest, NextResponse } from "next/server";

const CEFLEX_LOGIN_URL = "https://webapi.ceflix.org/api/login";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { ok: false, error: "Username and password are required" },
        { status: 400 }
      );
    }

    // form-urlencoded body
    const body = new URLSearchParams();
    body.append("username", username);
    body.append("password", password);

    const apiRes = await fetch(CEFLEX_LOGIN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Application-Key": APP_KEY,
      },
      body: body.toString(),
    });

    const json = await apiRes.json().catch(() => ({} as any));

    // If HTTP status itself failed
    if (!apiRes.ok) {
      const apiErrorMsg =
        json?.data?.message ||
        json?.message ||
        json?.error ||
        "Unable to log in. Please check your credentials.";

      return NextResponse.json(
        { ok: false, error: apiErrorMsg },
        { status: apiRes.status }
      );
    }

    // 🔹 Handle the REAL shape you showed:
    // { status: true, data: { user, token, purchase_token, encID } }
    let statusFlag = false;
    let payload: any = null;

    if (typeof json.status !== "undefined" && json.data) {
      // canonical Ceflix shape
      statusFlag = !!json.status;
      payload = json.data;
    } else if (json.ok && json.data?.status && json.data.data) {
      // older sample shape (if they ever change it back)
      statusFlag = !!json.data.status;
      payload = json.data.data;
    }

    if (!statusFlag || !payload) {
      const apiErrorMsg =
        json?.data?.message ||
        json?.message ||
        json?.error ||
        "Login failed. Invalid response from server.";
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

    // ✅ Flatten & normalize for the frontend
    return NextResponse.json({
      ok: true,
      user,
      token,
      purchaseToken,
      encID,
    });
  } catch (err) {
    console.error("Login API error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
