"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CheckBadgeIcon,
  SpeakerWaveIcon,
  StopIcon,
  PlayIcon,
  PauseIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";

const ASK_API = "https://nmt.loveworldapis.com/api/kingsspace/search/ask";

type RecommendedVideo = {
  videoId: string | number;
  channelId?: string | number;
  title: string;
  slug?: string;
  description?: string;
  tags?: string[];
  thumbnail?: string;
  playbackUrl?: string;
  duration?: number | null;
  durationSeconds?: number | null;
  channel?: {
    id?: string | number;
    name?: string;
    thumbnail?: string;
    slug?: string;
    isVerified?: boolean;
  };
  channelName?: string;
  channelThumbnail?: string;
  views?: number;
  likes?: number;
  comments?: number;
  createdAt?: string;
  isShort?: boolean;
  transcriptStatus?: string;
  match?: {
    startSeconds?: number;
    endSeconds?: number;
    startLabel?: string;
    endLabel?: string;
    text?: string;
  } | null;
  score?: number;
};

type AskResponse = {
  status: boolean;
  question: string;
  usedModel: boolean;
  answer: string;
  recommendedVideos: RecommendedVideo[];
};

function slugifyText(value: string) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatDuration(seconds?: number | null) {
  if (!seconds || !Number.isFinite(seconds)) return null;
  const total = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }

  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function formatDateLabel(input?: string) {
  if (!input) return "";
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const EXAMPLE_QUESTIONS = [
  "Why should I confess that Jesus is Lord of my life?",
  "How do I build strong faith in God?",
  "What does Pastor Chris teach about salvation?",
  "Why is it important to put God first?",
];

export default function KingsspaceAskPage() {
  const [question, setQuestion] = useState(
    "Why should I confess that Jesus is Lord of my life?",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AskResponse | null>(null);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const answerParagraphs = useMemo(() => {
    if (!result?.answer) return [];
    return result.answer
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);
  }, [result]);

  const speakableAnswer = useMemo(() => {
    if (!result?.answer) return "";
    return result.answer.replace(/\s+/g, " ").trim();
  }, [result]);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    const loadVoices = () => {
      const available = window.speechSynthesis.getVoices();
      setVoices(available);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);

  const askQuestion = async (e?: FormEvent) => {
    e?.preventDefault();

    const trimmed = question.trim();
    if (!trimmed) return;

    stopSpeaking();

    setLoading(true);
    setError("");

    try {
      const res = await fetch(ASK_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // "x-api-key": "YOUR_KEY_HERE",
        },
        body: JSON.stringify({
          question: trimmed,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.status) {
        throw new Error(data?.message || "Failed to get answer.");
      }

      setResult(data as AskResponse);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const getPreferredVoice = () => {
    if (!voices.length) return null;

    return (
      voices.find((v) => /en-(gb|us)/i.test(v.lang) && /female|samantha|zira|google uk english female/i.test(v.name)) ||
      voices.find((v) => /en-(gb|us)/i.test(v.lang)) ||
      voices[0]
    );
  };

  const speakAnswer = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (!speakableAnswer) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(speakableAnswer);
    const preferredVoice = getPreferredVoice();

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.rate = 0.97;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  };

  const resumeSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
    setIsSpeaking(true);
  };

  const stopSpeaking = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
    utteranceRef.current = null;
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-6 shadow-2xl sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.05),transparent_25%)]" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-200">
              <SparklesIcon className="h-4 w-4" />
              KingsSpace AI Search
            </div>

            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
                  Ask spiritual questions and get answers with relevant videos
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
                  Search across message-based video content, see an AI-generated
                  response, and explore recommended videos with transcript matches.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-neutral-200">
                  <MagnifyingGlassIcon className="h-4 w-4" />
                  Try asking
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_QUESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setQuestion(item)}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-2 text-left text-xs text-neutral-200 transition hover:bg-white/10 sm:text-sm"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <form
          onSubmit={askQuestion}
          className="mt-6 rounded-3xl border border-neutral-800 bg-neutral-900/70 p-4 shadow-xl sm:p-5"
        >
          <label
            htmlFor="question"
            className="mb-3 block text-sm font-medium text-neutral-300"
          >
            Ask your question
          </label>

          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={4}
              placeholder="Ask something about salvation, faith, prayer, purpose..."
              className="w-full resize-none rounded-2xl border border-neutral-700 bg-neutral-950 px-4 py-3 text-sm text-white outline-none transition focus:border-neutral-500"
            />

            <div className="flex flex-row gap-3 lg:flex-col">
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Searching..." : "Ask AI"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setQuestion("Why should I confess that Jesus is Lord of my life?")
                }
                className="rounded-full border border-neutral-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && (
          <div className="mt-6 space-y-6">
            <div className="animate-pulse rounded-3xl border border-neutral-800 bg-neutral-900/70 p-6">
              <div className="mb-4 h-6 w-48 rounded bg-neutral-800" />
              <div className="space-y-3">
                <div className="h-4 w-full rounded bg-neutral-800" />
                <div className="h-4 w-11/12 rounded bg-neutral-800" />
                <div className="h-4 w-10/12 rounded bg-neutral-800" />
                <div className="h-4 w-8/12 rounded bg-neutral-800" />
              </div>
            </div>

            <div className="grid gap-4">
              {[...Array(4)].map((_, idx) => (
                <div
                  key={idx}
                  className="animate-pulse rounded-3xl border border-neutral-800 bg-neutral-900/70 p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="aspect-video w-full rounded-2xl bg-neutral-800 sm:w-80" />
                    <div className="flex-1">
                      <div className="mb-3 h-5 w-5/6 rounded bg-neutral-800" />
                      <div className="mb-3 h-4 w-48 rounded bg-neutral-800" />
                      <div className="space-y-2">
                        <div className="h-3.5 w-full rounded bg-neutral-800" />
                        <div className="h-3.5 w-4/5 rounded bg-neutral-800" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result && !loading && (
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-xl sm:p-6">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-semibold sm:text-2xl">Answer</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    result.usedModel
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-neutral-700 text-neutral-200"
                  }`}
                >
                  {result.usedModel ? "AI generated" : "Fallback answer"}
                </span>
              </div>

              <p className="mb-5 text-sm text-neutral-400">
                Question: <span className="text-white">{result.question}</span>
              </p>

              <div className="mb-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={speakAnswer}
                  disabled={!speakableAnswer}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:opacity-60"
                >
                  <SpeakerWaveIcon className="h-4 w-4" />
                  Read aloud
                </button>

                <button
                  type="button"
                  onClick={pauseSpeaking}
                  disabled={!isSpeaking || isPaused}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  <PauseIcon className="h-4 w-4" />
                  Pause
                </button>

                <button
                  type="button"
                  onClick={resumeSpeaking}
                  disabled={!isPaused}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  <PlayIcon className="h-4 w-4" />
                  Resume
                </button>

                <button
                  type="button"
                  onClick={stopSpeaking}
                  disabled={!isSpeaking && !isPaused}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
                >
                  <StopIcon className="h-4 w-4" />
                  Stop
                </button>
              </div>

              {(isSpeaking || isPaused) && (
                <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-neutral-300">
                  {isPaused ? "Speech paused." : "Reading answer aloud..."}
                </div>
              )}

              <div className="space-y-4 text-sm leading-7 text-neutral-200 sm:text-base">
                {answerParagraphs.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-900/70 p-5 shadow-xl sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 className="text-xl font-semibold sm:text-2xl">
                  Recommended videos
                </h2>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-neutral-300">
                  {result.recommendedVideos?.length || 0} result
                  {(result.recommendedVideos?.length || 0) === 1 ? "" : "s"}
                </span>
              </div>

              <div className="space-y-4">
                {(result.recommendedVideos || []).map((video) => {
                  const title = video.title || "Untitled video";
                  const videoSlug = video.slug?.trim()
                    ? video.slug
                    : slugifyText(title);

                  const watchHref = `/videos/watch/${encodeURIComponent(String(video.videoId))}/${encodeURIComponent(videoSlug)}`;

                  const channelName =
                    video.channel?.name || video.channelName || "Unknown channel";

                  const channelHref = video.channel?.id
                    ? `/channel/${encodeURIComponent(String(video.channel.id))}`
                    : video.channelId
                      ? `/channel/${encodeURIComponent(String(video.channelId))}`
                      : "#";

                  const durationLabel = formatDuration(video.durationSeconds);
                  const dateLabel = formatDateLabel(video.createdAt);

                  return (
                    <article
                      key={String(video.videoId)}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-black/20 transition hover:border-white/20 hover:bg-white/[0.03]"
                    >
                      <div className="flex flex-col sm:flex-row">
                        <Link
                          href={watchHref}
                          className="relative block aspect-video w-full overflow-hidden bg-neutral-950 sm:w-64"
                        >
                          <Image
                            src={video.thumbnail || "/placeholder.png"}
                            alt={title}
                            fill
                            unoptimized
                            className="object-cover transition duration-300 hover:scale-[1.03]"
                          />
                          {durationLabel && (
                            <span className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-xs font-semibold text-white">
                              {durationLabel}
                            </span>
                          )}
                        </Link>

                        <div className="min-w-0 flex-1 p-4">
                          <Link href={watchHref} className="block">
                            <h3 className="line-clamp-2 text-base font-semibold text-white sm:text-lg">
                              {title}
                            </h3>
                          </Link>

                          <div className="mt-2 flex min-w-0 items-center gap-2">
                            {channelHref !== "#" ? (
                              <Link
                                href={channelHref}
                                className="inline-flex min-w-0 items-center gap-2 text-sm text-neutral-300 hover:text-white"
                              >
                                <div className="relative h-6 w-6 overflow-hidden rounded-full bg-neutral-800">
                                  <Image
                                    src={
                                      video.channel?.thumbnail ||
                                      video.channelThumbnail ||
                                      "/placeholder.png"
                                    }
                                    alt={channelName}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                                <span className="truncate">{channelName}</span>
                                {video.channel?.isVerified && (
                                  <CheckBadgeIcon className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                                )}
                              </Link>
                            ) : (
                              <div className="inline-flex min-w-0 items-center gap-2 text-sm text-neutral-300">
                                <div className="relative h-6 w-6 overflow-hidden rounded-full bg-neutral-800">
                                  <Image
                                    src={
                                      video.channel?.thumbnail ||
                                      video.channelThumbnail ||
                                      "/placeholder.png"
                                    }
                                    alt={channelName}
                                    fill
                                    unoptimized
                                    className="object-cover"
                                  />
                                </div>
                                <span className="truncate">{channelName}</span>
                                {video.channel?.isVerified && (
                                  <CheckBadgeIcon className="h-4 w-4 flex-shrink-0 text-neutral-300" />
                                )}
                              </div>
                            )}
                          </div>

                          {(video.description || "").trim() && (
                            <p className="mt-3 line-clamp-2 text-sm text-neutral-400">
                              {video.description}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-500 sm:text-sm">
                            {dateLabel && <span>{dateLabel}</span>}
                            {video.transcriptStatus && (
                              <span>Transcript: {video.transcriptStatus}</span>
                            )}
                            {typeof video.score === "number" && (
                              <span>Score: {video.score.toFixed(3)}</span>
                            )}
                          </div>

                          {video.match && (
                            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                <span>Matched transcript</span>
                                {video.match.startLabel && video.match.endLabel && (
                                  <span className="rounded-full bg-neutral-800 px-2 py-1 normal-case tracking-normal text-neutral-200">
                                    {video.match.startLabel} - {video.match.endLabel}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm leading-6 text-neutral-300">
                                {video.match.text}
                              </p>
                            </div>
                          )}

                          {!!video.tags?.length && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {video.tags.slice(0, 6).map((tag) => (
                                <span
                                  key={tag}
                                  className="rounded-full bg-neutral-800 px-3 py-1 text-xs text-neutral-300"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}