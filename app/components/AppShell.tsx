// app/components/AppShell.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import MainNav from "./MainNav";
import SideNav from "./SideNav";
import RouteProgress from "./RouteProgress";

type Props = {
  children: React.ReactNode;
};

const STORAGE_KEY = "ceflix.sidenav.collapsed";

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isPlayerPage =
    pathname.startsWith("/videos") || pathname.startsWith("/ceclips");
  const isLoginPage = pathname.startsWith("/login");

  // null = not yet initialised from storage/route
  const [sideCollapsed, setSideCollapsed] = useState<boolean | null>(null);

  // 👉 Scroll to top on every route change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
    // If you prefer smooth scroll:
    // window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname]);

  // Initialise sideCollapsed whenever the route changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    // On login page we don't really care; hide sidebar
    if (isLoginPage) {
      setSideCollapsed(true);
      return;
    }

    // On player pages: always start hidden (overlay closed), do NOT persist
    if (isPlayerPage) {
      setSideCollapsed(true);
      return;
    }

    // On normal pages: read from localStorage (persisted user preference)
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        if (typeof parsed === "boolean") {
          setSideCollapsed(parsed);
          return;
        }
      }
    } catch {
      // ignore parse/storage errors
    }

    // Fallback default for normal pages: expanded
    setSideCollapsed(false);
  }, [isPlayerPage, isLoginPage, pathname]);

  // Toggle handler: persist only on non-player pages
  const handleToggleSideNav = () => {
    setSideCollapsed((prev) => {
      const current = typeof prev === "boolean" ? prev : false;
      const next = !current;

      if (!isPlayerPage && typeof window !== "undefined") {
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
      }

      return next;
    });
  };

  // Close handler (used by overlay on player pages)
  const handleCloseSideNav = () => {
    setSideCollapsed(true);
    // Note: we intentionally do NOT persist this on player pages
  };

  const collapsedBool =
    typeof sideCollapsed === "boolean" ? sideCollapsed : false;

  // MAIN margin-left logic:
  const mainMarginClass = isPlayerPage
    ? "md:ml-0"
    : collapsedBool
    ? "md:ml-16"
    : "md:ml-60";

  return (
    <>
      <MainNav
        onToggleSideNav={handleToggleSideNav}
        sideCollapsed={collapsedBool}
      />

      <RouteProgress>
        {!isLoginPage && (
          <SideNav collapsed={collapsedBool} onClose={handleCloseSideNav} />
        )}
      </RouteProgress>

      <main
        className={
          isLoginPage
            ? ""
            : `pt-16 ${mainMarginClass} transition-[margin] duration-200`
        }
      >
        {children}
      </main>
    </>
  );
}
