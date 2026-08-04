// app/lib/quality.ts
//
// Selectable video qualities, as served by POST /api/video on the `qualities`
// key of the video object. See CeFlix-API `docs/video-quality.md`.
//
// The API sends the ladder smallest first, plus two special cases:
//   - videos uploaded before the ladder shipped get a single entry labelled
//     "Auto" with zeroed dimensions, pointing at their one existing URL
//   - live streams get an empty array (hlsPlayBack already adapts)

export type Quality = {
  label: string;
  width: number;
  height: number;
  bitrate_kbps: number;
  url: string;
};

// Shared with the Expo app's `kingsspace.preferred_quality` in spirit, but the
// web app has its own storage so the two never fight over one key.
const STORAGE_KEY = "ceflix.preferred_quality";

// The rung the API points `video_tbl.url` at — the sensible default when the
// viewer has no stored preference and nothing better is known.
const DEFAULT_LABEL = "720p";

/**
 * Sentinel for "let the player choose". Lowercase so it can never collide with
 * the API's own "Auto" label, which pre-ladder videos use for their single
 * real rendition.
 */
export const AUTO_LABEL = "auto";

const toInt = (v: unknown) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Defensive parse of whatever the API returned. Entries without a usable URL
 * are dropped: an unplayable menu row is worse than a missing one.
 *
 * Returned smallest first, matching the API's own ordering.
 */
export function normalizeQualities(raw: unknown): Quality[] {
  if (!Array.isArray(raw)) return [];

  const out: Quality[] = [];

  for (const item of raw) {
    if (!item || typeof item !== "object") continue;

    const url = String((item as any).url ?? "").trim();
    const label = String((item as any).label ?? "").trim();
    if (!url || !label) continue;

    out.push({
      label,
      url,
      width: toInt((item as any).width),
      height: toInt((item as any).height),
      bitrate_kbps: toInt((item as any).bitrate_kbps),
    });
  }

  // "Auto" carries zeroed dimensions, so fall back to bitrate to keep the
  // ordering stable rather than relying on height alone.
  out.sort((a, b) => a.height - b.height || a.bitrate_kbps - b.bitrate_kbps);

  return out;
}

/** Highest first — the order the menu renders in. */
export function qualitiesForMenu(qualities: Quality[]): Quality[] {
  return [...qualities].reverse();
}

/* ------------------------------------------------------------------ *
 * Auto
 *
 * These are four separate MP4s, not an HLS ladder, so nothing adapts on
 * its own — "Auto" is the player picking a rung from what the browser
 * will tell us and then correcting itself when playback stalls.
 * ------------------------------------------------------------------ */

export type AutoContext = {
  /** navigator.connection.downlink, in Mbps. Null where unsupported. */
  downlinkMbps?: number | null;
  /** navigator.connection.saveData — an explicit "send me less" from the user. */
  saveData?: boolean;
  /** Rendered width of the player in CSS pixels. */
  displayWidth?: number | null;
  devicePixelRatio?: number | null;
};

/**
 * What the browser is willing to say about the connection and the display.
 *
 * The Network Information API is Chromium-only; Safari and Firefox report
 * nothing, which `autoQualityIndex` handles by staying conservative.
 */
export function readAutoContext(el?: HTMLElement | null): AutoContext {
  const conn =
    typeof navigator !== "undefined"
      ? ((navigator as any).connection ??
        (navigator as any).mozConnection ??
        (navigator as any).webkitConnection)
      : null;

  const width =
    el?.getBoundingClientRect().width ||
    (typeof window !== "undefined" ? window.innerWidth : 0);

  return {
    downlinkMbps: typeof conn?.downlink === "number" ? conn.downlink : null,
    saveData: !!conn?.saveData,
    displayWidth: width || null,
    devicePixelRatio:
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1,
  };
}

