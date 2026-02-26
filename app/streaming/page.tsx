// app/studio/streaming/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const LAMBDA_STREAM =
  "https://v6zxoqndtl.execute-api.us-east-1.amazonaws.com/prod/stream";

type PrivacyOption = { id: number; title: string };
const PRIVACY_OPTIONS: PrivacyOption[] = [
  { id: 1, title: "Public" },
  { id: 0, title: "Private" },
];

// ✅ Channel shape can vary depending on API
type Channel = {
  id: number | string;
  title?: string;
  channel?: string;
  name?: string;
  channel_title?: string;
  slug?: string;
};

type StreamLambdaData = {
  streamURL?: string;
  stream_key?: string;
  expireDate?: string;
  stream_title?: string;
  stream_description?: string;
  stream_video_id?: string;
  isExpired?: boolean;
};

type VideoResponse = {
  data?: {
    video?: {
      videos_title?: string;
      thumbnail?: string;
      description?: string;
      tags?: string;
      active?: number;
    };
  };
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtLocalDateTimeInput(d: Date) {
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function readUserEmailFromLS(): string {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem("ceflix.user");
    if (!raw) return "";
    const parsed = JSON.parse(raw);
    return parsed?.email ?? "";
  } catch {
    return "";
  }
}

// ✅ IMPORTANT: robust channel label resolver
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
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
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
        props.disabled ? "opacity-60 cursor-not-allowed" : "",
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
        props.disabled ? "opacity-60 cursor-not-allowed" : "",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function ProgressBar(props: { value: number }) {
  const v = clamp(props.value, 0, 100);
  return (
    <div className="w-full">
      <div className="flex items-center gap-3">
        <div className="h-2 w-full rounded-full bg-neutral-800 overflow-hidden">
          <div
            className="h-full bg-red-600 transition-[width] duration-200"
            style={{ width: `${v}%` }}
          />
        </div>
        <div className="min-w-[42px] text-xs font-semibold text-neutral-200 tabular-nums">
          {Math.round(v)}%
        </div>
      </div>
      {v === 100 && (
        <p className="mt-2 text-xs font-semibold text-neutral-200">
          Stream Uploaded
        </p>
      )}
    </div>
  );
}

export default function StreamingDashboardPage() {
  const { token } = useAuth();
  const xToken = token ?? "";

  const email = useMemo(() => readUserEmailFromLS(), []);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [streamID, setStreamID] = useState("");
  const [videoID, setVideoID] = useState("");
  const [live, setLive] = useState(false);

  const [streamData, setStreamData] = useState<StreamLambdaData>({});
  const [shareLink, setShareLink] = useState("");
  const [hlsUrl, setHlsUrl] = useState("");

  const [channels, setChannels] = useState<Channel[]>([]);
  const [channelVal, setChannelVal] = useState<Channel | null>(null);

  const [editingLocked, setEditingLocked] = useState(true);

  const [privacyVal, setPrivacyVal] = useState<PrivacyOption>(PRIVACY_OPTIONS[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const [thumbnail, setThumbnail] = useState("");
  const [hasChangedThumb, setHasChangedThumb] = useState(false);

  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    return d;
  });

  const [error, setError] = useState(false);
  const [errorM, setErrorM] = useState("");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [thumbOpen, setThumbOpen] = useState(false);

  const [progress, setProgress] = useState(0);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const refresh = () => {
    if (typeof window !== "undefined") window.location.reload();
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const validateEndTime = () => {
    const now = new Date();
    const min = new Date(now);
    min.setMinutes(min.getMinutes() - 30);
    const max = new Date(now);
    max.setHours(max.getHours() + 4);
    return !(endDate < min || endDate > max);
  };

  async function lambda(operation: string, payload: any) {
    const res = await fetch(LAMBDA_STREAM, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operation, ...payload }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) throw new Error("Stream service error");
    return json;
  }

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

  async function initializeStream(stream_id: string) {
    const init = await lambda("initialize_stream", { stream_id });

    if (init?.status) {
      setStreamData(init.data ?? {});

      if (init?.data?.stream_video_id) {
        const { json: videoJson } = await apiPost(
          "video",
          { video: init.data.stream_video_id, token: xToken },
          xToken ? { "X-TOKEN": xToken } : undefined,
        );

        const v = (videoJson as VideoResponse)?.data?.video;
        if (v) {
          setTitle(v.videos_title ?? "");
          setThumbnail(v.thumbnail ?? "");
          setDescription(v.description ?? "");
          setTags(v.tags ?? "");
          const active = typeof v.active === "number" ? v.active : 1;
          setPrivacyVal(active === 0 ? PRIVACY_OPTIONS[1] : PRIVACY_OPTIONS[0]);
        }

        if (!init?.data?.isExpired) {
          setVideoID(init.data.stream_video_id);
          setShareLink(`https://ceflix.org/videos/watch/${init.data.stream_video_id}`);
          setLive(true);
        }
      }
    }

    return init;
  }

  async function updateStreamVideoId(stream_id: string, stream_video_id: string) {
    try {
      await lambda("update_stream_video_id", { stream_id, stream_video_id });
    } catch {}
  }

  async function updateThumbnailApi(video_id: string) {
    await apiPost(
      "video/thumbnail/update",
      { video: video_id, thumbnail, token: xToken },
      xToken ? { "X-TOKEN": xToken } : undefined,
    );
  }

  async function updateStreamDetails(video_id: string) {
    setError(false);
    setErrorM("");

    if (!title.trim()) {
      setError(true);
      setErrorM("Kindly enter a title for your stream.");
      return;
    }
    if (!channelVal) {
      setError(true);
      setErrorM("Please select a channel.");
      return;
    }

    setBusy(true);
    try {
      const { json } = await apiPost(
        "video/update",
        {
          channel: Number(channelVal.id),
          description,
          privacy: privacyVal.id,
          tags,
          video_id,
          video_title: title,
          token: xToken,
        },
        xToken ? { "X-TOKEN": xToken } : undefined,
      );

      if (json?.status && hasChangedThumb) {
        await updateThumbnailApi(video_id);
        setHasChangedThumb(false);
      }
    } finally {
      setBusy(false);
    }
  }

  function uploadStreamVideoThenLinkToStream(stream_id: string) {
    setError(false);
    setErrorM("");

    if (!channelVal) {
      setError(true);
      setErrorM("Please select a channel.");
      return;
    }
    if (!title.trim() || !description.trim() || !thumbnail.trim()) {
      setError(true);
      setErrorM("Please ensure that all fields are complete (title, description, thumbnail).");
      return;
    }
    if (!validateEndTime()) {
      setError(true);
      setErrorM("Please enter a valid stream end time (within the next 4 hours).");
      return;
    }

    const formData = new FormData();
    formData.append("video_title", title);
    formData.append("description", description);
    formData.append("tags", tags);
    formData.append("startDate", String(Math.floor(Date.now() / 1000)));
    formData.append("privacy", privacyVal.title);
    formData.append("token", xToken);
    formData.append("channel", String(channelVal.id));
    formData.append("thumbnail", thumbnail);
    formData.append("type", "stream");
    formData.append(
      "stream",
      `https://amediaingest.ceflix.org:5443/WebRTCAppEE/streams/${stream_id}.m3u8`,
    );
    formData.append("endDate", String(Math.floor(endDate.getTime() / 1000)));

    setBusy(true);
    setProgress(0);

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    xhr.open("POST", `${API_BASE}video/upload`, true);
    xhr.setRequestHeader("Application-Key", APP_KEY);
    if (xToken) xhr.setRequestHeader("X-TOKEN", xToken);

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      setProgress((evt.loaded / evt.total) * 100);
    };

    xhr.onreadystatechange = async () => {
      if (xhr.readyState !== 4) return;
      setBusy(false);

      try {
        const resp = JSON.parse(xhr.responseText || "{}");
        const vid =
          resp?.data?.data?.video_id ??
          resp?.data?.video_id ??
          resp?.video_id ??
          null;

        if (resp?.status && vid) {
          const id = String(vid);
          setVideoID(id);
          setShareLink(`https://ceflix.org/videos/watch/${id}`);
          await updateStreamVideoId(stream_id, id);
        } else {
          setError(true);
          setErrorM(resp?.message || "Upload failed. Please try again.");
        }
      } catch {
        setError(true);
        setErrorM("Upload failed. Please try again.");
      }
    };

    xhr.onerror = () => {
      setBusy(false);
      setError(true);
      setErrorM("An error occurred during upload. Please try again.");
    };

    xhr.send(formData);
  }

  async function generateStreamKeyAndGoLive(stream_id: string) {
    setError(false);
    setErrorM("");

    if (!title.trim()) {
      setError(true);
      setErrorM("Kindly enter a title for your stream.");
      return;
    }

    setBusy(true);
    try {
      const res = await lambda("generate_stream_key", {
        email,
        stream_id,
        stream_title: title,
        stream_description: description,
      });

      if (res?.status) {
        setStreamData(res.data ?? {});
        setTitle(res.data?.stream_title ?? title);
        setDescription(res.data?.stream_description ?? description);
        setLive(true);

        uploadStreamVideoThenLinkToStream(stream_id);
      } else {
        setError(true);
        setErrorM(res?.data?.msg || "Unable to generate stream key.");
      }
    } catch {
      setError(true);
      setErrorM("Unable to generate stream key. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteStream(stream_id: string) {
    setBusy(true);
    setError(false);
    setErrorM("");
    try {
      const res = await lambda("delete_stream", { stream_id });
      if (res?.status) refresh();
      else {
        setError(true);
        setErrorM("Error deleting stream");
      }
    } catch {
      setError(true);
      setErrorM("Error deleting stream");
    } finally {
      setBusy(false);
    }
  }

  async function setup() {
    setLoading(true);
    setError(false);
    setErrorM("");

    try {
      if (!xToken) {
        setError(true);
        setErrorM("No token found. Please sign in again.");
        return;
      }

      // Validate + get streamID
      const { res: streamRes, json: streamJson } = await apiPost("user/stream", {
        token: xToken,
      });
      if (!streamRes.ok || !streamJson?.status) {
        setError(true);
        setErrorM(streamJson?.message || "Stream unavailable.");
        return;
      }

      const id = String(streamJson?.data?.streamID || "");
      if (!id) {
        setError(true);
        setErrorM("Stream ID not returned.");
        return;
      }

      setStreamID(id);
      setHlsUrl(
        `https://amediaingest.ceflix.org:5443/WebRTCAppEE/streams/${id}.m3u8`,
      );

      // ✅ Load channels and normalize so dropdown always has label text
      const { json: chJson } = await apiPost(
        "user/channels",
        { token: xToken },
        xToken ? { "X-TOKEN": xToken } : undefined,
      );

      if (chJson?.status && Array.isArray(chJson?.data)) {
        const listRaw = chJson.data as Channel[];

        // normalize: ensure there's always a visible label
        const normalized = listRaw.map((c) => ({
          ...c,
          title: getChannelTitle(c),
        }));

        setChannels(normalized);

        if (normalized.length > 0) {
          setChannelVal(normalized[0]);
        }
      } else {
        setChannels([]);
        setChannelVal(null);
      }

      await initializeStream(id);
    } catch {
      setError(true);
      setErrorM("An error occurred while loading the streaming dashboard.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xToken]);

  const onPickThumbFile = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setThumbnail(String(reader.result || ""));
      setHasChangedThumb(true);
    };
    reader.readAsDataURL(file);
  };

  const iframeSrc = streamID
    ? `https://amediaingest.ceflix.org:5443/WebRTCAppEE/play.html?id=${streamID}&playOrder=hls`
    : "";

  const shareLink2 = streamID ? `https://ceflix.org/live/${streamID}` : "";

  return (
    <main className="min-h-screen bg-neutral-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(191,9,9,0.35),transparent),radial-gradient(50%_50%_at_100%_100%,rgba(239,68,68,0.22),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-transparent via-neutral-950/40 to-neutral-950" />

      <Modal
        open={deleteOpen}
        title="Delete Stream"
        onClose={() => {
          if (busy) return;
          setDeleteOpen(false);
        }}
      >
        <p className="text-sm text-neutral-200">
          Are you sure you want to delete{" "}
          <span className="font-semibold text-white">
            {title || "this stream"}
          </span>
          ?
        </p>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteOpen(false)}
            disabled={busy}
            className="cursor-pointer rounded-full border border-white/10 bg-neutral-800 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-700 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => deleteStream(streamID)}
            disabled={busy || !streamID}
            className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Delete"}
          </button>
        </div>
      </Modal>

      <Modal open={thumbOpen} title="Update Thumbnail" onClose={() => setThumbOpen(false)}>
        <div className="space-y-3">
          <p className="text-xs text-neutral-300">
            Paste an image URL or upload an image file.
          </p>

          <div className="space-y-2">
            <p className="text-xs text-neutral-300">Image URL</p>
            <Input
              value={thumbnail}
              onChange={(e) => {
                setThumbnail(e.target.value);
                setHasChangedThumb(true);
              }}
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
                className="w-full aspect-video object-cover rounded-lg"
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

      <div className="relative z-10 mx-auto max-w-[110rem] px-4 lg:px-6 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight">
              Live Streaming Dashboard
            </h1>
            <p className="text-sm text-neutral-300 mt-1">
              Generate a stream key and send your stream from your software to go live.
            </p>
          </div>

          <button
            type="button"
            onClick={refresh}
            className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-4 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div className="w-full rounded-2xl border border-white/10 bg-neutral-900/50 p-6 animate-pulse">
            <div className="aspect-video rounded-xl bg-black/60" />
            <div className="mt-4 h-5 w-2/5 rounded bg-white/10" />
            <div className="mt-2 h-4 w-3/5 rounded bg-white/10" />
          </div>
        )}

        {!loading && (
          <>
            {busy && (
              <div className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[1px] grid place-items-center">
                <div className="rounded-2xl border border-white/10 bg-neutral-900/80 px-5 py-4 text-sm text-neutral-200 shadow-xl">
                  Working…
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
              <div className="lg:col-span-3 rounded-2xl border border-white/10 bg-neutral-900/50 overflow-hidden">
                <div className="relative aspect-video bg-black">
                  {streamID ? (
                    <iframe
                      src={iframeSrc}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 h-full w-full border-0"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-neutral-400 text-sm">
                      No stream session yet.
                    </div>
                  )}
                </div>

                <div className="px-4 py-4 border-t border-white/10">
                  <div className="flex items-start gap-3 text-sm text-neutral-200">
                    <IconInfo className="h-5 w-5 text-neutral-300 mt-0.5" />
                    <p>
                      Generate your Stream key and start sending us your video from your streaming
                      software to go live.
                    </p>
                  </div>

                  <div className="mt-4">
                    <ProgressBar value={progress} />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
                <div className="flex items-center justify-end gap-3 mb-4">
                  {editingLocked ? (
                    <>
                      {live && (
                        <button
                          type="button"
                          onClick={() => setDeleteOpen(true)}
                          className="cursor-pointer rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-500"
                        >
                          Delete
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingLocked(false)}
                        className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80"
                      >
                        Edit
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingLocked(true);
                        setError(false);
                        setErrorM("");
                        if (videoID) void updateStreamDetails(videoID);
                      }}
                      className="cursor-pointer rounded-full bg-white px-4 py-2 text-xs font-semibold text-black hover:bg-white/80"
                    >
                      Save
                    </button>
                  )}
                </div>

                <div className={editingLocked ? "pointer-events-none opacity-90" : ""}>
                  <div className="space-y-4">
                    <div>
                      <FieldLabel required>Channel</FieldLabel>

                      {/* ✅ FIXED: render proper labels */}
                      <select
                        value={channelVal ? String(channelVal.id) : ""}
                        onChange={(e) => {
                          const found = channels.find(
                            (c) => String(c.id) === e.target.value,
                          );
                          if (found) setChannelVal(found);
                        }}
                        disabled={editingLocked}
                        className={[
                          "w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white",
                          "focus:outline-none focus:ring-2 focus:ring-sky-500",
                          editingLocked ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {channels.map((c) => (
                          <option key={String(c.id)} value={String(c.id)}>
                            {getChannelTitle(c)}
                          </option>
                        ))}
                      </select>

                      {channels.length === 0 && (
                        <p className="mt-2 text-xs text-neutral-400">
                          You don’t have any channels yet.
                        </p>
                      )}
                    </div>

                    <div>
                      <FieldLabel required>Title</FieldLabel>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        disabled={editingLocked}
                        placeholder="Enter a stream title"
                      />
                    </div>

                    <div>
                      <FieldLabel>Description</FieldLabel>
                      <TextArea
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={editingLocked}
                        placeholder="Describe your stream…"
                      />
                    </div>

                    <div>
                      <FieldLabel>Tags</FieldLabel>
                      <Input
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        disabled={editingLocked}
                        placeholder="e.g. faith, worship, teaching"
                      />
                    </div>

                    {!live && (
                      <div>
                        <FieldLabel required>Set stream end time</FieldLabel>
                        <Input
                          type="datetime-local"
                          value={fmtLocalDateTimeInput(endDate)}
                          onChange={(e) => {
                            const d = new Date(e.target.value);
                            if (!isNaN(+d)) setEndDate(d);
                          }}
                          disabled={editingLocked}
                        />
                        <p className="mt-2 text-xs text-neutral-400">
                          End time must be within the next 4 hours.
                        </p>
                      </div>
                    )}

                    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white">Thumbnail</p>
                        <button
                          type="button"
                          onClick={() => setThumbOpen(true)}
                          className="cursor-pointer text-xs font-semibold text-red-400 hover:text-red-300"
                        >
                          Change
                        </button>
                      </div>

                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-6 gap-4 items-center">
                        <button
                          type="button"
                          onClick={() => setThumbOpen(true)}
                          className="sm:col-span-3 relative overflow-hidden rounded-xl border border-white/10 bg-neutral-800/40 aspect-video"
                        >
                          {thumbnail ? (
                            <>
                              <img
                                src={thumbnail}
                                alt="Thumbnail"
                                className="absolute inset-0 h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 bg-black/55 opacity-0 hover:opacity-100 transition grid place-items-center">
                                <IconCamera className="h-10 w-10 text-white/70" />
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-neutral-300 text-sm">
                              Pick a thumbnail
                            </div>
                          )}
                        </button>

                        <div className="sm:col-span-3">
                          <p className="text-xs text-neutral-300">
                            Use a clear 16:9 image. You can paste a URL or upload a file.
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

                    <div>
                      <FieldLabel>Privacy Setting</FieldLabel>
                      <select
                        value={String(privacyVal.id)}
                        onChange={(e) => {
                          const found = PRIVACY_OPTIONS.find(
                            (p) => String(p.id) === e.target.value,
                          );
                          if (found) setPrivacyVal(found);
                        }}
                        disabled={editingLocked}
                        className={[
                          "w-full rounded-md border border-neutral-700/60 bg-neutral-800/60 px-3 py-2 text-sm text-white",
                          "focus:outline-none focus:ring-2 focus:ring-sky-500",
                          editingLocked ? "opacity-60 cursor-not-allowed" : "",
                        ].join(" ")}
                      >
                        {PRIVACY_OPTIONS.map((p) => (
                          <option key={p.id} value={String(p.id)}>
                            {p.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {!live && (
                  <div className="mt-6 flex justify-end">
                    <button
                      type="button"
                      onClick={() => streamID && generateStreamKeyAndGoLive(streamID)}
                      disabled={!streamID || busy}
                      className="cursor-pointer rounded-full bg-red-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Go Live
                    </button>
                  </div>
                )}

                {error && (
                  <p className="mt-4 text-red-400 text-xs font-semibold">{errorM}</p>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-neutral-900/50 p-5">
              <h3 className="text-sm font-semibold text-white mb-4">
                Stream Details
              </h3>

              <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <FieldLabel>Stream URL</FieldLabel>
                    <Input value={streamData.streamURL ?? ""} disabled />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(streamData.streamURL ?? "")}
                    className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-6 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <FieldLabel>Stream key</FieldLabel>
                    <Input value={streamData.stream_key ?? ""} disabled />
                    {streamData.expireDate ? (
                      <p className="mt-2 text-xs font-semibold text-red-400">
                        Valid until: {streamData.expireDate}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(streamData.stream_key ?? "")}
                    className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-6 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <FieldLabel>HLS URL</FieldLabel>
                    <Input value={hlsUrl} disabled />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(hlsUrl)}
                    className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-6 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <FieldLabel>Stream link (share with viewers)</FieldLabel>
                    <Input value={shareLink} disabled />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(shareLink)}
                    className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-6 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                  >
                    Copy
                  </button>
                </div>

                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1">
                    <FieldLabel>Stream link 2 (share with viewers)</FieldLabel>
                    <Input value={shareLink2} disabled />
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(shareLink2)}
                    className="cursor-pointer rounded-full border border-white/10 bg-neutral-900/60 px-6 py-2 text-xs font-semibold text-neutral-200 hover:bg-neutral-800"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}