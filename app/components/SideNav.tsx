"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HomeIcon,
  TvIcon,
  SparklesIcon,
  FireIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";
import { useAuth } from "./AuthProvider";

const items = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/ceclips", label: "CeClips", icon: SparklesIcon },
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

export default function SideNav({ collapsed = false, onClose }: SideNavProps) {
  const pathname = usePathname();
  const { token, user } = useAuth();
  const loggedIn = Boolean(token && user);

  // Treat anything under /player as the watch page
  const isPlayerPage = pathname.startsWith("/videos");

    if (pathname.startsWith("/login"))
    return null;

  // On the player page we want it collapsed (hidden) by default if parent
  // didn't pass anything explicit.
  const effectiveCollapsed =
    typeof collapsed === "boolean"
      ? collapsed
      : isPlayerPage
      ? true
      : false;

  // -------- Overlay version for player page --------
  if (isPlayerPage) {
    const isOpen = !effectiveCollapsed;

    return (
      <>
        {/* Backdrop */}
        {/* <div
          className={cx(
            "fixed inset-0 z-[998] bg-black/40 transition-opacity duration-200 md:block",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={() => {
            if (isOpen && onClose) onClose();
          }}
        /> */}

        {/* Sliding panel */}
        <aside
          className={cx(
            "fixed left-0 top-16 z-[999] backdrop-blur md:flex h-[calc(100vh-4rem)] flex-col bg-neutral-950/80 text-white w-60 transition-transform duration-200",
            isOpen ? "translate-x-0" : "-translate-x-full"
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
                    "mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                    active
                      ? "bg-neutral-800 text-white font-semibold"
                      : "text-neutral-200 hover:bg-neutral-800/60"
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
      </>
    );
  }

  // -------- Default behaviour for all other pages --------
  return (
    <aside
      className={cx(
        "hidden md:flex fixed left-0 top-16 h-[calc(100vh-4rem)] flex-col bg-neutral-950 text-white transition-all duration-200 z-[999]",
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
