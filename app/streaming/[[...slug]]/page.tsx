"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useRouter } from "next/navigation";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const PROVISION_URL = "https://v4api.ceflix.org/api/ingest/provision";
const DUMMY_STREAM_URL = "https://example.com/dummy-stream.m3u8";

type PrivacyOption = { id: number; title: string };
const PRIVACY_OPTIONS: PrivacyOption[] = [
  { id: 1, title: "Public" },
  { id: 0, title: "Private" },
];

type Channel = {
  id: number | string;
  title?: string;
  channel?: string;
  name?: string;
  channel_title?: string;
  slug?: string;
};

type ProvisionResponse = {
  success?: boolean;
  message?: string;
  ingest_username?: string;
  ingest_password?: string;
  streamKey?: string;
  rtmp_ingest_url?: string;
  maxBitRate?: number;
  hlsPlayBack?: string;
  vodPlayBack?: string;
};

type VideoApiResponse = {
  status?: boolean;
  data?: {
    video?: {
      id?: number | string;
      channel_id?: number | string;
      videos_title?: string;
      description?: string;
      tags?: string | null;
      thumbnail?: string;
      isPublic?: string | number;
      active?: string | number;
      endDate?: string | null;
      ingest_username?: string | null;
      ingest_password?: string | null;
      streamKey?: string | null;
      rtmp_ingest_url?: string | null;
      maxBitRate?: number | null;
      url?: string | null;
      vodPlayBack?: string | null;
      isLive?: string | number | null;
      streamEnd?: boolean | null;
    };
  };
};

function getChannelTitle(c: Channel | null | undefined) {
  if (!c) return "";
  return (
    c.title ??
    c.channel_title ??
    c.channel ??
    c.name ??
    c.slug ??
    String(c.id ?? "")
  );
}

