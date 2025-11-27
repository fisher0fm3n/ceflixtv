"use client";

import { useState } from "react";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import { Splide, SplideSlide } from "@splidejs/react-splide";

type SliderItem = {
  id: string;
  title: string;
  image: StaticImageData | string;
  /** e.g. "10K views • 1 year ago" */
  meta?: string;
  /** e.g. "27:49" */
  duration?: string;
  /** optional link for the video */
  href?: string;
};

type RowSliderProps = {
  title: string;
  items: SliderItem[];
};

export default function RowSlider({ title, items }: RowSliderProps) {
  // keep Splide happy with controlled re-render if you want later,
  // but no hover logic needed anymore
  const [mounted, setMounted] = useState(false);

  return (
    <section className="w-full py-4 overflow-hidden">
      <div className="px-4 sm:px-[4rem]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="relative text-lg sm:text-xl font-bold text-white">
            {title}
          </h2>
        </div>

        <div className="relative">
          <Splide
            options={{
              type: "loop",
              perPage: 4,
              perMove: 4,
              gap: "0.75rem",
              pagination: false,
              arrows: true,
              breakpoints: {
                1280: { perPage: 4, perMove: 4 },
                1024: { perPage: 3, perMove: 3 },
                768: { perPage: 2, perMove: 2 },
                640: { perPage: 1.5, perMove: 1 },
              },
            }}
            onMounted={() => setMounted(true)}
            className="overflow-visible ceflix-row"
          >
            {items.map((item) => {
              const content = (
                <>
                  {/* Thumbnail */}
                  <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-neutral-800">
                    <Image
                      src={item.image as any}
                      alt={item.title}
                      fill
                      sizes="(max-width: 768px) 90vw, 25vw"
                      className="object-cover"
                      unoptimized
                    />

                    {item.duration && (
                      <span className="absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[11px] font-semibold bg-black/80 text-white">
                        {item.duration}
                      </span>
                    )}
                  </div>

                  {/* Text */}
                  <div className="mt-2 flex flex-col">
                    <p className="text-md font-semibold text-white leading-snug line-clamp-2">
                      {item.title}
                    </p>
                    {item.meta && (
                      <p className="mt-1 text-xs text-neutral-400">
                        {item.meta}
                      </p>
                    )}
                  </div>
                </>
              );

              return (
                <SplideSlide key={item.id} className="overflow-visible">
                  <div className="flex flex-col w-full cursor-pointer">
                      <Link
                        href={`/videos/watch/${item.id}/${item.title
                          .replace(/[\s+-]/g, "-")
                          .toLowerCase()}`}
                      >
                        {content}
                      </Link>
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
