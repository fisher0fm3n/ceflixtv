import { NextRequest, NextResponse } from "next/server";

const SITE_ORIGIN = "https://ceflix.org";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let accessToken: string | null = null;
    let refreshToken: string | null = null;

    if (contentType.includes("application/json")) {
      const body = await req.json();
      accessToken = body.accessToken ?? null;
      refreshToken = body.refreshToken ?? null;
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      accessToken = (form.get("accessToken") as string) ?? null;
      refreshToken = (form.get("refreshToken") as string) ?? null;
    } else {
      const form = await req.formData().catch(() => null);
      if (form) {
        accessToken = (form.get("accessToken") as string) ?? null;
        refreshToken = (form.get("refreshToken") as string) ?? null;
      }
    }

    console.log("[KC callback] Incoming KingsChat callback:");
    console.log("[KC callback] content-type:", contentType);
    console.log("[KC callback] accessToken present?", !!accessToken);
    console.log("[KC callback] refreshToken present?", !!refreshToken);

    if (!accessToken) {
      console.error("[KC callback] No accessToken in POST body");
      return new NextResponse(
        "Missing accessToken in KingsChat callback body",
        { status: 400 }
      );
    }

    const res = NextResponse.redirect(
      new URL("/auth/kingschat/callback", SITE_ORIGIN),
      { status: 303 }
    );

    res.cookies.set("kc_access_token", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    if (refreshToken) {
      res.cookies.set("kc_refresh_token", refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (err) {
    console.error("[KC callback] Error in KingsChat callback route:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}