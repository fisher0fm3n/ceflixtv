"use client";

import { useState } from "react";
import Image, { StaticImageData } from "next/image";
import {
  PlayIcon,
  PlusIcon,
  HandThumbUpIcon,
} from "@heroicons/react/24/solid";
import { Splide, SplideSlide } from "@splidejs/react-splide";

type SliderItem = {
  id: string;
  title: string;
  image: StaticImageData | string;
  subtitle?: string;
  meta?: string;
  tags?: string[];
};

type RowSliderProps = {
  title: string;
  items: SliderItem[];
};

export default function RowSlider({ title, items }: RowSliderProps) {
  const [firstIndex, setFirstIndex] = useState(0);
  const [partialIndex, setPartialIndex] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(5);

  const updateVisibleIndices = (splide: any) => {
    const perPage = splide.options.perPage || 1;
    const first = splide.index;
    const fullCount = Math.floor(perPage);
    const partial = first + fullCount; // next slide is the “.4” partial one

    setFirstIndex(first);
    setVisibleCount(fullCount);
    setPartialIndex(partial < splide.length ? partial : null);
  };

  const lastVisibleIndex = firstIndex + (visibleCount - 1);

  return (
    <section className="w-full py-6 overflow-visible">
      <div className="px-4 sm:px-[4rem]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="relative text-lg sm:text-xl font-bold text-white">
            {title}
          </h2>
        </div>

        <div className="relative overflow-visible">
          <Splide
            options={{
              type: "loop",
              perPage: 5,
              perMove: 3,
              gap: "0.5rem",
              pagination: false,
              arrows: true,
              drag: "free",
              breakpoints: {
                1280: { perPage: 5, perMove: 2 },
                1024: { perPage: 4, perMove: 2 },
                768: { perPage: 3, perMove: 1 },
                640: { perPage: 2, perMove: 1 },
              },
            }}
            className="overflow-visible ceflix-row"
            onMounted={updateVisibleIndices}
            onMoved={updateVisibleIndices}
            onResized={updateVisibleIndices}
          >
            {items.map((item, index) => {
              const isFirstVisible = index === firstIndex;
              const isLastVisible = index === lastVisibleIndex;
              const isPartialLast =
                partialIndex !== null && index === partialIndex;

              return (
                <SplideSlide key={item.id} className="overflow-visible">
                  <div className="relative w-full overflow-visible group">
                    {/* Base thumbnail */}
                    <div className="relative aspect-[16/9] rounded-md overflow-hidden bg-neutral-800">
                      <Image
                        src={item.image as any}
                        alt={item.title}
                        fill
                        sizes="(max-width: 768px) 50vw, 20vw"
                        className="object-cover"
                      />
                    </div>

                    {/* Hover card (skip the rightmost partial slide) */}
                    {!isPartialLast && (
                      <div
                        className={
                          "absolute -top-[5rem] w-[280px] sm:w-[320px] lg:w-[360px] z-30 " +
                          "rounded-md overflow-hidden bg-neutral-950 drop-shadow-2xl " +
                          "opacity-0 scale-95 translate-y-2 pointer-events-none " +
                          "transition duration-200 ease-out cursor-pointer " +
                          "group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto " +
                          (isFirstVisible
                            ? "" // first visible keeps your current behavior
                            : isLastVisible
                            ? "right-0 translate-x-0" // 👈 last visible shifts left
                            : "left-1/2 -translate-x-1/2")
                        }
                      >
                        {/* big preview image */}
                        <div className="relative aspect-[16/9] bg-neutral-950">
                          <Image
                            src={item.image as any}
                            alt={item.title}
                            fill
                            sizes="360px"
                            className="object-cover"
                          />
                        </div>

                        {/* content */}
                        <div className="p-3 sm:p-4 space-y-2">
                          {/* controls row */}
                          <div className="flex items-center gap-2">
                            <button className="inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white text-neutral-900 hover:scale-105 transition">
                              <PlayIcon className="h-5 w-5" />
                            </button>
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-white hover:bg-white/10 transition">
                              <PlusIcon className="h-5 w-5" />
                            </button>
                            <button className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/40 text-white hover:bg-white/10 transition">
                              <HandThumbUpIcon className="h-5 w-5" />
                            </button>
                          </div>

                          {/* tags */}
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-neutral-300">
                              {item.tags.map((tag, i) => (
                                <span
                                  key={tag}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  {i > 0 && (
                                    <span className="h-1 w-1 rounded-full bg-neutral-500" />
                                  )}
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </SplideSlide>
              );
            })}
          </Splide>
        </div>
      </div>
    </section>
  );
}
