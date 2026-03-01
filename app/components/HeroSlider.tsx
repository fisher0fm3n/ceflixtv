// app/components/HeroSlider.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/solid";
import Link from "next/link";

export type Slide = {
  id: number;
  title: string;
  logo: string; // URL
  bg_img: string; // URL
  highlight_text?: string;
  desc?: string;
  btn_text: string;
  url_type: "internal" | "external";
  url: string; // internal path or external URL
};

type HeroSliderProps = {
  slides: Slide[];
  autoAdvanceMs?: number;
};

export default function HeroSlider({ slides, autoAdvanceMs = 8000 }: HeroSliderProps) {
  const [index, setIndex] = useState(0);

  // Current slide safely (null if slides empty)
  const current = useMemo(() => {
    if (!slides || slides.length === 0) return null;
    return slides[Math.min(index, slides.length - 1)];
  }, [slides, index]);

  // Ensure index is always in-range when slides load/change
  useEffect(() => {
    if (!slides || slides.length === 0) return;
    setIndex((i) => Math.min(i, slides.length - 1));
  }, [slides?.length]);

  function goTo(i: number) {
    const len = slides.length;
    if (len === 0) return;
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

  // Placeholder while slides load
  if (!current) {
    return (
      <section className="relative w-full h-[70vh] overflow-hidden bg-black">
        <div className="absolute inset-0 bg-neutral-900" />
        <div className="relative h-full flex items-end lg:items-center px-6 pb-8 sm:px-6 lg:px-6">
          <div className="max-w-xl space-y-4">
            <div className="h-10 w-64 bg-white/10 rounded animate-pulse" />
            <div className="h-4 w-96 bg-white/10 rounded animate-pulse" />
            <div className="h-10 w-40 bg-white/10 rounded animate-pulse" />
          </div>
        </div>
      </section>
    );
  }

  const isExternal = current.url_type === "external";
  const href = current.url || "#";

  return (
    <section className="relative w-full h-[40vh] xl:h-[70vh] overflow-hidden bg-black">
      {/* Background */}
      <div className="absolute inset-0">
        <Image
          src={current.bg_img}
          alt={current.title}
          fill
          priority
          className="object-cover object-top"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/10 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative h-full flex items-end lg:items-center px-6 pb-8 sm:px-6 lg:px-6 mx-[3rem]">
        <div className="max-w-xl space-y-5 md:space-y-6">
          {/* Logo */}
          <div className="max-w-xs sm:max-w-sm md:max-w-md mb-8 m-auto sm:m-0">
            <Image
              src={current.logo}
              alt={current.title}
              width={380}
              height={180}
              className="w-[14rem] sm:w-[16rem] lg:w-[18rem] h-auto m-auto sm:m-0" 
              priority
            />
          </div>

          {/* Title */}
          {current.desc && (
            <p className="text-center sm:text-left text-md sm:text-base text-neutral-200/90 max-w-lg leading-relaxed line-clamp-3">
              {current.desc}
            </p>
          )}

          {/* Button */}
          <div className="flex flex-wrap items-center gap-3 pt-1 justify-center sm:justify-start">
            {isExternal ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition"
              >
                {current.btn_text}
              </a>
            ) : (
              <Link
                href={href}
                className="cursor-pointer inline-flex items-center gap-2 rounded-md bg-red-600 hover:bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition"
              >
                {current.btn_text}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button
            onClick={prev}
            className="cursor-pointer absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition"
            aria-label="Previous slide"
          >
            <ChevronLeftIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
          <button
            onClick={next}
            className="cursor-pointer absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/50 hover:bg-black/70 p-2 text-white transition"
            aria-label="Next slide"
          >
            <ChevronRightIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </>
      )}

      {/* Dots */}
      {/* {slides.length > 1 && (
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
      )} */}
    </section>
  );
}
