"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/24/outline";

import { useAuth } from "../../components/AuthProvider";
import {
  fetchHomeLayout,
  resetHomeLayout,
  saveHomeLayout,
  type HomeSectionPreference,
} from "../../lib/personalization";

export default function HomeLayoutPage() {
  const router = useRouter();
  const { token, initialized } = useAuth();

  const [sections, setSections] = useState<HomeSectionPreference[]>([]);
  const [original, setOriginal] = useState<HomeSectionPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchHomeLayout(token);
      setSections(data);
      setOriginal(data);
    } catch (e: any) {
      setError(e?.message || "We couldn't load your home page settings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!initialized) return;
    load();
  }, [initialized, load]);

  // Compare by key order and visibility — sort_order values are recalculated
  // on save, so they are not a meaningful difference.
  const dirty = useMemo(() => {
    if (sections.length !== original.length) return true;

    return sections.some((section, index) => {
      const before = original[index];
      return (
        !before ||
        before.section_key !== section.section_key ||
        before.is_hidden !== section.is_hidden
      );
    });
  }, [sections, original]);

  const visibleCount = sections.filter((s) => !s.is_hidden).length;

  function toggleVisibility(key: string) {
    setNotice(null);

    setSections((prev) => {
      const next = prev.map((section) =>
        section.section_key === key
          ? { ...section, is_hidden: !section.is_hidden }
          : section,
      );

      // Leaving the home page completely empty is never what someone wants.
      if (next.every((section) => section.is_hidden)) {
        setNotice("Your home page needs at least one visible section.");
        return prev;
      }

      return next;
    });
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= sections.length) return;

    setNotice(null);

    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(target, 0, moved);
      return next;
    });
  }

  async function handleSave() {
    if (!token) return;

    setSaving(true);
    setError(null);

    try {
      await saveHomeLayout(
        token,
        sections.map((section) => ({
          section_key: section.section_key,
          is_hidden: section.is_hidden,
        })),
      );

      setOriginal(sections);
      setNotice("Home page updated. Refresh the home page to see the changes.");
    } catch (e: any) {
      setError(e?.message || "Couldn't save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!token) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      await resetHomeLayout(token);
      await load();
      setNotice("Restored the default layout.");
    } catch (e: any) {
      setError(e?.message || "Couldn't reset. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!initialized || loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <div className="h-8 w-56 rounded bg-neutral-800 animate-pulse" />
          <div className="mt-6 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-neutral-900 animate-pulse"
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
        <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-2xl font-semibold">Home page</h1>
          <p className="mt-2 text-sm text-neutral-400">
            Sign in to customise which sections appear on your home page.
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
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 pt-24 pb-16">
        <h1 className="text-2xl font-semibold">Home page</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          Choose which rows appear on your home page and the order they show in.{" "}
          {visibleCount} of {sections.length} visible.
        </p>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {notice ? (
          <div className="mt-6 rounded-lg border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-200">
            {notice}
          </div>
        ) : null}

        <ul className="mt-6 divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10 bg-neutral-900/40">
          {sections.map((section, index) => (
            <li
              key={section.section_key}
              className="flex items-center gap-3 px-3 py-3 sm:px-4"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  aria-label={`Move ${section.title} up`}
                  className="text-neutral-500 transition hover:text-white disabled:cursor-not-allowed disabled:text-neutral-800"
                >
                  <ChevronUpIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === sections.length - 1}
                  aria-label={`Move ${section.title} down`}
                  className="text-neutral-500 transition hover:text-white disabled:cursor-not-allowed disabled:text-neutral-800"
                >
                  <ChevronDownIcon className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p
                    className={`truncate text-sm font-medium ${
                      section.is_hidden ? "text-neutral-500" : "text-white"
                    }`}
                  >
                    {section.title}
                  </p>

                  {section.personalized ? (
                    <span className="shrink-0 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                      For you
                    </span>
                  ) : null}
                </div>

                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {section.description}
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={!section.is_hidden}
                aria-label={`Show ${section.title}`}
                onClick={() => toggleVisibility(section.section_key)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  section.is_hidden ? "bg-neutral-700" : "bg-sky-500"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    section.is_hidden ? "left-0.5" : "left-[22px]"
                  }`}
                />
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-center justify-between gap-4">
          <button
            onClick={handleReset}
            disabled={saving}
            className="inline-flex items-center gap-2 text-sm text-neutral-400 transition hover:text-white disabled:opacity-50"
          >
            <ArrowPathIcon className="h-4 w-4" />
            Reset to default
          </button>

          <button
            onClick={handleSave}
            disabled={!dirty || saving}
            className="rounded-full bg-sky-500 px-7 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-neutral-800 disabled:text-neutral-500"
          >
            {saving ? "Saving…" : dirty ? "Save changes" : "All changes saved"}
          </button>
        </div>
      </div>
    </main>
  );
}
