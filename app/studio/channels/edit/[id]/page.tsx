"use client";

import "cropperjs/dist/cropper.css";

import React, {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
  useRef,
} from "react";
import { useParams } from "next/navigation";
import Cropper, { ReactCropperElement } from "react-cropper";
import { CameraIcon } from "@heroicons/react/20/solid";
import { useAuth } from "@/app/components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type ChannelData = {
  id: number;
  channel: string;
  description: string;
  tags: string;
  cat_id: number;
  url: string; // avatar / picture
  cover: string; // cover image
};

type Category = {
  id: number;
  title: string;
  [key: string]: any;
};

export default function EditChannelPage() {
  const { token } = useAuth();
  const params = useParams() as { id?: string };
  const channelId = params?.id;

  const [loading, setLoading] = useState(true);

  // Channel variables
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryVal, setCategoryVal] = useState<Category | null>(null);

  // Branding
  const [thumbnail, setThumbnail] = useState("");
  const [cover, setCover] = useState("");
  const [thumbFileName, setThumbFileName] = useState("");
  const [coverFileName, setCoverFileName] = useState("");
  const [thumbError, setThumbError] = useState<string | null>(null);
  const [coverError, setCoverError] = useState<string | null>(null);

  // Dirty flags – only send when user presses update buttons
  const [thumbDirty, setThumbDirty] = useState(false);
  const [coverDirty, setCoverDirty] = useState(false);

  // Cropping state (thumbnail)
  const [showThumbCropper, setShowThumbCropper] = useState(false);
  const [rawThumbImage, setRawThumbImage] = useState("");
  const thumbCropperRef = useRef<ReactCropperElement | null>(null);

  // Cropping state (cover)
  const [showCoverCropper, setShowCoverCropper] = useState(false);
  const [rawCoverImage, setRawCoverImage] = useState("");
  const coverCropperRef = useRef<ReactCropperElement | null>(null);

  // File input refs (so clicking the image opens file picker)
  const thumbInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Misc
  const [progress, setProgress] = useState(0);
  const [updated, setUpdated] = useState(false);
  const [error, setError] = useState(false);
  const [channelData, setChannelData] = useState<ChannelData | null>(null);
  const [processing, setProcessing] = useState(false);
  const [brandingSaving, setBrandingSaving] = useState(false);

  // -------------------------
  // Helpers
  // -------------------------
  const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB

  const readFileAsDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject(new Error("Unable to read file"));
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  // -------------------------
  // Thumbnail / Cover API
  // -------------------------
  async function updateThumbnail(img: string) {
    if (!token || !channelId || !img) return;

    try {
      setBrandingSaving(true);
      await fetch(API_BASE + "channel/thumb/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          channel_id: channelId,
          image: img,
          token,
        }),
      });
      setThumbDirty(false);
    } catch (err) {
      console.error("Failed to update thumbnail", err);
    } finally {
      setBrandingSaving(false);
    }
  }

  async function updateCover(img: string) {
    if (!token || !channelId || !img) return;

    try {
      setBrandingSaving(true);
      await fetch(API_BASE + "channel/cover/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          channel_id: channelId,
          image: img,
          token,
        }),
      });
      setCoverDirty(false);
    } catch (err) {
      console.error("Failed to update cover image", err);
    } finally {
      setBrandingSaving(false);
    }
  }

  const handleThumbnailUpdateClick = () => {
    if (!thumbnail || !thumbDirty) return;
    void updateThumbnail(thumbnail);
  };

  const handleCoverUpdateClick = () => {
    if (!cover || !coverDirty) return;
    void updateCover(cover);
  };

  // -------------------------
  // File selection + cropping
  // -------------------------
  const handleThumbFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setThumbError("Image must be 2MB or less.");
      return;
    }

    setThumbError(null);
    setThumbFileName(file.name);

    try {
      const dataUrl = await readFileAsDataURL(file);
      setRawThumbImage(dataUrl);
      setShowThumbCropper(true);
    } catch {
      setThumbError("Unable to load image.");
    }
  };

  const handleCoverFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_SIZE) {
      setCoverError("Image must be 2MB or less.");
      return;
    }

    setCoverError(null);
    setCoverFileName(file.name);

    try {
      const dataUrl = await readFileAsDataURL(file);
      setRawCoverImage(dataUrl);
      setShowCoverCropper(true);
    } catch {
      setCoverError("Unable to load image.");
    }
  };

  const applyThumbCrop = () => {
    const cropper = thumbCropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: 400,
      height: 400,
      imageSmoothingEnabled: true,
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setThumbnail(dataUrl);
    setThumbDirty(true); // mark as needing update
    setShowThumbCropper(false);
    setRawThumbImage("");
  };

  const applyCoverCrop = () => {
    const cropper = coverCropperRef.current?.cropper;
    if (!cropper) return;

    const canvas = cropper.getCroppedCanvas({
      width: 1500,
      height: 400,
      imageSmoothingEnabled: true,
    });

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCover(dataUrl);
    setCoverDirty(true); // mark as needing update
    setShowCoverCropper(false);
    setRawCoverImage("");
  };

  // -------------------------
  // API calls
  // -------------------------
  async function getChannel() {
    if (!token || !channelId) return;

    setLoading(true);
    setError(false);

    try {
      // Channel details
      const req = await fetch(API_BASE + "userchannel", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({ channel: channelId, token }),
      });
      const channelRes = await req.json();

      // Categories
      const req2 = await fetch(API_BASE + "channelcategories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
      });
      const categoriesRes = await req2.json();

      if (channelRes.status && categoriesRes.status) {
        const ch: ChannelData = channelRes.data;
        const cats: Category[] = categoriesRes.data || [];

        setChannelData(ch);
        setCategories(cats);
        setName(ch.channel || "");
        setDescription(ch.description || "");
        setTags(ch.tags || "");
        setThumbnail(ch.url || "");
        setCover(ch.cover || "");
        setThumbDirty(false);
        setCoverDirty(false);

        const selected = cats.find((c) => c.id === ch.cat_id) || null;
        setCategoryVal(selected);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error("Failed to load channel", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !channelData || !categoryVal) return;

    setProgress(0);
    setUpdated(false);
    setError(false);
    setProcessing(true);

    try {
      const formData = new FormData();
      formData.append("channel_title", name);
      formData.append("channel_id", String(channelData.id));
      formData.append("description", description);
      formData.append("tags", tags || "");
      formData.append("category", String(categoryVal.id));
      formData.append("token", token);

      const req = await fetch(API_BASE + "channel/update", {
        method: "POST",
        headers: {
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: formData,
      });

      // Simple progress simulation
      setProgress(50);

      const res = await req.json();
      if (!res.status) {
        setError(true);
        setProgress(0);
      } else {
        setProgress(100);
        setUpdated(true);
      }
    } catch (err) {
      console.error("Failed to update channel", err);
      setError(true);
      setProgress(0);
    } finally {
      setProcessing(false);
    }
  }

  // -------------------------
  // Effects
  // -------------------------
  useEffect(() => {
    if (token && channelId) {
      getChannel();
    }
  }, [token, channelId]);

  // -------------------------
  // Guards
  // -------------------------
  if (!token) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 pt-24 pb-10">
          <h1 className="text-2xl font-semibold mb-2">Channel customization</h1>
          <p className="text-sm text-neutral-400">
            You need to be signed in to edit your channel.
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
            <div className="h-7 w-48 bg-neutral-800 rounded" />
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
      <div className="mx-auto px-4 sm:px-8 max-w-5xl pt-10">
        <h1 className="text-2xl text-white font-semibold mb-6">
          Channel customization
        </h1>

        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            Something went wrong updating your channel. Please try again.
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Info */}
          <form
            onSubmit={handleSubmit}
            className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-5"
          >
            <h2 className="text-sm font-semibold">Basic information</h2>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-1 focus:ring-red-600"
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
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-1 focus:ring-red-600"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Channel Category
              </label>
              <select
                value={categoryVal ? String(categoryVal.id) : ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  const cat = categories.find((c) => c.id === id) || null;
                  setCategoryVal(cat);
                }}
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-1 focus:ring-red-600"
              >
                <option value="" disabled>
                  Select a category
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Channel Tags{" "}
                <span className="text-[11px] text-neutral-400">
                  (comma separated)
                </span>
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-3 py-2 text-sm text-white shadow-sm outline-none focus:ring-1 focus:ring-red-600"
                placeholder="e.g. ministry, music, youth"
              />
            </div>

            {/* Actions */}
            <div className="mt-3 flex items-center gap-3 flex-wrap">
              <button
                type="submit"
                disabled={processing}
                className={`rounded-md px-4 py-2 text-sm font-semibold shadow-sm ${
                  processing
                    ? "bg-white text-black cursor-not-allowed"
                    : "bg-white hover:bg-white/80 text-black cursor-pointer"
                }`}
              >
                {processing ? "Updating…" : "Update"}
              </button>

              {progress > 0 && (
                <div className="flex items-center gap-2 w-full max-w-xs">
                  <div className="flex-1 h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                    <div
                      className="h-1.5 bg-red-600 transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-neutral-200 whitespace-nowrap">
                    {progress}%
                  </span>
                </div>
              )}

              {updated && (
                <p className="text-xs text-emerald-400 whitespace-nowrap">
                  Profile updated
                </p>
              )}

              {brandingSaving && (
                <p className="text-xs text-neutral-400 whitespace-nowrap">
                  Saving images…
                </p>
              )}
            </div>
          </form>

          {/* Picture */}
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold">Picture</h2>
            <p className="text-xs text-neutral-400 max-w-xl">
              Your profile picture will appear where your channel is presented
              on Ceflix, like next to your videos and comments.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex flex-col items-center sm:items-start gap-3">
                <div
                  className="group relative h-40 w-40 rounded-full overflow-hidden bg-neutral-800 cursor-pointer"
                  onClick={() => thumbInputRef.current?.click()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnail || "https://ceflix.org/images/avatar.png"}
                    alt="Channel picture"
                    className="w-full h-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-row justify-center items-center transition bg-neutral-900/80 opacity-0 group-hover:opacity-100">
                    <CameraIcon
                      className="h-10 w-10 text-white/70"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-400">
                  Recommended: at least 98 × 98px, JPG or PNG, 2MB or less.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 text-sm text-neutral-300">
                <p>
                  Make sure your picture follows the Ceflix Community
                  Guidelines.
                </p>

                <input
                  ref={thumbInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleThumbFileSelect}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => thumbInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 bg-neutral-950 rounded-md border border-neutral-700 cursor-pointer text-sm font-semibold hover:bg-neutral-900"
                  >
                    Change
                    {thumbFileName && (
                      <span className="ml-3 text-xs text-neutral-300 truncate max-w-[180px]">
                        {thumbFileName}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleThumbnailUpdateClick}
                    disabled={!thumbDirty || !thumbnail || brandingSaving}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-semibold shadow-sm ${
                      !thumbDirty || !thumbnail || brandingSaving
                        ? "bg-neutral-700 text-neutral-300 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/80 cursor-pointer"
                    }`}
                  >
                    Update picture
                  </button>
                </div>

                {thumbDirty && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    You have unsaved changes to your picture.
                  </p>
                )}

                {thumbError && (
                  <p className="mt-1 text-xs text-red-400">{thumbError}</p>
                )}
              </div>
            </div>

            {showThumbCropper && rawThumbImage && (
              <div className="mt-4">
                <p className="text-xs text-neutral-400 mb-2">
                  Adjust your profile picture (1:1).
                </p>
                <div className="w-full max-w-sm border border-neutral-700 rounded-md overflow-hidden bg-neutral-950">
                  <Cropper
                    ref={thumbCropperRef}
                    style={{ width: "100%", height: 260 }}
                    src={rawThumbImage}
                    aspectRatio={1}
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
                    onClick={applyThumbCrop}
                    className="px-3 py-1.5 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold cursor-pointer"
                  >
                    Apply crop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowThumbCropper(false);
                      setRawThumbImage("");
                    }}
                    className="px-3 py-1.5 rounded-full border border-neutral-700 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Cover Image */}
          <section className="rounded-xl bg-neutral-900 border border-neutral-800 p-5 space-y-4">
            <h2 className="text-sm font-semibold">Cover image</h2>
            <p className="text-xs text-neutral-400 max-w-xl">
              This image appears across the top of your channel.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div className="flex flex-col justify-center items-center sm:items-start gap-3">
                <div
                  className="group relative w-full max-w-xl h-32 rounded-md overflow-hidden bg-neutral-800 cursor-pointer"
                  onClick={() => coverInputRef.current?.click()}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={cover || "https://ceflix.org/images/fallback.png"}
                    alt="Channel cover"
                    className="w-full h-full object-cover"
                  />
                  <div className="pointer-events-none absolute inset-0 flex flex-row justify-center items-center transition bg-neutral-900/80 opacity-0 group-hover:opacity-100">
                    <CameraIcon
                      className="h-10 w-10 text-white/70"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <p className="text-xs text-neutral-400">
                  Recommended: at least 1500 × 400px, JPG or PNG, 2MB or less.
                </p>
              </div>

              <div className="flex flex-col items-start gap-3 text-sm text-neutral-300">
                <p>For the best results on all devices, use a wide image.</p>

                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleCoverFileSelect}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center px-3 py-2 bg-neutral-950 rounded-md border border-neutral-700 cursor-pointer text-sm font-semibold hover:bg-neutral-900"
                  >
                    Change
                    {coverFileName && (
                      <span className="ml-3 text-xs text-neutral-300 truncate max-w-[180px]">
                        {coverFileName}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleCoverUpdateClick}
                    disabled={!coverDirty || !cover || brandingSaving}
                    className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-semibold shadow-sm ${
                      !coverDirty || !cover || brandingSaving
                        ? "bg-neutral-700 text-neutral-300 cursor-not-allowed"
                        : "bg-white text-black hover:bg-white/80 cursor-pointer"
                    }`}
                  >
                    Update cover
                  </button>
                </div>

                {coverDirty && (
                  <p className="text-[11px] text-amber-300 mt-1">
                    You have unsaved changes to your cover image.
                  </p>
                )}

                {coverError && (
                  <p className="mt-1 text-xs text-red-400">{coverError}</p>
                )}
              </div>
            </div>

            {showCoverCropper && rawCoverImage && (
              <div className="mt-4">
                <p className="text-xs text-neutral-400 mb-2">
                  Adjust your cover image (wide).
                </p>
                <div className="w-full max-w-xl border border-neutral-700 rounded-md overflow-hidden bg-neutral-950">
                  <Cropper
                    ref={coverCropperRef}
                    style={{ width: "100%", height: 260 }}
                    src={rawCoverImage}
                    aspectRatio={15 / 4} // ~1500x400 ratio
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
                    onClick={applyCoverCrop}
                    className="px-3 py-1.5 rounded-full bg-red-700 hover:bg-red-600 text-xs font-semibold cursor-pointer"
                  >
                    Apply crop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCoverCropper(false);
                      setRawCoverImage("");
                    }}
                    className="px-3 py-1.5 rounded-full border border-neutral-700 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
