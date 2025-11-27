// app/components/SideNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  TvIcon,
  SparklesIcon,
  FireIcon,
  Squares2X2Icon,
  ClockIcon,
  HandThumbUpIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { useAuth } from "./AuthProvider";

const items = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/ceclips", label: "CeClips", icon: SparklesIcon },
  { href: "/history", label: "History", icon: ClockIcon },
  { href: "/channels", label: "Channels", icon: TvIcon },
  { href: "/likes", label: "Liked Videos", icon: HandThumbUpIcon },
  { href: "/playlists", label: "Playlists", icon: QueueListIcon },
];

type SideNavProps = {
  /** For regular pages: false = wide, true = icon-only.
   *  For /player page: false = open overlay, true = hidden.
   */
  collapsed?: boolean;
  /** Optional: called when user clicks on the backdrop in overlay mode */
  onClose?: () => void;
};

function cx(...cls: (string | false | null | undefined)[]) {
  return cls.filter(Boolean).join(" ");
}

export default function SideNav({
  collapsed: collapsedProp,
  onClose,
}: SideNavProps) {
  const pathname = usePathname();
  const { token, user } = useAuth();
  const loggedIn = Boolean(token && user);

  // Treat anything under /player as the watch page
  const isPlayerPage =
    pathname.startsWith("/videos") || pathname.startsWith("/ceclips");

  if (pathname.startsWith("/login")) return null;

  // Single source of truth:
  // - On player pages, we rely only on collapsedProp (overlay open/closed).
  // - On normal pages, we also rely on collapsedProp.
  //   (AppShell is responsible for reading/writing localStorage.)
  const effectiveCollapsed =
    typeof collapsedProp === "boolean"
      ? collapsedProp
      : isPlayerPage
      ? true // default hidden on player page if no prop provided
      : false; // default expanded on normal pages

  // -------- Overlay version for player page --------
  if (isPlayerPage) {
    const isOpen = !effectiveCollapsed;

    return (
      <>
        {/* Optional backdrop – click to close */}
        {isOpen && (
          <div
            className="fixed inset-0 z-[998] bg-black/40 md:hidden"
            onClick={() => {
              if (onClose) onClose();
            }}
          />
        )}

        {/* Sliding panel */}
{/* Snap-in panel */}
{isOpen && (
  <aside
    className="fixed left-0 top-16 z-[999] backdrop-blur md:flex h-[calc(100vh-4rem)] flex-col bg-neutral-950/80 text-white w-60"
  >
    <nav className="flex-1 py-4">
      {items.map((item) => {
        const active =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cx(
              "mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
              active
                ? "bg-neutral-800 text-white font-semibold"
                : "text-neutral-200 hover:bg-neutral-800/60"
            )}
            onClick={() => {
              if (onClose) onClose();
            }}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  </aside>
)}
      </>
    );
  }

  // -------- Default behaviour for all other pages --------
  return (
<aside
  className={cx(
    "hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] flex-col bg-neutral-950 text-white z-[999]",
    effectiveCollapsed ? "w-16" : "w-60"
  )}
>

      <nav className="flex-1 py-4">
        {items.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cx(
                "mx-2 mb-1 flex items-center rounded-lg px-3 py-2 text-sm transition",
                effectiveCollapsed ? "justify-center" : "gap-3",
                active
                  ? "bg-neutral-800 text-white font-semibold"
                  : "text-neutral-200 hover:bg-neutral-800/60"
              )}
            >
              <Icon className="h-6 w-6 shrink-0" />
              <span
                className={effectiveCollapsed ? "sr-only" : "truncate ml-3"}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
