// app/auth/kingschat/callback/route.ts
import { NextRequest, NextResponse } from "next/server";

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
      // fallback: try formData anyway
      const form = await req.formData().catch(() => null);
      if (form) {
        accessToken = (form.get("accessToken") as string) ?? null;
        refreshToken = (form.get("refreshToken") as string) ?? null;
      }
    }

    console.log("Incoming KingsChat callback:");
    console.log("content-type:", contentType);
    console.log("accessToken present?", !!accessToken);
    console.log("refreshToken present?", !!refreshToken);

    if (!accessToken) {
      console.error("No accessToken in POST body");
      return new NextResponse(
        "Missing accessToken in KingsChat callback body",
        { status: 400 }
      );
    }

    // OPTIONAL: call KingsChat profile here if you want
    // const kcResp = await fetch(
    //   "https://connect.kingsch.at/developer/api/profile",
    //   {
    //     method: "GET",
    //     headers: {
    //       Accept: "application/json",
    //       Authorization: `Bearer ${accessToken}`,
    //     },
    //   }
    // );
    // const profile = await kcResp.json();
    // console.log("KingsChat profile:", profile);

    // Set cookies
    const res = NextResponse.redirect(
      new URL("/auth/kingschat/callback", req.url), // will hit page.tsx as GET
      { status: 303 }
    );

    res.cookies.set("kc_access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60,
    });

    if (refreshToken) {
      res.cookies.set("kc_refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return res;
  } catch (err) {
    console.error("Error in KingsChat callback route:", err);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
