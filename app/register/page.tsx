// app/register/page.tsx
"use client";

import { FormEvent, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { EyeIcon, EyeSlashIcon } from "@heroicons/react/24/outline";

import logo from "../assets/logo/ceflixplus-logo.png";
import { useAuth } from "../components/AuthProvider";

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("next") || "/";

  const { register, loading } = useAuth() as any; // if your AuthProvider doesn't expose register, see note below

  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [country, setCountry] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkPassword =
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;

  // Best-effort country detection (won't block form)
  useEffect(() => {
    let cancelled = false;

    async function fetchCountry() {
      try {
               const res = await fetch(`https://api.ipstack.com/check?access_key=d423505aa1e822ef57156f4ea6a0c1ce&fields=country_name`);
        const data = await res.json().catch(() => null);
        if (!cancelled) setCountry(data?.country_name || "");
      } catch {
        if (!cancelled) setCountry("");
      }
    }

    fetchCountry();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    setSuccess(null);

    if (!firstname || !lastname || !email || !username || !password) {
      setErr("Please fill in all required fields.");
      return;
    }

    if (!/(\w\.?)+@[\w\.-]+\.\w{2,}/.test(email)) {
      setErr("Please enter a valid email address.");
      return;
    }

    // if (!checkPassword.test(password)) {
    //   setErr(
    //     "Password must be at least 8 characters and include a letter, a number, and a special character.",
    //   );
    //   return;
    // }

    if (password !== confirmPassword) {
      setErr("Passwords do not match.");
      return;
    }

    // If your AuthProvider has register() use it, otherwise fallback to API call below.
    if (typeof register === "function") {
      const res = await register({
        firstname: firstname.trim(),
        lastname: lastname.trim(),
        email: email.trim(),
        username: username.trim(),
        password,
        country: country?.trim() || "",
      });

      if (!res?.ok) {
        setErr(res?.error || "Unable to create account. Please try again.");
        return;
      }

      setSuccess("Account created. Redirecting to login…");
      setTimeout(() => router.push(`/login?next=${encodeURIComponent(redirectTo)}`), 700);
      return;
    }

    // Fallback: direct API call (matches your old page)
    try {
      const req = await fetch(`https://webapi.ceflix.org/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": `2567a5ec9705eb7ac2c984033e06189d`,
        },
        body: JSON.stringify({
          firstname: firstname.trim(),
          lastname: lastname.trim(),
          username: username.trim(),
          email: email.trim(),
          password,
          country: country?.trim() || "",
        }),
      });

      const data = await req.json().catch(() => null);

      if (!req.ok || !data?.status) {
        setErr(data?.message || "Unable to create account. Please try again.");
        return;
      }

      setSuccess("Account created. Redirecting to login…");
      setTimeout(() => router.push(`/login?next=${encodeURIComponent(redirectTo)}`), 700);
    } catch {
      setErr("Network error. Please check your connection and try again.");
    }
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 relative overflow-hidden py-12">
      {/* Gradient background (same vibe as login) */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.4),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.28),transparent)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

      <div className="relative z-10 min-h-screen grid place-items-center p-4 sm:p-6 md:p-0">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-neutral-900/70 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] overflow-hidden">
          {/* header */}
          <div className="px-8 pt-8 pb-4">
            <Image src={logo} alt="Ceflix+ logo" className="w-[8rem] mx-auto mb-4" />
            <p className="text-neutral-400 font-[500] text-sm mt-1 text-center">
              Create your account to continue
            </p>
          </div>

          {/* tabs */}
          <div className="mt-2 mx-8 grid grid-cols-2 text-center text-sm rounded-xl bg-neutral-800/60 p-1">
            <Link
              href={`/login?next=${encodeURIComponent(redirectTo)}`}
              className="py-2 rounded-lg text-neutral-300 hover:text-white transition cursor-pointer"
            >
              Log In
            </Link>
            <button
              type="button"
              className="py-2 rounded-lg bg-neutral-900 text-white font-semibold shadow-inner cursor-default"
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

            {success && (
              <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 px-4 py-3 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* First/Last name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-md font-medium text-neutral-300 text-left">
                    First name
                  </label>
                  <input
                    type="text"
                    value={firstname}
                    onChange={(e) => setFirstname(e.target.value)}
                    className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="John"
                    autoComplete="given-name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-md font-medium text-neutral-300 text-left">
                    Last name
                  </label>
                  <input
                    type="text"
                    value={lastname}
                    onChange={(e) => setLastname(e.target.value)}
                    className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Doe"
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="you@email.com"
                  autoComplete="email"
                />
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="username"
                  autoComplete="username"
                />
              </div>

              {/* Country (optional, prefilled) */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Country <span className="text-neutral-500">(optional)</span>
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="United Kingdom"
                  autoComplete="country-name"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Password
                </label>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 pr-10 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="cursor-pointer absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-200"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-neutral-500">
                  Min 8 chars, include a number + special character.
                </p>
              </div>

              {/* Confirm password */}
              <div className="space-y-2">
                <label className="block text-md font-medium text-neutral-300 text-left">
                  Confirm password
                </label>

                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 pr-10 text-md text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="••••••••"
                    autoComplete="new-password"
                  />

                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="cursor-pointer absolute inset-y-0 right-2 flex items-center text-neutral-400 hover:text-neutral-200"
                    tabIndex={-1}
                    aria-label={showConfirm ? "Hide password" : "Show password"}
                  >
                    {showConfirm ? (
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
                    Creating…
                  </>
                ) : (
                  <>
                    <span>Create account</span>
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

              <p className="text-center text-xs text-neutral-500 pt-2">
                Already have an account?{" "}
                <Link
                  href={`/login?next=${encodeURIComponent(redirectTo)}`}
                  className="cursor-pointer text-neutral-300 hover:text-white underline underline-offset-2"
                >
                  Log in
                </Link>
              </p>
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

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterPageContent />
    </Suspense>
  );
}