/**
 * Index into `qualities` (smallest first) that Auto should play.
 *
 * Two independent ceilings, and the lower one wins:
 *
 *  - **display** — no point pushing 1080p into a 640px-wide player
 *  - **bandwidth** — the rung's bitrate has to fit inside the measured
 *    downlink with headroom to spare
 *
 * With no connection data the bandwidth ceiling falls back to 720p, which is
 * what single-URL clients already get, so Auto is never a downgrade on the
 * browsers that tell us nothing.
 */
export function autoQualityIndex(
  qualities: Quality[],
  ctx: AutoContext,
): number {
  if (!qualities.length) return -1;

  const last = qualities.length - 1;

  // An explicit data-saver setting outranks anything we could infer.
  if (ctx.saveData) return 0;

  // Display ceiling: the smallest rung that still covers the rendered size.
  // 0.9 leaves a little slack so a 1280px player isn't nudged to 1080p.
  let displayCap = last;
  const width = ctx.displayWidth ?? 0;
  const dpr = ctx.devicePixelRatio || 1;

  if (width > 0) {
    const targetHeight = ((width * dpr) / 16) * 9;
    const idx = qualities.findIndex((q) => q.height >= targetHeight * 0.9);
    displayCap = idx === -1 ? last : idx;
  }

  // Bandwidth ceiling: 60% of the reported downlink, since `downlink` is a
  // rounded estimate and the connection has other work to do.
  let bandwidthCap: number;
  const downlink = ctx.downlinkMbps ?? 0;

  if (downlink > 0) {
    const usableKbps = downlink * 1000 * 0.6;
    let idx = -1;
    for (let i = 0; i < qualities.length; i++) {
      if (qualities[i].bitrate_kbps <= usableKbps) idx = i;
    }
    bandwidthCap = idx === -1 ? 0 : idx;
  } else {
    const fallback = qualities.findIndex((q) => q.label === DEFAULT_LABEL);
    bandwidthCap = fallback === -1 ? last : fallback;
  }

  return Math.max(0, Math.min(displayCap, bandwidthCap));
}

export function pickAutoQuality(
  qualities: Quality[],
  ctx: AutoContext,
): Quality | null {
  const idx = autoQualityIndex(qualities, ctx);
  return idx < 0 ? null : qualities[idx];
}

export function readPreferredQuality(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storePreferredQuality(label: string) {
  try {
    localStorage.setItem(STORAGE_KEY, label);
  } catch {}
}

/**
 * Which mode the menu opens in: a remembered rung, or Auto.
 *
 * Auto is the default — a viewer who has never touched the menu gets the
 * player's own choice rather than a fixed rung.
 */
export function resolveInitialSelection(
  qualities: Quality[],
  remembered: string | null,
): string {
  if (qualities.length === 1) return qualities[0].label;

  if (
    remembered &&
    remembered !== AUTO_LABEL &&
    qualities.some((q) => q.label === remembered)
  ) {
    return remembered;
  }

  return AUTO_LABEL;
}

/**
 * The rung playback actually starts on: remembered choice (if this video has
 * it) → Auto's pick → 720p → highest available.
 *
 * Someone on a capped data plan pins a rung once and every later video honours
 * it; everyone else gets Auto.
 */
export function resolveInitialQuality(
  qualities: Quality[],
  remembered: string | null,
  ctx?: AutoContext,
): Quality | null {
  if (!qualities.length) return null;
  if (qualities.length === 1) return qualities[0];

  if (remembered && remembered !== AUTO_LABEL) {
    const match = qualities.find((q) => q.label === remembered);
    if (match) return match;
  }

  const auto = pickAutoQuality(qualities, ctx ?? {});
  if (auto) return auto;

  const preferred = qualities.find((q) => q.label === DEFAULT_LABEL);
  if (preferred) return preferred;

  return qualities[qualities.length - 1];
}

/** What the menu row reads, e.g. "1080p HD". */
export function qualityDisplayLabel(q: Quality): string {
  return q.height >= 720 ? `${q.label} HD` : q.label;
}

/** The Auto row, showing what it settled on: "Auto (720p)". */
export function autoDisplayLabel(active: Quality | null): string {
  return active ? `Auto (${active.label})` : "Auto";
}
