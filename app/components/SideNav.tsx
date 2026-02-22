// app/components/SideNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { mainNavItems } from "./navconfig";
import { DevicePhoneMobileIcon } from "@heroicons/react/24/outline";

type SideNavProps = {
  collapsed?: boolean;
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

  const isPlayerPage =
    pathname.startsWith("/videos") || pathname.startsWith("/ceclips");

  if (pathname.startsWith("/login")) return null;

  const effectiveCollapsed =
    typeof collapsedProp === "boolean"
      ? collapsedProp
      : isPlayerPage
        ? true
        : false;

  // -------- Overlay version for player page --------
  if (isPlayerPage) {
    const isOpen = !effectiveCollapsed;

    return (
      <>
        {isOpen && (
          <div
            className="fixed inset-0 z-[998] bg-black/40 md:hidden"
            onClick={() => {
              if (onClose) onClose();
            }}
          />
        )}

        {isOpen && (
          <aside className="fixed hidden left-0 top-16 z-[999] backdrop-blur lg:flex h-[calc(100vh-4rem)] flex-col bg-neutral-950/80 text-white w-60">
            <nav className="flex-1 py-4">
              {mainNavItems.map((item) => {
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
                        : "text-neutral-200 hover:bg-neutral-800/60",
                    )}
                    onClick={() => {
                      if (onClose) onClose();
                    }}
                  >
                    <Icon className="h-6 w-6 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
              <a
                href="https://web.lwappstore.com/share/lW-sA-D70-AJ318"
                target="_blank"
                rel="noopener noreferrer"
                className="mx-3 mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition text-neutral-200 hover:bg-neutral-800/60"
                onClick={() => {
                  if (onClose) onClose();
                }}
              >
                <DevicePhoneMobileIcon className="h-5 w-5 shrink-0" />
                <span className="truncate">Ceflix Tv App</span>
              </a>
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
        "hidden lg:flex fixed left-0 top-16 h-[calc(100vh-4rem)] flex-col bg-neutral-950 text-white z-[999]",
        effectiveCollapsed ? "w-16" : "w-60",
      )}
    >
      <nav className="flex-1 py-4">
        {mainNavItems.map((item) => {
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
                  : "text-neutral-200 hover:bg-neutral-800/60",
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
        <a
          href="https://web.lwappstore.com/share/lW-sA-D70-AJ318"
          target="_blank"
          rel="noopener noreferrer"
          className={cx(
            "mx-2 mb-1 flex items-center rounded-lg px-3 py-2 text-sm transition text-neutral-200 hover:bg-neutral-800/60",
            effectiveCollapsed ? "justify-center" : "gap-3",
          )}
          onClick={() => {
            if (onClose) onClose();
          }}
        >
          <DevicePhoneMobileIcon className="h-6 w-6 shrink-0" />
          <span className={effectiveCollapsed ? "sr-only" : "truncate ml-3"}>
            Ceflix Tv App
          </span>
        </a>
      </nav>
    </aside>
  );
}
