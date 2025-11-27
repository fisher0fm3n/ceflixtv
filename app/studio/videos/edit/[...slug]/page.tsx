"use client";

import "cropperjs/dist/cropper.css";

import React, {
  useEffect,
  useState,
  useRef,
  ChangeEvent,
} from "react";
import { useRouter, useParams } from "next/navigation";
import Cropper, { ReactCropperElement } from "react-cropper";
import {
  CameraIcon,
  InformationCircleIcon,
  TrashIcon,
} from "@heroicons/react/20/solid";
import { useAuth } from "@/app/components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

const privacyTypes2 = [
  {
    id: 0,
    title: "public",
    description: "Anyone can search for and view",
    current: true,
  },
  {
    id: 1,
    title: "private",
    description: "Only you can view",
    current: false,
  },
];

type Language = {
  id: number;
  translation: string;
  url: string;
};

type VideoData = {
  id: number;
  channel_id: number;
  videos_title: string;
  description: string;
  tags: string | null;
  thumbnail: string;
  isLive: string; // "0" | "1"
  active: number; // 0/1
};

export default function EditVideoPage() {
  const { token } = useAuth();
  const router = useRouter();

  // Folder: app/studio/videos/edit/[...slug]/page.tsx
  // URL: /studio/videos/edit/1888742/3137  -> slug = ["1888742","3137"]
  const params = useParams() as { slug?: string[] };
  const slug = params?.slug;
  const videoId = Array.isArray(slug) ? slug[0] : undefined;
  const channelId = Array.isArray(slug) ? slug[1] : undefined;

  const [loading, setLoading] = useState(true);

  // Channel / video fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacy, setPrivacy] = useState<string | undefined>();
  const [privacyVal, setPrivacyVal] = useState<(typeof privacyTypes2)[number]>(
    privacyTypes2[0]
  );

  const [videoData, setVideoData] = useState<VideoData | null>(null);

  // Thumbnail
  const [thumbnail, setThumbnail] = useState("");
  const [thumbFileName, setThumbFileName] = useState("");
  const [thumbDirty, setThumbDirty] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [rawThumbImage, setRawThumbImage] = useState("");
  const cropperRef = useRef<ReactCropperElement | null>(null);

  // Live / languages
  const [languages, setLanguages] = useState<Language[]>([]);
  const [isLive, setIsLive] = useState<"0" | "1">("0");
  const [addLangOpen, setAddLangOpen] = useState(false);
  const [streamUrl, setStreamUrl] = useState("");
  const [translation, setTranslation] = useState("");

  // Delete language modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [delName, setDelName] = useState("");
  const [delLanguageId, setDelLanguageId] = useState<number | null>(null);

  // Misc status
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [error, setError] = useState(false);

  // -----------------------------
  // Thumbnail handlers
  // -----------------------------
  const handleThumbFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setThumbFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setRawThumbImage(reader.result);
        setShowCropper(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const applyCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: 1280,
      height: 720,
      imageSmoothingEnabled: true,
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setThumbnail(dataUrl);
    setThumbDirty(true);
    setShowCropper(false);
  };

  // -----------------------------
  // API calls
  // -----------------------------
  async function updateThumbnail() {
    if (!token || !videoId || !thumbDirty || !thumbnail) return;

    await fetch(API_BASE + "video/thumbnail/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Application-Key": APP_KEY,
        "X-TOKEN": token,
      },
      body: JSON.stringify({
        video: videoId,
        channel: channelId,
        thumbnail,
        token,
      }),
    });
  }

  async function addLanguage() {
    if (!token || !videoId || !streamUrl || !translation) return;

    setProcessing(true);
    try {
      const req = await fetch(API_BASE + "user/video/language/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          stream_url: streamUrl,
          translation,
          video: videoId,
          token,
        }),
      });

      const res = await req.json();

      if (res.status && res.data) {
        setLanguages((prev) => [...prev, res.data as Language]);
        setStreamUrl("");
        setTranslation("");
        setAddLangOpen(false);
      }
    } catch {
      // optional error handling
    } finally {
      setProcessing(false);
    }
  }

  async function deleteLanguage(languageId: number) {
    if (!token || !videoId) return;

    setProcessing(true);
    try {
      await fetch(API_BASE + "user/video/language/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          language: languageId,
          video: videoId,
          token,
        }),
      });

      setLanguages((prev) => prev.filter((l) => l.id !== languageId));
    } catch {
      // optional error handling
    } finally {
      setProcessing(false);
    }
  }

  async function updateVideo() {
    if (!token || !videoId || !channelId) return;

    setProcessing(true);
    setError(false);

    try {
      const req = await fetch(API_BASE + "video/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          channel: channelId,
          description,
          privacy: privacyVal.id,
          tags,
          video_id: videoId,
          video_title: name,
          token,
        }),
      });

      const res = await req.json();

      if (!res.status) {
        setError(true);
      } else {
        setError(false);
        if (thumbDirty) {
          await updateThumbnail();
        }
        setProcessed(true);
        // setTimeout(() => {
        //   setProcessed(false);
        //   router.push("/studio");
        // }, 1500);
      }
    } catch {
      setError(true);
    } finally {
      setProcessing(false);
    }
  }

  async function getVideo() {
    if (!token || !videoId) return;

    setLoading(true);
    setError(false);
    try {
      const req = await fetch(API_BASE + "video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ video: videoId, token, channel: channelId }),
      });

      const res = await req.json();

      if (!res.status || !res.data?.video) {
        setError(true);
        return;
      }

      const v: VideoData = res.data.video;
      setVideoData(v);
      setIsLive(v.isLive as "0" | "1");
      setLanguages(res.data.languages || []);
      setName(v.videos_title || "");
      setThumbnail(v.thumbnail || "");
      setDescription(v.description || "");
      setTags(v.tags || "");

      const privIdx = v.active === 0 ? 1 : 0;
      const priv = privacyTypes2[privIdx] || privacyTypes2[0];
      setPrivacy(priv.title);
      setPrivacyVal(priv);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  // -----------------------------
  // Effects
  // -----------------------------
  useEffect(() => {
    if (token && videoId) {
      getVideo();
    }
  }, [token, videoId]);

  if (!token) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-2xl font-semibold mb-2">Edit Video</h1>
          <p className="text-sm text-neutral-400">
            You need to be signed in to edit videos.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-16 pb-10">
          <div className="space-y-6 animate-pulse">
            <div className="h-7 w-40 bg-neutral-800 rounded" />
            <div className="h-10 w-full bg-neutral-800 rounded" />
            <div className="h-32 w-full bg-neutral-900 rounded" />
            <div className="h-40 w-full bg-neutral-900 rounded" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white pb-10">
      {/* Delete language modal */}
      {deleteOpen && delLanguageId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-xl bg-neutral-900 border border-neutral-700 p-5">
            <h2 className="text-lg font-semibold mb-2">Delete language</h2>
            <p className="text-sm text-neutral-300 mb-4">
              Are you sure you want to remove{" "}
              <span className="font-semibold">{delName}</span> from this video?
            </p>
            <div className="flex justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="px-3 py-1.5 rounded-full border border-neutral-700 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteLanguage(delLanguageId);
                  setDeleteOpen(false);
                }}
                className="px-3 py-1.5 rounded-full bg-red-700 hover:bg-red-600 font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-8 pt-10">
        <h1 className="text-2xl font-semibold mb-6">Edit Video</h1>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Something went wrong updating your video. Please try again.
          </div>
        )}

        <div className="space-y-8">
          {/* Basics */}
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-5">
            <div className="grid grid-cols-1 gap-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Video Tags{" "}
                  <span className="text-[11px] text-neutral-400">
                    (comma separated)
                  </span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600"
                  placeholder="e.g. faith, worship, inspiration"
                />
              </div>

              {/* Privacy */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Privacy Setting
                </label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {privacyTypes2.map((p) => {
                    const active = privacyVal.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setPrivacy(p.title);
                          setPrivacyVal(p);
                        }}
                        className={`cursor-pointer px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border ${
                          active
                            ? "bg-white text-black border-white"
                            : "bg-neutral-900 text-neutral-200 border-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        {p.title === "public" ? "Public" : "Private"}
                      </button>
                    );
                  })}
                </div>
                {privacy && (
                  <p className="mt-2 text-xs text-neutral-400">
                    {privacyVal.description}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Thumbnail */}
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold">Thumbnail</h2>
            <p className="text-xs text-neutral-400 max-w-xl">
              Select or upload a picture that shows what's in your video. A good
              thumbnail stands out and draws viewers' attention.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              {/* Current thumbnail */}
              <div className="flex flex-col items-center sm:items-start gap-2">
                <div className="relative w-64 max-w-full aspect-video rounded-lg overflow-hidden bg-neutral-800">
                  {thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbnail}
                      alt="Thumbnail"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                      No thumbnail
                    </div>
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-neutral-900/50 opacity-0 hover:opacity-100 transition">
                    <CameraIcon className="h-8 w-8 text-white/80" />
                  </div>
                </div>

                <p className="text-xs text-neutral-400">
                  Recommended: 1280 × 720 (16:9), JPG or PNG.
                </p>
              </div>

              {/* Upload + cropper trigger */}
              <div className="flex flex-col items-start gap-3 text-sm">
                <label className="inline-flex items-center px-3 py-2 bg-neutral-950 rounded-md border border-neutral-700 cursor-pointer font-semibold hover:bg-neutral-900">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleThumbFileChange}
                  />
                  Change thumbnail
                  {thumbFileName && (
                    <span className="ml-3 text-xs text-neutral-300 truncate max-w-[160px]">
                      {thumbFileName}
                    </span>
                  )}
                </label>

                {showCropper && rawThumbImage && (
                  <div className="mt-3 w-full">
                    <p className="text-xs text-neutral-400 mb-2">
                      Adjust your thumbnail (16:9).
                    </p>
                    <div className="w-full max-w-md border border-neutral-700 rounded-md overflow-hidden bg-neutral-950">
                      <Cropper
                        ref={cropperRef}
                        style={{ width: "100%", height: 260 }}
                        src={rawThumbImage}
                        aspectRatio={16 / 9}
                        viewMode={1}
                        background={false}
                        guides
                        zoomable
                        movable
                        responsive
                        dragMode="move"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={applyCrop}
                        className="px-3 py-1.5 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold"
                      >
                        Apply crop
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCropper(false)}
                        className="px-3 py-1.5 rounded-full border border-neutral-700 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Live languages */}
          {isLive === "1" && (
            <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold">Available Languages</h2>
                <button
                  type="button"
                  onClick={() => setAddLangOpen((v) => !v)}
                  className="px-3 py-1.5 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold"
                >
                  {addLangOpen ? "Close" : "Add"} language
                </button>
              </div>

              {addLangOpen && (
                <div className="border border-neutral-800 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Translation
                      </label>
                      <input
                        type="text"
                        value={translation}
                        onChange={(e) => setTranslation(e.target.value)}
                        placeholder="e.g. German"
                        className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Stream link
                      </label>
                      <input
                        type="text"
                        value={streamUrl}
                        onChange={(e) => setStreamUrl(e.target.value)}
                        placeholder="Enter .m3u8 link"
                        className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-600"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={addLanguage}
                      disabled={processing}
                      className={`px-4 py-1.5 rounded-full text-xs font-semibold ${
                        processing
                          ? "bg-red-900 text-neutral-300 cursor-not-allowed"
                          : "bg-red-700 hover:bg-red-600 text-white"
                      }`}
                    >
                      {processing ? "Adding…" : "Add Language"}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {languages.map((item) => (
                  <div
                    key={item.id}
                    className="relative flex flex-row"
                  >
                    <div className="text-white bg-neutral-800 border border-neutral-700 p-3 rounded-lg w-full">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold">
                          {item.translation}
                        </h3>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteOpen(true);
                            setDelLanguageId(item.id);
                            setDelName(item.translation);
                          }}
                        >
                          <TrashIcon className="h-5 w-5 text-red-500 hover:text-red-400" />
                        </button>
                      </div>
                      <p className="text-xs text-neutral-200 break-words">
                        {item.url}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <p className="flex items-center text-xs text-neutral-400 mt-2">
                <InformationCircleIcon className="h-4 w-4 mr-1" />
                Please add a language by clicking the “Add language” button.
              </p>
            </section>
          )}

          {/* Actions */}
          <section className="flex items-center gap-3 mt-2">
            <button
              type="button"
              onClick={updateVideo}
              disabled={processing}
              className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm ${
                processing
                  ? "bg-white text-black cursor-not-allowed"
                  : "bg-white hover:bg-white/80 text-black cursor-pointer"
              }`}
            >
              {processing ? "Updating…" : "Update"}
            </button>

            {processed && (
              <p className="text-xs text-emerald-400">
                Your video has now been updated.
              </p>
            )}

            {processing && (
              <div className="h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
