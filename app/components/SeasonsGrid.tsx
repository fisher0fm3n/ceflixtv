// app/components/SeasonsEpisodes.tsx
"use client";

import { useState } from "react";
import Image, { StaticImageData } from "next/image";
import {
  ChevronDownIcon,
  EllipsisVerticalIcon,
  BarsArrowDownIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";

export type Episode = {
  id: string;
  seasonNumber: number;
  episodeNumber: number;
  episodeLabel?: string; // e.g. "S1 E1"
  episodeTitle: string;  // e.g. "Izuku Midoriya: Origin"
  showTitle: string;     // e.g. "My Hero Academia"
  durationMinutes: number;
  thumbnail: StaticImageData | string;
  premiumLabel?: string; // e.g. "PREMIUM"
  audioTags?: string[];  // e.g. ["Dub", "Sub"]
  href?: string;         // optional link to the episode
};

export type Season = {
  id: string;
  label: string;        // e.g. "S1: My Hero Academia"
  episodes: Episode[];
};

type SeasonsEpisodesProps = {
  seasons: Season[];
};

export default function SeasonsEpisodes({ seasons }: SeasonsEpisodesProps) {
  const [activeSeasonId, setActiveSeasonId] = useState(seasons[0]?.id);

  const activeSeason =
    seasons.find((s) => s.id === activeSeasonId) ?? seasons[0];

  return (
    <section className="w-full bg-black text-white">
      <div className="mx-auto px-4 sm:px-[4rem] py-6 sm:py-8">
        {/* Top row: season selector + sort + options */}
        <div className="flex items-center justify-between gap-4 mb-6">
          {/* Season dropdown (visual only; real menu can be added later) */}
          <button
            type="button"
            className="inline-flex items-center gap-2 text-lg sm:text-xl font-semibold"
          >
            <ChevronDownIcon className="h-5 w-5" />
            <span className="truncate">
              {activeSeason?.label ?? "Seasons"}
            </span>
          </button>

          <div className="flex items-center gap-6 text-xs sm:text-sm text-neutral-200">
            <button
              type="button"
              className="inline-flex items-center gap-2 hover:text-white"
            >
              <BarsArrowDownIcon className="h-5 w-5" />
              <span className="uppercase tracking-wide">Oldest</span>
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 hover:text-white"
            >
              <EllipsisVerticalIcon className="h-5 w-5" />
              <span className="uppercase tracking-wide">Options</span>
            </button>
          </div>
        </div>

        {/* Small season pills (click to change season) */}
        {seasons.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {seasons.map((season) => (
              <button
                key={season.id}
                type="button"
                onClick={() => setActiveSeasonId(season.id)}
                className={`px-3 py-1 rounded-full text-xs sm:text-sm border transition ${
                  season.id === activeSeasonId
                    ? "bg-white text-black border-white"
                    : "border-white/30 text-neutral-200 hover:bg-white/10"
                }`}
              >
                {season.label}
              </button>
            ))}
          </div>
        )}

        {/* Episodes grid */}
        <div className="grid gap-6 sm:gap-7 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {activeSeason?.episodes.map((ep) => {
            const audioText = ep.audioTags?.join(" | ") || "Dub | Sub";
            const label =
              ep.episodeLabel ||
              `S${ep.seasonNumber} E${ep.episodeNumber}`;

            const CardWrapper: any = ep.href ? "a" : "div";
            const cardProps = ep.href
              ? { href: ep.href }
              : {};

            return (
              <div key={ep.id} className="flex flex-col gap-2">
                {/* Thumbnail card */}
                <CardWrapper
                  {...cardProps}
                  className="group relative block overflow-hidden bg-neutral-900"
                >
                  {/* Premium badge */}
                  {/* {ep.premiumLabel && (
                    <div className="absolute left-2 top-2 z-10 rounded-sm bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase text-black flex items-center gap-1">
                      <span className="inline-block">👑</span>
                      <span>{ep.premiumLabel}</span>
                    </div>
                  )} */}

                  {/* Thumbnail image */}
                  <div className="relative w-full aspect-[16/9]">
                    <Image
                      src={ep.thumbnail as any}
                      alt={ep.episodeTitle}
                      fill
                      sizes="(max-width: 768px) 100vw, 25vw"
                      className="object-cover"
                    />
                  </div>

                  {/* Play icon overlay */}
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-white opacity-0 group-hover:opacity-100 transition">
                      <PlayIcon className="h-6 w-6" />
                    </div>
                  </div>

                  {/* Duration bottom-right */}
                  <div className="pointer-events-none absolute bottom-2 right-2 rounded-sm bg-black/80 px-2 py-0.5 text-xs font-semibold">
                    {ep.durationMinutes}m
                  </div>
                </CardWrapper>

                {/* Text block below thumbnail */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-neutral-400">
                      {ep.showTitle}
                    </p>
                    <p className="text-sm sm:text-base font-semibold leading-snug">
                      {ep.episodeTitle}
                    </p>
                    <p className="text-xs text-neutral-400">{audioText}</p>
                  </div>

                  {/* More (kebab) button */}
                  <button
                    type="button"
                    className="mt-1 text-neutral-400 hover:text-white"
                  >
                    <EllipsisVerticalIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
