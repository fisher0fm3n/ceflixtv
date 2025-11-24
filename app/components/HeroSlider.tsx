// app/components/HeroSlider.tsx
"use client";

import { useEffect, useState } from "react";
import Image, { StaticImageData } from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";

export type Slide = {
  id: string;
  background: StaticImageData; // 👈 imported image
  logo: StaticImageData;       // 👈 imported image
  ageRating?: string;
  meta?: string;
  description: string;
  primaryCta: string;
  secondaryCta?: string;
};

type HeroSliderProps = {
  slides: Slide[];
  autoAdvanceMs?: number;
};

export default function HeroSlider({
  slides,
  autoAdvanceMs = 8000,
}: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const current = slides[index];

  function goTo(i: number) {
    const len = slides.length;
    setIndex((i + len) % len);
  }

  function next() {
    goTo(index + 1);
  }

  function prev() {
    goTo(index - 1);
  }

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setTimeout(next, autoAdvanceMs);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, slides.length, autoAdvanceMs]);

  return (
    <section className="relative w-full h-[70vh] md:h-[80vh] lg:h-[95vh] overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src={current.background}
          alt=""
          fill
          priority
          className="object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/10 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-center px-6 sm:px-10 lg:px-16">
        <div className="max-w-xl space-y-5 md:space-y-6">
          {/* Logo */}
          <div className="max-w-xs sm:max-w-sm md:max-w-md">
            <Image
              src={current.logo}
              alt="Title logo"
              className="w-[20rem]"
            />
          </div>

          {/* Meta */}
          {(current.ageRating || current.meta) && (
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-neutral-300">
              {current.ageRating && (
                <span className="inline-flex items-center rounded-sm border border-white/40 bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold">
                  {current.ageRating}
                </span>
              )}
              {current.meta && (
                <span className="text-neutral-300/90">{current.meta}</span>
              )}
            </div>
          )}

          {/* Description */}
          <p className="text-sm sm:text-base text-neutral-200/90 max-w-lg leading-relaxed">
            {current.description}
          </p>

          {/* Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition">
              {current.primaryCta}
            </button>

            {current.secondaryCta && (
              <button className="inline-flex items-center gap-2 rounded-md bg-neutral-700/70 hover:bg-neutral-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition">
                {current.secondaryCta}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition"
            aria-label="Previous slide"
          >
            <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition"
            aria-label="Next slide"
          >
            <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-orange-500"
                  : "w-3 bg-neutral-500/60 hover:bg-neutral-300/80"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
