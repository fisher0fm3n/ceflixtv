// app/components/navConfig.ts
import type { ComponentType, SVGProps } from "react";
import {
  HomeIcon as HomeIconOutline,
  TvIcon as TvIconOutline,
  SparklesIcon as SparklesIconOutline,
  ClockIcon as ClockIconOutline,
  QueueListIcon as QueueListIconOutline,
  SignalIcon as SignalIconOutline,
  HeartIcon as HeartIconOutline,
  RectangleStackIcon as RectangleStackIconOutline,
  Squares2X2Icon as Squares2X2IconOutline,
  PaperAirplaneIcon as PaperAirplaneIconOutline,
} from "@heroicons/react/24/outline";

import {
  HomeIcon as HomeIconSolid,
  TvIcon as TvIconSolid,
  SparklesIcon as SparklesIconSolid,
  ClockIcon as ClockIconSolid,
  QueueListIcon as QueueListIconSolid,
  SignalIcon as SignalIconSolid,
  HeartIcon as HeartIconSolid,
  RectangleStackIcon as RectangleStackIconSolid,
  Squares2X2Icon as Squares2X2IconSolid,
  PaperAirplaneIcon as PaperAirplaneIconSolid,
} from "@heroicons/react/24/solid";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  activeIcon?: ComponentType<SVGProps<SVGSVGElement>>;
  dividerAfter?: boolean;
};

export const mainNavItems: NavItem[] = [
  { href: "/", label: "Home", icon: HomeIconOutline, activeIcon: HomeIconSolid },
  {
    href: "/explore",
    label: "Explore",
    icon: PaperAirplaneIconOutline,
    activeIcon: PaperAirplaneIconSolid,
  },
  {
    href: "/ceclips",
    label: "CeClips",
    icon: SparklesIconOutline,
    activeIcon: SparklesIconSolid,
  },
  {
    href: "/stations",
    label: "Live Stations",
    icon: SignalIconOutline,
    activeIcon: SignalIconSolid,
    dividerAfter: true,
  },
  {
    href: "/history",
    label: "History",
    icon: ClockIconOutline,
    activeIcon: ClockIconSolid,
  },
  {
    href: "/likes",
    label: "Liked Videos",
    icon: HeartIconOutline,
    activeIcon: HeartIconSolid,
  },
  {
    href: "/playlists",
    label: "Playlists",
    icon: QueueListIconOutline,
    activeIcon: QueueListIconSolid,
  },
  {
    href: "/channels",
    label: "Your Channels",
    icon: TvIconOutline,
    activeIcon: TvIconSolid,
    dividerAfter: true,
  },
  {
    href: "/collections",
    label: "Collections",
    icon: Squares2X2IconOutline,
    activeIcon: Squares2X2IconSolid,
  },
  {
    href: "/subscriptions",
    label: "Subscriptions",
    icon: RectangleStackIconOutline,
    activeIcon: RectangleStackIconSolid,
  },
];