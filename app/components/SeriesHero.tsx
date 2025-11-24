// app/components/SeriesHero.tsx
"use client";

import Image, { StaticImageData } from "next/image";
import {
  PlayIcon,
  StarIcon,
} from "@heroicons/react/24/solid";
import {
  BookmarkIcon,
  PlusIcon,
  ArrowUpOnSquareIcon,
  EllipsisVerticalIcon,
  ChevronDownIcon,
} from "@heroicons/react/24/outline";

type SeriesHeroProps = {
  background: StaticImageData | string;
  logo: StaticImageData | string;

  title: string;
  seasonEpisodeLabel: string; // e.g. "S1:E1 “Episode 1”"
  ageRating?: string;         // e.g. "14+"
  tags?: string[];            // e.g. ["Sub", "Dub", "Action", "Adventure", "Comedy", "Thriller"]

  ratingValue?: number;       // 4.9
  ratingCountLabel?: string;  // "380.3K"

  description: string;

  audioInfo?: string;         // e.g. "Audio: Japanese, English, …"
  subtitleInfo?: string;      // e.g. "Subtitles: English, Deutsch, …"

  primaryCtaLabel?: string;   // default "Continue Watching"
  onPrimaryCtaClick?: () => void;
  onAddToListClick?: () => void;
  onLikeClick?: () => void;
  onShareClick?: () => void;
  onMoreClick?: () => void;
};

export default function SeriesHero({
  background,
  logo,
  title,
  ageRating = "",
  tags = [],
  ratingValue,
  ratingCountLabel,
  description,
  audioInfo,
  subtitleInfo,
  primaryCtaLabel = "Continue Watching",
  onPrimaryCtaClick,
  onAddToListClick,
  onLikeClick,
  onShareClick,
  onMoreClick,
}: SeriesHeroProps) {
  // simple 5-star fill based on ratingValue
  const totalStars = 5;
  const stars = Array.from({ length: totalStars }, (_, i) => i + 1);
  const normalizedRating = ratingValue ? Math.max(0, Math.min(5, ratingValue)) : 0;

  return (
    <section className="relative w-full h-[70vh] md:h-[80vh] lg:h-[90vh] overflow-hidden bg-black text-white">
      {/* Background image + gradients */}
      <div className="absolute inset-0">
        <Image
          src={background}
          alt={title}
          fill
          priority
          className="object-cover object-top"
        />
        {/* left-to-right darkening */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/50 to-transparent" />
        {/* bottom fade */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/10" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full px-6 sm:px-10 lg:px-16 flex flex-col justify-center">
        <div className="max-w-3xl space-y-6">
          {/* Logo */}
          <div className="max-w-xs sm:max-w-sm md:max-w-md">
            <Image src={logo} alt={`${title} logo`} className="w-[16rem] h-auto" />
          </div>

          {/* Meta row (age, tags) */}
          {(ageRating || tags.length) && (
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-200">
              {ageRating && (
                <span className="inline-flex items-center rounded-sm border border-white/40 bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold">
                  {ageRating}
                </span>
              )}

              {tags.length > 0 && (
                <span className="flex flex-wrap gap-x-1 gap-y-1">
                  {tags.map((tag, i) => (
                    <span key={`${tag}-${i}`} className="underline-offset-2">
                      {tag}
                      {i < tags.length - 1 ? " • " : ""}
                    </span>
                  ))}
                </span>
              )}
            </div>
          )}

          {/* Rating row */}
          {(ratingValue || ratingCountLabel) && (
            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-neutral-200">
              {/* Stars */}
              <div className="flex items-center gap-0.5">
                {stars.map((s) => (
                  <StarIcon
                    key={s}
                    className={`h-4 w-4 ${
                      s <= Math.round(normalizedRating)
                        ? "text-red-600"
                        : "text-neutral-600"
                    }`}
                  />
                ))}
              </div>

              {/* Average rating text */}
              {ratingValue && (
                <p className="flex items-center gap-1">
                  <span className="text-neutral-200/80">Average Rating:</span>
                  <span className="font-semibold">
                    {ratingValue.toFixed(1)}
                  </span>
                  {ratingCountLabel && (
                    <span className="text-neutral-300/80">
                      ({ratingCountLabel})
                    </span>
                  )}
                  <ChevronDownIcon className="h-3.5 w-3.5 text-neutral-300 mt-0.5" />
                </p>
              )}
            </div>
          )}

          {/* CTA row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Primary red button */}
            <button
              type="button"
              onClick={onPrimaryCtaClick}
              className="inline-flex items-center gap-2 rounded-sm bg-red-500 hover:bg-red-600 px-5 sm:px-6 py-2.5 text-xs sm:text-sm font-bold tracking-wide text-black shadow-md transition"
            >
              <PlayIcon className="h-5 w-5" />
              <span className="uppercase">
                {primaryCtaLabel}
              </span>
            </button>

            {/* Small square icon buttons */}
            <button
              type="button"
              onClick={onAddToListClick}
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/60 bg-black/40 hover:bg-white/10 transition"
            >
              <BookmarkIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onLikeClick}
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/60 bg-black/40 hover:bg-white/10 transition"
            >
              <PlusIcon className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={onShareClick}
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-white/60 bg-black/40 hover:bg-white/10 transition"
            >
              <ArrowUpOnSquareIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Description */}
          <p className="text-sm sm:text-base text-neutral-200/90 max-w-2xl leading-relaxed">
            {description}
          </p>

          {/* Audio + Subtitle info */}
          {(audioInfo || subtitleInfo) && (
            <div className="mt-2 text-[11px] sm:text-xs text-neutral-300/90 space-y-1">
              {audioInfo && <p>{audioInfo}</p>}
              {subtitleInfo && <p>{subtitleInfo}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
