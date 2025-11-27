// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./components/AuthProvider";

import InitialHomeGrid from "./components/HomeGrid";
import ChannelSlider from "./components/ChannelSlider";

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

type SubscriptionChannel = {
  id: number;
  channel: string;
  filename: string;
  urlprefix: string;
  slug?: string | null;
  url?: string | null;
};

// 🔹 Static default “guest” channels (subset of your JSON)
const DEFAULT_CHANNELS: SubscriptionChannel[] = [
  {
    id: 82,
    channel: "Haven TV",
    filename: "03559-havenchan.png",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 105,
    channel: "Pastor Chris Teaching",
    filename: "d0ff1-pstchristeachingthumbnail.jpg",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 164,
    channel: "Night of Bliss",
    filename: "8579f-vlcsnap-2016-01-13-15h35m45s321.png",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 175,
    channel: "Live Events Channel",
    filename: "e02af-1.png",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 335,
    channel: "Bright Side",
    filename: "6f17b-unnamed-copy.jpg",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 380,
    channel: "CeFlix News Channel",
    filename: "21cf4-new_thmbn.jpg",
    urlprefix: "https://d3c5pcohbexzc4.cloudfront.net/channel/thumbs/",
  },
  {
    id: 381,
    channel: "Special Live Events",
    filename: "154575-1649768876776983320507.jpg",
    urlprefix: "https://cdnvideos.ceflix.org/channel/thumbs/",
  },
];

export default function HomePage() {
  const { token, user, initialized, logout } = useAuth();
  const router = useRouter();

  const [subs, setSubs] = useState<SubscriptionChannel[]>([]);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsError, setSubsError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;
    // if (!token) {
    //   router.push("/login?next=/");
    // }
  }, [initialized, token, router]);

  // ✅ set document.title in an effect (browser only)
  useEffect(() => {
    document.title = "Ceflix Tv";
  }, []);

  // Fetch user subscriptions when logged in
  useEffect(() => {
    if (!initialized) return;
    if (!token) return; // guest → use static default, no API call

    const fetchSubscriptions = async () => {
      try {
        setSubsLoading(true);
        setSubsError(null);

        const res = await fetch(API_BASE + "user/subscriptions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Application-Key": APP_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const json = await res.json();
        const data = json.data || [];

        setSubs(data as SubscriptionChannel[]);
      } catch (err: any) {
        console.error("Error fetching subscriptions", err);
        setSubsError("Could not load your subscriptions.");
      } finally {
        setSubsLoading(false);
      }
    };

    fetchSubscriptions();
  }, [initialized, token]);

  // 🔹 While auth/token is still hydrating/being verified
  if (!initialized) {
    return (
      <main className="bg-neutral-950 text-white min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-400 text-sm">
          Loading your experience…
        </div>
      </main>
    );
  }

  // Decide what to show in the slider:
  // - Guest (no token): default channels
  // - Logged in: subs after they load; skeleton while loading
  let channelsToShow: SubscriptionChannel[] = [];
  let sliderTitle = "";

  if (!token) {
    channelsToShow = DEFAULT_CHANNELS;
    sliderTitle = "Popular Channels";
  } else {
    // Logged in – title can be empty or "Your Channels"
    sliderTitle = "";
    if (!subsLoading && subs.length > 0) {
      channelsToShow = subs;
    }
  }

  // 🔹 Slider loading state: logged in, initialized, and subs are still loading
  const sliderLoading = !!token && subsLoading;

  return (
    <main className="bg-neutral-950 text-white min-h-screen mb-[10rem]">
      <section className="mt-6">
        {token && subsError && (
          <div className="text-sm text-red-400 mb-2">{subsError}</div>
        )}

        {(sliderLoading || channelsToShow.length > 0) && (
          <ChannelSlider
            title={sliderTitle}
            items={channelsToShow}
            loading={sliderLoading}
          />
        )}
      </section>

      <InitialHomeGrid />
    </main>
  );
}
