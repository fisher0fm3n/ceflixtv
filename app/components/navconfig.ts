// app/components/navConfig.ts
import {
  HomeIcon,
  TvIcon,
  SparklesIcon,
  Squares2X2Icon,
  ClockIcon,
  HandThumbUpIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

export const mainNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/ceclips", label: "CeClips", icon: SparklesIcon },
  { href: "/history", label: "History", icon: ClockIcon },
  { href: "/channels", label: "Channels", icon: TvIcon },
  { href: "/likes", label: "Liked Videos", icon: HandThumbUpIcon },
  { href: "/playlists", label: "Playlists", icon: QueueListIcon },
  // If you still want Anime / Short Drama / Trending / Category
  // either add them here, or create a second array for "explore" links.
];
