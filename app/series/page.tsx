import SeriesHero from "@/app/components/SeriesHero";
import spyBg from "@/app/assets/images/homepage/psv-bg-2.png";
import spyLogo from "@/app/assets/images/homepage/psv-logo.png";
import SeasonsEpisodes, {
  Season,
} from "@/app/components/SeasonsGrid";


import ep1Thumb from "@/app/assets/images/homepage/psv-bg-2.png";
import ep2Thumb from "@/app/assets/images/homepage/psv-bg-2.png";

const seasons: Season[] = [
  {
    id: "s1",
    label: "My glow up jouney",
    episodes: [
      {
        id: "s1e1",
        seasonNumber: 1,
        episodeNumber: 1,
        episodeTitle: "E1 - My History",
        showTitle: "My glow up jouney",
        durationMinutes: 24,
        thumbnail: ep1Thumb,
        premiumLabel: "Premium",
        audioTags: ["Dub", "Sub"],
        href: "/watch/mha/s1e1",
      },
      {
        id: "s1e2",
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "What It Takes to Be a ...",
        showTitle: "My glow up jouney",
        durationMinutes: 24,
        thumbnail: ep2Thumb,
        premiumLabel: "Premium",
        audioTags: ["Dub", "Sub"],
        href: "/watch/mha/s1e2",
      },
            {
        id: "s1e2",
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "What It Takes to Be a ...",
        showTitle: "My glow up jouney",
        durationMinutes: 24,
        thumbnail: ep2Thumb,
        premiumLabel: "Premium",
        audioTags: ["Dub", "Sub"],
        href: "/watch/mha/s1e2",
      },
            {
        id: "s1e2",
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "What It Takes to Be a ...",
        showTitle: "My glow up jouney",
        durationMinutes: 24,
        thumbnail: ep2Thumb,
        premiumLabel: "Premium",
        audioTags: ["Dub", "Sub"],
        href: "/watch/mha/s1e2",
      },
            {
        id: "s1e2",
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "What It Takes to Be a ...",
        showTitle: "My glow up jouney",
        durationMinutes: 24,
        thumbnail: ep2Thumb,
        premiumLabel: "Premium",
        audioTags: ["Dub", "Sub"],
        href: "/watch/mha/s1e2",
      },
            {
        id: "s1e2",
        seasonNumber: 1,
        episodeNumber: 2,
        episodeTitle: "What It Takes to Be a ...",
        showTitle: "My glow up jouney",
        durationMinutes: 24,
        thumbnail: ep2Thumb,
        premiumLabel: "Premium",
        audioTags: ["Dub", "Sub"],
        href: "/watch/mha/s1e2",
      },
      // …
    ],
  },
  // more seasons if you have them
];

export default function Page() {
  return (
    <><SeriesHero
      background={spyBg}
      logo={spyLogo}
      title="My Glow Up Journey"
      ageRating="G"
      tags={["Sub", "Dub", "Faith", "Lifestlye"]}
      ratingValue={4.9}
      ratingCountLabel="380.3K"
      description="A raw and honest look into my glow up journey and how growing closer to God helped me discover my true self. Sharing how this transformation strengthened my faith and shaped my mindset. Reflecting on the impact it had on my relationships with family and friends. A journey of healing, purpose, and becoming who I was always meant to be."
      audioInfo="Audio: Japanese, English, Deutsch, Español (América Latina), Français, Português (Brasil)"
      subtitleInfo="Subtitles: English, Deutsch, Español, Français, Português, Русский, العربية"
      primaryCtaLabel="Watch Episode 1" />
      <SeasonsEpisodes seasons={seasons} />
      </>
  );
}
