// app/login/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";
import Image from "next/image";
import logo from "../assets/logo/ceflixplus-logo.png";
import { KingsChatSignIn } from "@/app/auth/components/KingschatSignIn"

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (!username || !password) {
      setErr("Username and password are required.");
      return;
    }

    const res = await login(username.trim(), password);
    if (!res.ok) {
      setErr(res.error || "Unable to sign in. Please try again.");
      return;
    }

    router.push(redirectTo);
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative overflow-hidden">
      {/* 🔹 Gradient background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.4),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.28),transparent)]" />{" "}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />
      {/* Content */}
      <div className="relative z-10 min-h-screen grid place-items-center p-4 sm:p-6 md:p-0">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* header */}
          <div className="px-8 pt-8 pb-4">
            <Image
              src={logo}
              alt="Kingschat logo"
              className="w-[8rem] mx-auto mb-4"
            />
            {/* <h1 className="text-white text-2xl font-semibold tracking-tight">
              Sign in to Ceflix
            </h1> */}
            <p className="text-neutral-400 font-[500] text-sm mt-1 text-center">
              Welcome back — enter your credentials to continue
            </p>
          </div>

          {/* tabs (login only for now) */}
          <div className="mt-2 mx-8 grid grid-cols-2 text-center text-sm rounded-xl bg-neutral-800/60 p-1">
            <button
              type="button"
              className="py-2 rounded-lg bg-neutral-900 text-white font-semibold shadow-inner"
            >
              Log In
            </button>
            <button
              type="button"
              disabled
              className="py-2 rounded-lg text-neutral-500 cursor-not-allowed"
            >
              Create Account
            </button>
          </div>

          {/* form */}
          <div className="px-8 pb-8 pt-6">
            {err && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
                {err}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Email or Username
                </label>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Username"
                />
              </div>

              {/* Password with Heroicon toggle */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 pr-10 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="••••••••"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-200"
                    tabIndex={-1}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="group cursor-pointer relative w-full inline-flex text-sm items-center justify-center gap-2 rounded-md px-4 py-3 font-semibold text-white
                           bg-red-600 hover:bg-red-700
                           disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Signing In…
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg
                      className="h-5 w-5 opacity-80 group-hover:translate-x-0.5 transition-transform"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M5 12h14M13 5l7 7-7 7"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 pt-2">
                <div className="h-px flex-1 bg-neutral-800" />
                <span className="text-[11px] uppercase tracking-wider text-neutral-500">
                  or
                </span>
                <div className="h-px flex-1 bg-neutral-800" />
              </div>

              <KingsChatSignIn />
            </form>

            <p className="mt-6 text-center text-xs text-neutral-500">
              By continuing, you agree to our{" "}
              <a
                href="/privacy_policy"
                className="text-neutral-300 hover:text-white underline underline-offset-2"
              >
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
