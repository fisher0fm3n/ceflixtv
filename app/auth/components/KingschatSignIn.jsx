"use client";

/* eslint-disable */
const CLIENT_ID = "com.kingschat";
const REDIRECT_URI = "https://ceflixtv.netlify.app/api/kingschat/callback";
const SCOPES = ["conference_calls"];

import Image from "next/image";
import logo from "../../assets/logo/kingschat.png";

const getLoginUrl = () => {
  const encodedScopes = encodeURIComponent(JSON.stringify(SCOPES));
  const encodedRedirect = encodeURIComponent(REDIRECT_URI);
  return `https://accounts.kingsch.at/?client_id=${CLIENT_ID}&scopes=${encodedScopes}&post_redirect=true&redirect_uri=${encodedRedirect}`;
};

export function KingsChatSignIn() {
  return (
    <a
      className="group cursor-pointer text-sm relative w-full inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 font-semibold text-white
                 bg-[#3183ff]
                 disabled:opacity-60 disabled:cursor-not-allowed transition"
      onClick={() => window.open(getLoginUrl(), "_self")}
    >
      <Image
        src={logo}
        alt="Kingschat logo"
        className="w-8 h-8"
      />
      Continue with Kingschat
    </a>
  );
}
