"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type Stats = {
  channels: number;
  videos: number;
  video_views: number;
  subscribers: number;
  playlists: number;
  likedVideos: number;
};

type Video = {
  id: number;
  channel_id: number;
  videos_title: string;
  slug: string;
  thumbnail: string;
  numOfViews: number;
  isLive: string;
  isPublic: string;
  created_at: string;
};

export default function DashboardPage() {
  const { token } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<Stats | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  // delete modal state
  const [confirmVideo, setConfirmVideo] = useState<Video | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ----------------------------
  // Load stats + videos
  // ----------------------------
  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        setLoading(true);

        // Fetch stats
        const statReq = await fetch(API_BASE + "accountstat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify({ token }),
        });

        const statRes = await statReq.json();
        if (statRes?.status) {
          setStats(statRes.data);
        }

        // Fetch videos
        const vidReq = await fetch(API_BASE + "user/videos", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify({ token }),
        });

        const vidRes = await vidReq.json();
        if (vidRes?.status) {
          setVideos(vidRes.data || []);
        }
      } catch (err) {
        console.error("Failed to load dashboard:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  // ----------------------------
  // Delete API (uses video.id + video.channel_id)
  // ----------------------------
  const deleteVideo = async (video: Video) => {
    if (!token) {
      alert("You must be logged in to delete a video.");
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}video/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Application-Key": APP_KEY,
          "X-TOKEN": token,
        },
        body: JSON.stringify({
          channel_id: video.channel_id,
          video: video.id,
          token,
        }),
      });

      const json = await res.json().catch(() => null);

      if (res.ok && json?.status) {
        setVideos((prev) => prev.filter((v) => v.id !== video.id));
        return true;
      }

      console.error("Delete API failed:", json);
      return false;
    } catch (err) {
      console.error("Error calling delete API:", err);
      return false;
    }
  };

  const openDeleteModal = (video: Video) => {
    setConfirmVideo(video);
  };

  const handleConfirmDelete = async () => {
    if (!confirmVideo) return;
    setDeleting(true);
    const ok = await deleteVideo(confirmVideo);
    setDeleting(false);
    if (!ok) {
      alert("Failed to delete video. Please try again.");
    }
    setConfirmVideo(null);
  };

  const handleCancelDelete = () => {
    if (deleting) return;
    setConfirmVideo(null);
  };

  const viewSlug = (video: Video) =>
    `/videos/watch/${video.id}/${video.videos_title
      .replace(/[\s+-]/g, "-")
      .toLowerCase()}`;

  // ----------------------------
  // UI
  // ----------------------------
  if (loading) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white p-6">
        <div className="animate-pulse space-y-4 max-w-6xl mx-auto">
          <div className="h-8 bg-neutral-800 rounded w-40" />
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-20 bg-neutral-800 rounded" />
            ))}
          </div>
          <div className="h-64 bg-neutral-900 rounded" />
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-2xl font-extrabold">Studio Dashboard</h1>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <StatCard title="Channels" value={stats.channels} />
            <StatCard title="Videos" value={stats.videos} />
            <StatCard title="Views" value={stats.video_views} />
            <StatCard title="Subscribers" value={stats.subscribers} />
          </div>
        )}

        {/* Videos - mobile cards */}
        <div className="space-y-3 sm:hidden">
          {videos.length === 0 && (
            <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
              No videos found
            </div>
          )}

          {videos.map((video) => (
            <div
              key={video.id}
              className="grid grid-cols-1 rounded-lg border border-neutral-800 bg-neutral-900 p-3 flex gap-3"
            >
              <div className="w-full flex-shrink-0">
                <div className="w-full aspect-video bg-neutral-800 rounded overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.thumbnail}
                    alt={video.videos_title}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold line-clamp-2">
                    {video.videos_title}
                  </p>
                  <p className="text-sm text-neutral-400 mt-1">
                    {video.numOfViews} views •{" "}
                    {video.isLive === "1" ? "Live" : "Video"} •{" "}
                    {video.isPublic === "1" ? "Public" : "Private"}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {new Date(video.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <button
                    onClick={() => router.push(viewSlug(video))}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer"
                  >
                    View
                  </button>
                  <button
                    onClick={() => router.push(`/studio/videos/edit/${video.id}/${video.channel_id}`)}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openDeleteModal(video)}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Videos Table - desktop / tablet */}
        <div className="hidden sm:block overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900">
          <table className="w-full text-sm">
            <thead className="bg-neutral-800 text-neutral-300">
              <tr>
                <th className="text-left p-3">Thumbnail</th>
                <th className="text-left p-3">Title</th>
                <th className="text-left p-3">Views</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Created</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {videos.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-4 text-center text-neutral-400"
                  >
                    No videos found
                  </td>
                </tr>
              )}

              {videos.map((video) => (
                <tr
                  key={video.id}
                  className="border-t border-neutral-800 hover:bg-neutral-800/60"
                >
                  <td className="p-3 align-middle">
                    <div className="w-32 aspect-video bg-neutral-800 rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.videos_title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>

                  <td className="p-3 font-medium align-middle">
                    {video.videos_title}
                  </td>

                  <td className="p-3 text-neutral-300 align-middle">
                    {video.numOfViews}
                  </td>

                  <td className="p-3 text-neutral-300 align-middle">
                    {video.isLive === "1" ? "Live" : "Video"} •{" "}
                    {video.isPublic === "1" ? "Public" : "Private"}
                  </td>

                  <td className="p-3 text-neutral-400 align-middle">
                    {new Date(video.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-3 align-middle">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => router.push(viewSlug(video))}
                        className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer"
                      >
                        View
                      </button>

                      <button
                        onClick={() =>
                          router.push(`/studio/videos/edit/${video.id}/${video.channel_id}`)
                        }
                        className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => openDeleteModal(video)}
                        className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {confirmVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="mx-4 w-full max-w-md rounded-2xl bg-neutral-900 border border-neutral-700 p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Delete video?</h2>
            <p className="mt-2 text-sm text-neutral-300">
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                "{confirmVideo.videos_title}"
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="inline-flex items-center px-4 py-2 rounded-full bg-white text-black hover:bg-white/80 text-sm font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

// --------------------------------
// Small stat card component
// --------------------------------
function StatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <p className="text-xs text-neutral-400 uppercase tracking-wide">
        {title}
      </p>
      <p className="text-xl font-bold mt-1">{value}</p>
    </div>
  );
}
