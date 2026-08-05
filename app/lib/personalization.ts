// app/lib/personalization.ts
//
// Typed client for the interest and home-layout endpoints.
// See CeFlix-API `docs/personalization.md`.

const API_BASE = "https://webapi.ceflix.org/api/";
const APP_KEY = "2567a5ec9705eb7ac2c984033e06189d";

export type Interest = {
  id: number;
  title: string;
  description: string;
  /** Editable via tbl_category.interest_image; falls back to a placeholder. */
  thumbnail: string;
  /** Legacy tbl_category.thumbnail value, kept for reference. */
  legacy_thumbnail?: string;
  /** Accent used for the tile when no image renders. */
  color?: string;
  featured: boolean;
  channel_count: number;
};

export type InterestStatus = {
  selected: number[];
  selected_count: number;
  completed: boolean;
  completed_at: string | null;
  /** True while the user has never been through the picker. */
  should_prompt: boolean;
  recommended_minimum: number;
};

export type HomeSectionPreference = {
  section_key: string;
  title: string;
  description: string;
  personalized: boolean;
  is_hidden: boolean;
  sort_order: number;
  customized: boolean;
};

async function call<T>(path: string, body?: Record<string, unknown>) {
  const res = await fetch(API_BASE + path, {
    method: body ? "POST" : "GET",
    headers: {
      "Content-Type": "application/json",
      "Application-Key": APP_KEY,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}) as any);

  if (!res.ok || json?.status === false) {
    throw new Error(json?.message || "Request failed.");
  }

  return json as T;
}

export async function fetchInterestCatalog() {
  const json = await call<{
    data: Interest[];
    meta: { recommended_minimum: number; max_selections: number };
  }>("interests");

  return {
    interests: Array.isArray(json?.data) ? json.data : [],
    recommendedMinimum: json?.meta?.recommended_minimum ?? 3,
    maxSelections: json?.meta?.max_selections ?? 25,
  };
}

export async function fetchInterestStatus(token: string) {
  const json = await call<{ data: InterestStatus }>("interests/status", {
    token,
  });
  return json.data;
}

export async function saveInterests(token: string, categories: number[]) {
  return call<{ data: number[]; ignored: number[]; meta: InterestStatus }>(
    "interests",
    { token, categories },
  );
}

export async function skipInterests(token: string) {
  return call<{ meta: InterestStatus }>("interests/skip", { token });
}

export async function fetchHomeLayout(token: string) {
  const json = await call<{ data: HomeSectionPreference[] }>("home-layout", {
    token,
  });
  return Array.isArray(json?.data) ? json.data : [];
}

/**
 * Order is taken from array position, so the caller only has to send the list
 * in the order the user arranged it.
 */
export async function saveHomeLayout(
  token: string,
  sections: { section_key: string; is_hidden: boolean }[],
) {
  return call<{ ignored: string[] }>("home-layout/update", { token, sections });
}

export async function resetHomeLayout(token: string) {
  return call<Record<string, unknown>>("home-layout/reset", { token });
}

/**
 * Whether to route a freshly signed-in user into the interest picker.
 * Never throws — a failure here must not block sign-in.
 */
export async function shouldPromptForInterests(token: string) {
  try {
    const status = await fetchInterestStatus(token);
    return Boolean(status?.should_prompt);
  } catch {
    return false;
  }
}
