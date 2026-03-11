"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";
const FALLBACK_THUMB = "https://ceflix.org/images/placeholder.png";

type ShortItem = {
  id: number;
  videos_title: string;
  thumbnail: string | null;
  numOfViews: number | string;
  channel_id: number;
  channel?: {
    id: number;
    channel: string;
    url: string | null;
  } | null;
};

function ShortsLogo() {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-xl font-extrabold tracking-tight text-white">
        CeClips
      </h2>
    </div>
  );
}

function ShortCard({ item }: { item: ShortItem }) {
  return (
    <Link href={`/ceclips/${item.id}`} className="group block min-w-0">
      <div className="overflow-hidden rounded-lg">
        <div className="relative aspect-[9/16] w-full">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.thumbnail || FALLBACK_THUMB}
            alt={item.videos_title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            loading="lazy"
          />
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-md font-semibold leading-[1.2] text-white">
            {item.videos_title}
          </h3>
        </div>

        {/* <button
          type="button"
          className="mt-1 shrink-0 rounded-full p-1 text-white/90 hover:bg-white/10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          aria-label="More options"
        >
          <EllipsisVerticalIcon className="h-6 w-6" />
        </button> */}
      </div>
    </Link>
  );
}

export default function ShortsShelf() {
  const [items, setItems] = useState<ShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadShorts = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(API_BASE + "video/shorts/items", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
          },
          body: JSON.stringify({
            limit: 5,
          }),
        });

        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const json = await res.json();
        const data = Array.isArray(json?.data) ? json.data : [];

        if (!cancelled) {
          setItems(data);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to load shorts:", err);
          setError("Failed to load shorts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadShorts();

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleItems = useMemo(() => {
    return isMobile ? items.slice(0, 4) : items;
  }, [items, isMobile]);

  const content = useMemo(() => {
    if (loading) {
      const skeletonCount = isMobile ? 4 : 5;

      return (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i} className="min-w-0">
              <div className="aspect-[9/16] w-full animate-pulse rounded-lg bg-neutral-800" />
              <div className="mt-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="h-5 w-full animate-pulse rounded bg-neutral-800" />
                  <div className="mt-2 h-5 w-4/5 animate-pulse rounded bg-neutral-800" />
                </div>
                <div className="mt-1 h-6 w-6 animate-pulse rounded-full bg-neutral-800" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
          {error}
        </div>
      );
    }

    if (!visibleItems.length) {
      return (
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-neutral-300">
          No shorts available.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6">
        {visibleItems.map((item) => (
          <ShortCard key={item.id} item={item} />
        ))}
      </div>
    );
  }, [loading, error, visibleItems, isMobile]);

  return (
    <section className="px-4 py-6 md:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px]">
        <div className="mb-6">
          <ShortsLogo />
        </div>
        {content}
      </div>
    </section>
  );
}