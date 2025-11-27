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
  // Delete video (UI only – hook API here if you have it)
  // ----------------------------
  const handleDelete = (id: number) => {
    if (!confirm("Delete this video?")) return;
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

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
                    {video.isLive === "1" ? "Live" : "Recorded"} •{" "}
                    {video.isPublic === "0" ? "Public" : "Private"}
                  </p>
                  <p className="text-sm text-neutral-500 mt-1">
                    {new Date(video.created_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 mt-1">
                  <button
                    onClick={() => router.push(`/videos/watch/${video.id}/${video.slug}`)}
                    className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm font-semibold"
                  >
                    View
                  </button>
                  <button
                    onClick={() =>
                      router.push(`/studio/edit-video/${video.id}`)
                    }
                    className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-sm font-semibold"
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
                  <td className="p-3">
                    <div className="w-32 aspect-video bg-neutral-800 rounded overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.thumbnail}
                        alt={video.videos_title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </td>

                  <td className="p-3 font-medium">
                    {video.videos_title}
                  </td>

                  <td className="p-3 text-neutral-300">
                    {video.numOfViews}
                  </td>

                  <td className="p-3 text-neutral-300">
                    {video.isLive === "1" ? "Live" : "Recorded"} •{" "}
                    {video.isPublic === "0" ? "Public" : "Private"}
                  </td>

                  <td className="p-3 text-neutral-400">
                    {new Date(video.created_at).toLocaleDateString()}
                  </td>

                  <td className="p-3 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        router.push(`/videos/watch/${video.id}/${video.slug}`)
                      }
                      className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-xs font-semibold"
                    >
                      View
                    </button>

                    <button
                      onClick={() =>
                        router.push(
                          `/studio/edit-video/${video.id}`
                        )
                      }
                      className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 text-xs font-semibold"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDelete(video.id)}
                      className="px-3 py-1 rounded bg-red-700 hover:bg-red-600 text-xs font-semibold"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
