// app/components/AuthProvider.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type AuthState = {
  token: string | null;
  user: any | null;
  purchaseToken: string | null;
  encID: string | null;
};

type LoginResult = {
  ok: boolean;
  error?: string;
};

type HydrateInput = {
  token: string;
  user: any;
  purchaseToken?: string | null;
  encID?: string | null;
};

type AuthContextValue = {
  token: string | null;
  user: any | null;
  purchaseToken: string | null;
  encID: string | null;
  loading: boolean;      // login in-flight
  initialized: boolean;  // auth loaded from device
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  hydrate: (data: HydrateInput) => void; // set auth from an existing payload (e.g. KingsChat)
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = "ceflix_auth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    purchaseToken: null,
    encID: null,
  });

  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();

  // Load from localStorage on first mount
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY)
        : null;

      if (raw) {
        const parsed = JSON.parse(raw);
        setState({
          token: parsed.token ?? null,
          user: parsed.user ?? null,
          purchaseToken: parsed.purchaseToken ?? null,
          encID: parsed.encID ?? null,
        });
      }
    } catch (e) {
      console.error("Failed to load auth from storage", e);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Persist to localStorage whenever auth changes
  useEffect(() => {
    if (!initialized) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save auth to storage", e);
    }
  }, [state, initialized]);

  // Normal username/password login via /api/login
  async function login(
    username: string,
    password: string
  ): Promise<LoginResult> {
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error || "Login failed" };
      }

      const { token, user, purchaseToken, encID } = json;

      if (!token || !user) {
        return {
          ok: false,
          error: "Login succeeded but token or user is missing.",
        };
      }

      setState({
        token,
        user,
        purchaseToken: purchaseToken || null,
        encID: encID || null,
      });

      return { ok: true };
    } catch (e) {
      console.error("Login error", e);
      return { ok: false, error: "Network error" };
    } finally {
      setLoading(false);
    }
  }

  // Hydrate from an already-normalized payload
  // e.g. response from /api/kingschat/user
  function hydrate(data: HydrateInput) {
    setState({
      token: data.token,
      user: data.user,
      purchaseToken: data.purchaseToken ?? null,
      encID: data.encID ?? null,
    });
  }

  function logout() {
    setState({
      token: null,
      user: null,
      purchaseToken: null,
      encID: null,
    });
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    router.push("/login");
  }

  const value: AuthContextValue = {
    token: state.token,
    user: state.user,
    purchaseToken: state.purchaseToken,
    encID: state.encID,
    loading,
    initialized,
    login,
    logout,
    hydrate,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
