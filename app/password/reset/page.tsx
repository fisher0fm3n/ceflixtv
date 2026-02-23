// app/forgot-password/page.tsx
"use client";

import { FormEvent, Suspense, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import logo from "../../assets/logo/ceflixplus-logo.png";
import { useAuth } from "../../components/AuthProvider";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.endsWith("/")
    ? process.env.NEXT_PUBLIC_API_URL
    : `${process.env.NEXT_PUBLIC_API_URL ?? "https://webapi.ceflix.org/api/"}`;
const APP_KEY =
  process.env.NEXT_PUBLIC_APP_KEY ?? "2567a5ec9705eb7ac2c984033e06189d";

function ForgotPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useAuth();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setErr("Email is required.");
      return;
    }

    setLoading(true);
    try {
      const req = await fetch(`${API_BASE}password/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          ...(token ? { "X-TOKEN": token } : {}),
        },
        body: JSON.stringify({ email: trimmed }),
      });

      const res = await req.json().catch(() => null);

      if (res?.status) {
        setMsg(res?.message || "Reset link sent. Redirecting to login…");
        setTimeout(() => router.push("/login"), 2500);
      } else {
        setErr(res?.message || "Unable to send reset link. Please try again.");
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative overflow-hidden">
      {/* Gradient background (match login) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.4),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.28),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

      <div className="relative z-10 min-h-screen grid place-items-center p-4 sm:p-6 md:p-0">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* header */}
          <div className="px-8 pt-8 pb-4">
            <Image
              src={logo}
              alt="Ceflix+ logo"
              className="w-[8rem] mx-auto mb-4"
            />
            <p className="text-neutral-400 font-[500] text-sm mt-1 text-center">
              Enter your email and we’ll send a password reset link
            </p>
          </div>

          {/* tabs (Forgot Password active) */}
          <div className="mt-2 mx-8 grid grid-cols-2 text-center text-sm rounded-xl bg-neutral-800/60 p-1">
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="cursor-pointer py-2 rounded-lg text-neutral-200 hover:text-white hover:bg-neutral-900/40 transition"
            >
              Log In
            </button>
            <button
              type="button"
              className="py-2 rounded-lg bg-neutral-900 text-white font-semibold shadow-inner cursor-default"
            >
              Reset
            </button>
          </div>

          {/* form */}
          <div className="px-8 pb-8 pt-6">
            {err && (
              <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 px-4 py-3 text-sm">
                {err}
              </div>
            )}
            {msg && (
              <div className="mb-4 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-200 px-4 py-3 text-sm">
                {msg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Email
                </label>
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="you@example.com"
                />
              </div>

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
                    Sending…
                  </>
                ) : (
                  <>
                    <span>Send reset link</span>
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

              <div className="flex items-center justify-between pt-2 text-sm">
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="cursor-pointer text-neutral-300 hover:text-white underline underline-offset-4"
                >
                  Back to login
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail("");
                    setErr(null);
                    setMsg(null);
                  }}
                  className="cursor-pointer text-neutral-400 hover:text-neutral-200"
                >
                  Clear
                </button>
              </div>
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

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}