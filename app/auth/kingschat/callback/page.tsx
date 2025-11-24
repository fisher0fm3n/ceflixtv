// app/auth/kingschat/callback/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";

export default function KingsChatCallbackPage() {
  const router = useRouter();
  const { hydrate, initialized } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return; // wait until AuthProvider finished reading localStorage

    (async () => {
      try {
        const res = await fetch("/api/kingschat/user", {
          method: "POST",
        });
        const json = await res.json();

        if (!res.ok || !json.ok) {
          setError(json.error || "KingsChat login failed.");
          return;
        }

        // ✅ drop the normalized payload into AuthProvider
        hydrate({
          token: json.token,
          user: json.user,
          purchaseToken: json.purchaseToken,
          encID: json.encID,
        });

        router.replace("/"); // or wherever you want to land
      } catch (e) {
        console.error("KingsChat callback error", e);
        setError("Network error while completing KingsChat login.");
      }
    })();
  }, [initialized, hydrate, router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-400">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      {/* <p>Finishing KingsChat sign in…</p> */}
    </div>
  );
}