function formatDisplayDateTime(value?: Date | string | null) {
  if (!value) return "";

  const date =
    value instanceof Date ? value : new Date(String(value).replace(" ", "T"));

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function hasExistingStreamDetails(p: ProvisionResponse | null | undefined) {
  if (!p) return false;

  return Boolean(
    p.streamKey ||
    p.ingest_username ||
    p.ingest_password ||
    p.rtmp_ingest_url ||
    p.hlsPlayBack ||
    p.vodPlayBack,
  );
}

function parseApiDateToLocalInputDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function IconInfo(props: { className?: string }) {
  return (
    <svg className={props.className ?? ""} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 10v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 7h.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconCamera(props: { className?: string }) {
  return (
    <svg className={props.className ?? ""} viewBox="0 0 24 24" fill="none">
      <path
        d="M4 7a3 3 0 0 1 3-3h2l1-1h4l1 1h2a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V7Z"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

function Modal(props: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-semibold text-white">{props.title}</h2>
          <button
            type="button"
            onClick={props.onClose}
            className="cursor-pointer text-neutral-300 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-4">{props.children}</div>
      </div>
    </div>
  );
}

function FieldLabel(props: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="mb-2 text-sm text-white">
      {props.children}{" "}
      {props.required ? <span className="text-red-500">*</span> : null}
    </p>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white placeholder-neutral-500",
        "focus:outline-none focus:ring-2 focus:ring-sky-500",
        props.disabled ? "cursor-not-allowed opacity-60" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white placeholder-neutral-500",
        "focus:outline-none focus:ring-2 focus:ring-sky-500",
        props.disabled ? "cursor-not-allowed opacity-60" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function CopyRow(props: {
  label: string;
  value: string | number | undefined | null;
  note?: string;
}) {
  const text = props.value == null ? "" : String(props.value);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="flex-1">
        <FieldLabel>{props.label}</FieldLabel>
        <Input value={text} disabled />
        {props.note ? (
          <p className="mt-2 text-xs text-neutral-400">{props.note}</p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={!text}
        className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-6 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Copy
      </button>
    </div>
  );
}

export default function StreamingDashboardPage() {
  const { user, token } = useAuth();
  const searchParams = useSearchParams();

  const xToken = token ?? "";
  const localUserID = user?.id ? String(user.id) : "";
  const urlVideoId =
    searchParams.get("video_id") || searchParams.get("videoId") || "";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(false);

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelVal, setChannelVal] = useState<Channel | null>(null);
  const [privacyVal, setPrivacyVal] = useState<PrivacyOption>(
    PRIVACY_OPTIONS[0],
  );

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [apiEndDate, setApiEndDate] = useState<string | null>(null);
  const [streamEnd, setStreamEnd] = useState(false);

  const [thumbOpen, setThumbOpen] = useState(false);

  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return clampEndDate(d);
  });

  const [createdVideoID, setCreatedVideoID] = useState("");
  const [provisioned, setProvisioned] = useState<ProvisionResponse | null>(
    null,
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();
  const isLoggedIn = !!user && !!token;

  function addHours(date: Date, hours: number) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  function clampEndDate(date: Date) {
    const now = new Date();
    const max = addHours(now, 6);

    if (date.getTime() < now.getTime()) return now;
    if (date.getTime() > max.getTime()) return max;
    return date;
  }

  const now = new Date();
  const maxStreamEndTime = new Date(now.getTime() + 6 * 60 * 60 * 1000);

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const selectedDayIsToday = isSameDay(endDate, now);
  const selectedDayIsMaxDay = isSameDay(endDate, maxStreamEndTime);

  const minSelectableTime = selectedDayIsToday
    ? now
    : new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        0,
        0,
        0,
        0,
      );

  const maxSelectableTime = selectedDayIsMaxDay
    ? maxStreamEndTime
    : new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59,
        999,
      );

  async function apiPost(
    path: string,
    body: any,
    extraHeaders?: Record<string, string>,
  ) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
        ...(extraHeaders ?? {}),
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => null);
    return { res, json };
  }

  async function loadChannels() {
    const { json } = await apiPost(
      "user/channels",
      { token: xToken },
      xToken ? { "X-TOKEN": xToken } : undefined,
    );

    if (json?.status && Array.isArray(json?.data)) {
      const normalized = (json.data as Channel[]).map((c) => ({
        ...c,
        title: getChannelTitle(c),
      }));

      setChannels(normalized);
      return normalized;
    }

    setChannels([]);
    return [];
  }

  async function loadVideoAndPrefill(
    videoId: string,
    loadedChannels?: Channel[],
  ) {
    if (!videoId) return;

    setPrefillLoading(true);
    try {
      const { res, json } = await apiPost(
        "video",
        { video: String(videoId), token: xToken || "" },
        xToken ? { "X-TOKEN": xToken } : undefined,
      );

      if (!res.ok || !json?.status) {
        throw new Error(json?.message || "Unable to load video details.");
      }

      const data = json as VideoApiResponse;
      const video = data?.data?.video;
      if (!video) return;

      setCreatedVideoID(String(video.id ?? videoId));
      setTitle(video.videos_title ?? "");
      setDescription(video.description ?? "");
      setTags(video.tags ?? "");
      setThumbnail(video.thumbnail ?? "");
      setStreamEnd(video.streamEnd ?? false);
      setApiEndDate(video.endDate ?? null);

      const privacyId = String(video.isPublic ?? "1") === "1" ? 1 : 0;
      setPrivacyVal(privacyId === 1 ? PRIVACY_OPTIONS[0] : PRIVACY_OPTIONS[1]);

      const parsedEndDate = parseApiDateToLocalInputDate(video.endDate);
      if (parsedEndDate) {
        setEndDate(parsedEndDate);
      }

      const matchedProvision: ProvisionResponse = {
        ingest_username: video.ingest_username ?? undefined,
        ingest_password: video.ingest_password ?? undefined,
        streamKey: video.streamKey ?? undefined,
        rtmp_ingest_url: video.rtmp_ingest_url ?? undefined,
        maxBitRate: video.maxBitRate ?? undefined,
        hlsPlayBack: video.url ?? undefined,
        vodPlayBack: video.vodPlayBack ?? undefined,
      };

      if (
        matchedProvision.ingest_username ||
        matchedProvision.ingest_password ||
        matchedProvision.streamKey ||
        matchedProvision.rtmp_ingest_url ||
        matchedProvision.hlsPlayBack ||
        matchedProvision.vodPlayBack
      ) {
        setProvisioned(matchedProvision);
      }

      const channelList = loadedChannels ?? channels;
      const matchedChannel = channelList.find(
        (c) => String(c.id) === String(video.channel_id ?? ""),
      );
      if (matchedChannel) {
        setChannelVal(matchedChannel);
      }
    } catch (e: any) {
      setError(e?.message || "Unable to prefill video data.");
    } finally {
      setPrefillLoading(false);
    }
  }

  async function setup() {
    setLoading(true);
    setError("");

    try {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      if (!xToken) {
        setError("No token found. Please sign in again.");
        return;
      }

      const loadedChannels = await loadChannels();

      if (loadedChannels.length > 0 && !urlVideoId) {
        setChannelVal(loadedChannels[0]);
      }

      if (urlVideoId) {
        await loadVideoAndPrefill(urlVideoId, loadedChannels);
      }
    } catch {
      setError("An error occurred while loading the streaming page.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void setup();
  }, [isLoggedIn, xToken, urlVideoId]);

  function validateForm() {
    if (!xToken) return "No token found. Please sign in again.";
    if (!localUserID) return "User ID was not found on the authenticated user.";
    if (!channelVal) return "Please select a channel.";
    if (!title.trim()) return "Please enter a stream title.";
    if (!thumbnail.trim()) return "Please add a thumbnail.";

    const now = new Date();
    const max = addHours(now, 6);

    if (endDate.getTime() < now.getTime()) {
      return "Stream end time cannot be in the past.";
    }

    if (endDate.getTime() > max.getTime()) {
      return "Stream end time cannot be more than 6 hours ahead.";
    }

    return "";
  }

  async function uploadInitialDummyStream(): Promise<string> {
    const formData = new FormData();
    formData.append("video_title", title.trim());
    formData.append("description", description.trim());
    formData.append("tags", tags.trim());
    formData.append("privacy", "1");
    formData.append("token", xToken);
    formData.append("channel", String(channelVal?.id ?? ""));
    formData.append("thumbnail", thumbnail.trim());
    formData.append("type", "stream");
    formData.append("endDate", String(Math.floor(endDate.getTime() / 1000)));
    formData.append("startDate", String(Math.floor(Date.now() / 1000)));
    formData.append("stream", DUMMY_STREAM_URL);

    const uploadRes = await fetch(`${API_BASE}video/upload`, {
      method: "POST",
      headers: {
        "Application-Key": APP_KEY,
        ...(xToken ? { "X-TOKEN": xToken } : {}),
      },
      body: formData,
    });

    const uploadJson = await uploadRes.json().catch(() => null);

    if (!uploadRes.ok || !uploadJson?.status) {
      throw new Error(uploadJson?.message || "Initial stream upload failed.");
    }

    const savedVideoId =
      uploadJson?.data?.data?.video_id ??
      uploadJson?.data?.video_id ??
      uploadJson?.video_id ??
      "";

    if (!savedVideoId) {
      throw new Error("Video upload succeeded but no video ID was returned.");
    }

    return String(savedVideoId);
  }

  async function provisionStream(videoId: string): Promise<ProvisionResponse> {
    const provisionRes = await fetch(PROVISION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userID: Number(localUserID),
        videoID: String(videoId),
        videoTitle: title.trim(),
      }),
    });

    const provisionJson: ProvisionResponse | null = await provisionRes
      .json()
      .catch(() => null);

    if (!provisionRes.ok || !provisionJson?.success) {
      throw new Error(
        provisionJson?.message || "Failed to generate stream credentials.",
      );
    }

    return provisionJson;
  }

  async function updateVideoWithProvisionedDetails(
    videoId: string,
    provision: ProvisionResponse,
  ) {
    const body = new URLSearchParams();

    body.append("channel", String(channelVal?.id ?? ""));
    body.append("video_id", videoId);
    body.append("video_title", title.trim());
    body.append("description", description.trim());
    body.append("privacy", "1");
    body.append("tags", tags.trim());
    body.append("token", xToken);

    if (provision.ingest_username) {
      body.append("ingest_username", provision.ingest_username);
    }

    if (provision.ingest_password) {
      body.append("ingest_password", provision.ingest_password);
    }

    if (provision.streamKey) {
      body.append("streamKey", provision.streamKey);
    }

    if (provision.rtmp_ingest_url) {
      body.append("rtmp_ingest_url", provision.rtmp_ingest_url);
    }

    if (provision.maxBitRate !== undefined) {
      body.append("maxBitRate", String(provision.maxBitRate));
    }

    if (provision.hlsPlayBack) {
      body.append("hlsPlayBack", provision.hlsPlayBack);
      body.append("url", provision.hlsPlayBack);
      body.append("ios_url", provision.hlsPlayBack);
    }

    if (provision.vodPlayBack) {
      body.append("vodPlayBack", provision.vodPlayBack);
    }

    body.append("isLive", "1");

    const res = await fetch(`${API_BASE}video/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Application-Key": APP_KEY,
        ...(xToken ? { "X-TOKEN": xToken } : {}),
      },
      body: body.toString(),
    });

    const json = await res.json().catch(() => null);

    if (!res.ok || !json?.status) {
      throw new Error(
        json?.message ||
          "Video was created, but updating stream details failed.",
      );
    }

    return json;
  }

  async function createStreamFlow() {
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    const safeEndDate = clampEndDate(endDate);
    if (safeEndDate.getTime() !== endDate.getTime()) {
      setEndDate(safeEndDate);
      setError("Please choose an end time from now up to 6 hours ahead.");
      return;
    }

    setBusy(true);

    try {
      const videoId = createdVideoID || (await uploadInitialDummyStream());
      setCreatedVideoID(videoId);

      if (!urlVideoId) {
        router.replace(`?video_id=${videoId}`);
      }

      let finalProvision = provisioned;

      // only provision if this video does not already have stream details
      if (!hasExistingStreamDetails(finalProvision)) {
        finalProvision = await provisionStream(videoId);
        setProvisioned(finalProvision);

        await updateVideoWithProvisionedDetails(videoId, finalProvision);
      }

      await loadVideoAndPrefill(videoId, channels);

      setSuccess(
        hasExistingStreamDetails(finalProvision)
          ? "Stream details loaded successfully."
          : "Stream created and stream credentials saved successfully.",
      );
    } catch (e: any) {
      setError(e?.message || "Something went wrong while creating the stream.");
    } finally {
      setBusy(false);
    }
  }

  const onPickThumbFile = (file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setThumbnail(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
        <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

        <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-20 lg:px-6">
          <div className="max-w-2xl rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">
              Live Streaming Dashboard
            </h1>
            <p className="mt-3 text-sm text-neutral-300">
              Sign in to access the live streaming dashboard and create or
              manage your streams.
            </p>

            <div className="mt-5">
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="cursor-pointer rounded-full bg-white px-5 py-2 text-sm font-semibold text-black transition hover:bg-neutral-200"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

      <Modal
        open={thumbOpen}
        title="Update Thumbnail"
        onClose={() => setThumbOpen(false)}
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-300">
            Paste an image URL or upload an image file.
          </p>

          <div className="space-y-2">
            <p className="text-xs text-neutral-300">Image URL</p>
            <Input
              value={thumbnail}
              onChange={(e) => setThumbnail(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-neutral-300">Upload file</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => onPickThumbFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-neutral-200 file:mr-3 file:rounded-full file:border-0 file:bg-neutral-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-neutral-700"
            />
          </div>

          {thumbnail && (
            <div className="rounded-xl border border-white/10 bg-black/30 p-2">
              <img
                src={thumbnail}
                alt="Thumbnail preview"
                className="aspect-video w-full rounded-lg object-cover"
              />
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setThumbOpen(false)}
              className="cursor-pointer rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      <div className="relative z-10 mx-auto max-w-[110rem] px-4 py-8 lg:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight md:text-2xl">
              Live Streaming Dashboard
            </h1>
            <p className="mt-1 text-sm text-neutral-300">
              {urlVideoId ? `Editing stream video ${urlVideoId}` : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
          >
            Refresh
          </button>
        </div>

        {(loading || prefillLoading) && (
          <div className="w-full animate-pulse rounded-2xl border border-white/10 bg-neutral-900/50 p-6">
            <div className="h-8 w-64 rounded bg-white/10" />
            <div className="mt-3 h-4 w-96 rounded bg-white/10" />
          </div>
        )}

        {!loading && !prefillLoading && (
          <>
            {busy && (
              <div className="fixed inset-0 z-40 grid place-items-center bg-black/35 backdrop-blur-[1px]">
                <div className="rounded-2xl border border-white/10 bg-neutral-900/80 px-5 py-4 text-sm text-neutral-200 shadow-xl">
                  Working…
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 lg:col-span-3">
                {/* <div className="mb-4 flex items-start gap-3 text-sm text-neutral-200">
                  <IconInfo className="mt-0.5 h-5 w-5 text-neutral-300" />
                  <p>
                    {urlVideoId
                      ? "This page loaded the existing video and prefilled the form. Creating credentials again will update that same video."
                      : "This flow uploads a placeholder live record first, then provisions the real RTMP credentials, then updates the saved video with those details."}
                  </p>
                </div> */}

                <div className="space-y-4">
                  <div>
                    <FieldLabel required>Channel</FieldLabel>
                    <select
                      value={channelVal ? String(channelVal.id) : ""}
                      onChange={(e) => {
                        const found = channels.find(
                          (c) => String(c.id) === e.target.value,
                        );
                        if (found) setChannelVal(found);
                      }}
                      className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {channels.map((c) => (
                        <option key={String(c.id)} value={String(c.id)}>
                          {getChannelTitle(c)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <FieldLabel required>Title</FieldLabel>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter a stream title"
                    />
                  </div>

                  <div>
                    <FieldLabel>Description</FieldLabel>
                    <TextArea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe your stream…"
                    />
                  </div>

                  <div>
                    <FieldLabel>Tags</FieldLabel>
                    <Input
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="e.g. faith, worship, teaching"
                    />
                  </div>

                  {!hasExistingStreamDetails(provisioned) && (
                    <div>
                      <FieldLabel required>Set stream end time</FieldLabel>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => {
                          if (!date) return;
                          setEndDate(clampEndDate(date));
                        }}
                        minDate={now}
                        maxDate={maxStreamEndTime}
                        minTime={minSelectableTime}
                        maxTime={maxSelectableTime}
                        showTimeSelect
                        timeFormat="HH:mm"
                        dateFormat="dd/MM/yyyy HH:mm"
                        className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                      <p className="mt-2 text-xs text-neutral-400">
                        End time must be from now up to 6 hours ahead.
                      </p>
                    </div>
                  )}

                  <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">
                        Thumbnail
                      </p>
                      <button
                        type="button"
                        onClick={() => setThumbOpen(true)}
                        className="cursor-pointer text-xs font-semibold text-red-400 hover:text-red-300"
                      >
                        Change
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 items-center gap-4 sm:grid-cols-6">
                      <button
                        type="button"
                        onClick={() => setThumbOpen(true)}
                        className="relative aspect-video overflow-hidden rounded-xl border border-white/10 bg-neutral-800/40 sm:col-span-3"
                      >
                        {thumbnail ? (
                          <>
                            <img
                              src={thumbnail}
                              alt="Thumbnail"
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition hover:opacity-100">
                              <IconCamera className="h-10 w-10 text-white/70" />
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 grid place-items-center text-sm text-neutral-300">
                            Pick a thumbnail
                          </div>
                        )}
                      </button>

                      <div className="sm:col-span-3">
                        <p className="text-xs text-neutral-300">
                          Use a clear 16:9 image. You can paste a URL or upload
                          a file.
                        </p>
                        <button
                          type="button"
                          onClick={() => setThumbOpen(true)}
                          className="mt-3 cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                        >
                          Update thumbnail
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* <div>
                    <FieldLabel>Privacy Setting</FieldLabel>
                    <select
                      value={String(privacyVal.id)}
                      onChange={(e) => {
                        const found = PRIVACY_OPTIONS.find((p) => String(p.id) === e.target.value);
                        if (found) setPrivacyVal(found);
                      }}
                      className="w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      {PRIVACY_OPTIONS.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div> */}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void createStreamFlow()}
                      disabled={busy}
                      className="cursor-pointer rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {hasExistingStreamDetails(provisioned)
                        ? "Load Stream Details"
                        : createdVideoID
                          ? "Generate Stream Credentials"
                          : "Create Stream"}
                    </button>
                  </div>

                  {error ? (
                    <p className="text-xs font-semibold text-red-400">
                      {error}
                    </p>
                  ) : null}

                  {success ? (
                    <p className="text-xs font-semibold text-green-400">
                      {success}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-5 lg:col-span-4">
                <h3 className="mb-4 text-sm font-semibold text-white">
                  Stream Details
                </h3>

                {!provisioned ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-5 text-sm text-neutral-400">
                    No stream credentials yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <CopyRow
                      label="RTMP ingest URL"
                      value={provisioned.rtmp_ingest_url}
                      note="Use this as your server URL in OBS or another encoder."
                    />

                    {createdVideoID && (
                      <CopyRow
                        label="Video Link"
                        value={`https://ceflix.org/videos/watch/${createdVideoID}`}
                      />
                    )}

                    <CopyRow label="Stream key" value={provisioned.streamKey} />

                    <CopyRow
                      label="Ingest username"
                      value={provisioned.ingest_username}
                    />
                    <CopyRow
                      label="Ingest password"
                      value={provisioned.ingest_password}
                    />
                    <CopyRow
                      label="Max bitrate"
                      value={provisioned.maxBitRate}
                    />

                    <CopyRow
                      label="Stream ends"
                      value={formatDisplayDateTime(apiEndDate)}
                      note="This is when the live stream is scheduled to end."
                    />

                    {!streamEnd ? (
                      <CopyRow
                        label="HLS playback"
                        value={provisioned.hlsPlayBack}
                      />
                    ) : (
                      <CopyRow
                        label="VOD playback"
                        value={provisioned.vodPlayBack}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
