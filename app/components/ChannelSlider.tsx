// app/components/ChannelSlider.tsx
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Splide, SplideSlide } from "@splidejs/react-splide";
import "@splidejs/react-splide/css";

type ChannelItem = {
  id: number;
  channel: string;
  filename: string;
  urlprefix: string;
  slug?: string | null;
  url?: string | null;
  cover?: string | null; // optional, if you have it
};

type ChannelSliderProps = {
  title: string;
  items: ChannelItem[];
  loading?: boolean; // 🔹 NEW
};

export default function ChannelSlider({
  title,
  items,
  loading = false,
}: ChannelSliderProps) {
  const [mounted, setMounted] = useState(false);

  // How many skeleton slides to show when loading
  const skeletonCount = 8;

  return (
    <section className="w-full py-4 overflow-hidden">
      <div>
        {/* Section title */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="relative text-lg sm:text-xl font-bold text-white">
            {title}
          </h2>
        </div>

        <div className="relative px-6">
          <Splide
            options={{
              type: "loop",
              perPage: 8,
              perMove: 8,
              gap: "0.75rem",
              pagination: false,
              arrows: true,
              breakpoints: {
                1280: { perPage: 5, perMove: 5 },
                1024: { perPage: 4, perMove: 4 },
                768: { perPage: 3, perMove: 3 },
                640: { perPage: 2.5, perMove: 2 },
              },
            }}
            onMounted={() => setMounted(true)}
            className="overflow-visible ceflix-channel-row"
          >
            {loading
              ? // 🔹 Skeleton slides while loading
                Array.from({ length: skeletonCount }).map((_, index) => (
                  <SplideSlide
                    key={`skeleton-${index}`}
                    className="overflow-visible h-full"
                  >
                    <div className="block w-full h-full rounded-md overflow-hidden bg-neutral-900 animate-pulse">
                      <div className="flex flex-col items-center justify-center w-full h-full gap-3 px-3 py-4">
                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-neutral-800" />
                        <div className="mt-2 h-4 bg-neutral-800 rounded w-20" />
                      </div>
                    </div>
                  </SplideSlide>
                ))
              : // 🔹 Real data slides
                items.map((item) => {
                  const thumbSrc = `${item.urlprefix ?? ""}${
                    item.filename ?? ""
                  }`;
                  const bgSrc = item.cover || thumbSrc; // use cover if available, else thumb

                  return (
                    <SplideSlide
                      key={item.id}
                      className="overflow-visible h-full"
                    >
                      <Link
                        href={`/channel/${item.id}`}
                        className="block w-full h-full bg-cover bg-center rounded-md overflow-hidden "
                        style={{ backgroundImage: `url(${bgSrc})` }}
                      >
                        {/* Blurred overlay that brightens on hover */}
                        <div className="flex flex-col items-center justify-center w-full h-full gap-3 px-3 py-4 backdrop-blur backdrop-brightness-[.2] hover:backdrop-brightness-[.6] transition">
                          {/* Circular thumbnail */}
                          <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden bg-neutral-800">
                            <Image
                              src={thumbSrc}
                              alt={item.channel}
                              fill
                              sizes="(max-width: 768px) 25vw, 10vw"
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          {/* Channel name */}
                          <p className="mt-2 text-xs sm:text-sm font-semibold text-white text-center line-clamp-2 min-h-[2.5rem]">
                            {item.channel}
                          </p>
                        </div>
                      </Link>
                    </SplideSlide>
                  );
                })}
          </Splide>
        </div>
      </div>
    </section>
  );
}
