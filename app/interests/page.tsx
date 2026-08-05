"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckIcon } from "@heroicons/react/24/solid";

import { useAuth } from "../components/AuthProvider";
import {
  fetchInterestCatalog,
  fetchInterestStatus,
  saveInterests,
  skipInterests,
  type Interest,
} from "../lib/personalization";

export default function InterestsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, initialized } = useAuth();

  const isEditing = searchParams.get("mode") === "edit";

  const [interests, setInterests] = useState<Interest[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [recommendedMinimum, setRecommendedMinimum] = useState(3);
  const [maxSelections, setMaxSelections] = useState(25);
  const [failedImages, setFailedImages] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFailedImages({});

    try {
      const catalog = await fetchInterestCatalog();

      setInterests(catalog.interests);
      setRecommendedMinimum(catalog.recommendedMinimum);
      setMaxSelections(catalog.maxSelections);

      // Editing should open with the user's existing picks already on.
      if (token) {
        try {
          const status = await fetchInterestStatus(token);
          setSelected(Array.isArray(status?.selected) ? status.selected : []);
        } catch {
          setSelected([]);
        }
      }
    } catch (e: any) {
      setError(e?.message || "We couldn't load interests right now.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialized) return;
    load();
  }, [initialized, load]);

  const selectedCount = selected.length;
  const remaining = Math.max(0, recommendedMinimum - selectedCount);

  const headline = useMemo(() => {
    if (isEditing) return "Your interests";
    if (selectedCount === 0) return "What are you into?";
    if (remaining > 0) return `Nice. ${remaining} more to go`;
    return "Your feed is ready";
  }, [isEditing, selectedCount, remaining]);

  const subtitle = useMemo(() => {
    if (isEditing) {
      return "Update these any time. Your home page adjusts straight away.";
    }
    if (remaining > 0) {
      return `Pick at least ${recommendedMinimum} topics and we'll build a home page around them.`;
    }
    return "Great picks. You can always change these later in Settings.";
  }, [isEditing, remaining, recommendedMinimum]);

  function toggle(id: number) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);

      if (prev.length >= maxSelections) return prev;

      return [...prev, id];
    });
  }

  function leave() {
    router.push(isEditing ? "/settings" : "/");
  }

  async function handleSave() {
    if (!token) {
      leave();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveInterests(token, selected);
      leave();
    } catch (e: any) {
      setError(e?.message || "Couldn't save your interests. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSkip() {
    // Recorded so the picker is not offered on every sign-in.
    if (token) skipInterests(token).catch(() => {});
    leave();
  }

  if (!initialized || loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <div className="h-8 w-64 rounded bg-neutral-800 animate-pulse" />
          <div className="mt-3 h-4 w-96 max-w-full rounded bg-neutral-900 animate-pulse" />
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] rounded-xl bg-neutral-900 animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-2xl font-semibold">Your interests</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sign in to choose the topics your home page is built around.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-full bg-sky-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-32">
      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-24">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {headline}
            </h1>
            <p className="mt-2 text-sm leading-6 text-neutral-400 max-w-xl">
              {subtitle}
            </p>
          </div>

          {!isEditing ? (
            <button
              onClick={handleSkip}
              className="shrink-0 text-sm text-neutral-400 hover:text-white"
            >
              Skip
            </button>
          ) : null}
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {interests.map((interest) => {
            const isSelected = selected.includes(interest.id);
            const accent = interest.color || "#06b6f2";
            // The accent sits under the image, so a slow or failed load shows a
            // coloured tile with the title rather than an empty box.
            const showImage =
              Boolean(interest.thumbnail) && !failedImages[interest.id];

            return (
              <button
                key={interest.id}
                type="button"
                onClick={() => toggle(interest.id)}
                aria-pressed={isSelected}
                style={{ backgroundColor: accent }}
                className={`group relative aspect-[4/3] overflow-hidden rounded-xl text-left transition ring-offset-2 ring-offset-neutral-950 ${
                  isSelected
                    ? "ring-2 ring-sky-400"
                    : "ring-1 ring-white/10 hover:ring-white/30"
                }`}
              >
                {showImage ? (
                  // Remote placeholder host, so a plain <img> avoids adding a
                  // next.config image domain for artwork that is editable in
                  // the database and can point anywhere.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={interest.thumbnail}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    onError={() =>
                      setFailedImages((prev) => ({
                        ...prev,
                        [interest.id]: true,
                      }))
                    }
                  />
                ) : null}

                <div
                  className={`absolute inset-0 ${
                    showImage
                      ? "bg-gradient-to-t from-black/80 via-black/25 to-black/5"
                      : "bg-gradient-to-t from-black/45 to-transparent"
                  }`}
                />

                {isSelected ? (
                  <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500">
                    <CheckIcon className="h-4 w-4 text-white" />
                  </span>
                ) : null}

                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-sm font-semibold leading-tight">
                    {interest.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/70">
                    {interest.channel_count} channel
                    {interest.channel_count === 1 ? "" : "s"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-neutral-950/95 backdrop-blur">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-8 py-4">
          <p className="text-sm text-neutral-400">{selectedCount} selected</p>

          <button
            onClick={handleSave}
            disabled={saving || (!isEditing && selectedCount === 0)}
            className="rounded-full bg-sky-500 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            {saving ? "Saving…" : isEditing ? "Save changes" : "Continue"}
          </button>
        </div>
      </div>
    </main>
  );
}
