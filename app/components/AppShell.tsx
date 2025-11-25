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

export default function AppShell({ children }: Props) {
  const pathname = usePathname();
  const isPlayerPage = pathname.startsWith("/videos");

  // sidebar state, route-aware
  const [sideCollapsed, setSideCollapsed] = useState(true);

  // 👇 whenever the route changes, decide default:
  // - player page  -> collapsed
  // - other pages  -> expanded
  useEffect(() => {
    if (isPlayerPage) {
      setSideCollapsed(true);
    } else {
      setSideCollapsed(false);
    }
  }, [isPlayerPage]);

  // MAIN margin-left logic:
  // - player page: always full width (sidebar overlays)
  // - others: margin depends on collapsed state
  const mainMarginClass = isPlayerPage
    ? "md:ml-0"
    : sideCollapsed
    ? "md:ml-16"
    : "md:ml-60";

  return (
    <>
      <MainNav
        onToggleSideNav={() => setSideCollapsed((v) => !v)}
        sideCollapsed={sideCollapsed}
      />
      <RouteProgress>
        <SideNav
          collapsed={sideCollapsed}
          onClose={() => setSideCollapsed(true)}
        />
      </RouteProgress>

      <main
        className={`${!pathname.startsWith("/login") && (`pt-16 ${mainMarginClass} transition-[margin] duration-200`)}`}
      >
        {children}
      </main>
    </>
  );
}
