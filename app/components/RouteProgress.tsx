"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import TopBarProgress from "react-topbar-progress-indicator";

// Same config as your React Router example
TopBarProgress.config({
  barColors: {
    0: "#d32f2d",
    "1.0": "#d32f2d",
  },
  shadowBlur: 0,
  className: "topbar",
});

export default function RouteProgress({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);
  const [progress, setProgress] = useState(false);

  // When the path changes, start the progress bar
  useEffect(() => {
    if (pathname !== prevPath) {
      setPrevPath(pathname);
      setProgress(true);
    }
  }, [pathname, prevPath]);

  // Stop the progress bar after a short delay
  useEffect(() => {
    if (!progress) return;

    // You can tweak this timeout to feel snappier / slower
    const timer = setTimeout(() => {
      setProgress(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [progress]);

  return (
    <>
      {progress && <TopBarProgress />}
      {children}
    </>
  );
}
