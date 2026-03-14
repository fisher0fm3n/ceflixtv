// script.ts
export function formatViews(views: string) {
  const v = Number(views);
  if (!Number.isFinite(v)) return views || "0";
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

export function timeSinceUnix(unix: number | string) {
  const ts =
    typeof unix === "string" ? parseInt(unix, 10) * 1000 : unix * 1000;

  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);

  const fmt = (n: number, unit: string) =>
    `${n} ${unit}${n === 1 ? "" : "s"} ago`;

  if (minutes < 1) return "Just now";
  if (minutes < 60) return fmt(minutes, "minute");

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return fmt(hours, "hour");

  const days = Math.floor(hours / 24);
  if (days < 7) return fmt(days, "day");

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return fmt(weeks, "week");

  const months = Math.floor(days / 30);
  if (months < 12) return fmt(months, "month");

  const years = Math.floor(days / 365);
  return fmt(years, "year");
}