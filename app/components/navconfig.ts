// app/components/navConfig.ts
import {
  HomeIcon,
  TvIcon,
  SparklesIcon,
  ClockIcon,
  HandThumbUpIcon,
  QueueListIcon,
  SignalIcon,
} from "@heroicons/react/24/outline";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  dividerAfter?: boolean;
};

export const mainNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/stations", label: "Live Stations", icon: SignalIcon },
  {
    href: "/ceclips",
    label: "CeClips",
    icon: SparklesIcon,
    dividerAfter: true,
  },
  { href: "/subscriptions", label: "Subscriptions", icon: ClockIcon },
  { href: "/channels", label: "Channels", icon: TvIcon },
  { href: "/history", label: "History", icon: ClockIcon },
  { href: "/likes", label: "Liked Videos", icon: HandThumbUpIcon },
  { href: "/playlists", label: "Playlists", icon: QueueListIcon },
];
