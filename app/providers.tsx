// app/providers.tsx
"use client";

import { AuthProvider } from "../app/components/AuthProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
