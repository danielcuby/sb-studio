import { TZDate } from "@date-fns/tz";
import { site, type Hours, type TimeRange } from "@/config/site";

const tz = site.timezone;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;

/** Date at a local Gibraltar wall-clock time. `date` is "YYYY-MM-DD". */
export function localDateTime(date: string, minutes: number) {
  const [y, mo, d] = date.split("-").map(Number);
  return new TZDate(y, mo - 1, d, Math.floor(minutes / 60), minutes % 60, tz);
}

/** "YYYY-MM-DD" for an instant, in Gibraltar time. */
export function localDateKey(instant: Date = new Date()) {
  const t = new TZDate(instant, tz);
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}

/** Weekday (0 = Sunday) for a "YYYY-MM-DD" date. */
export function weekdayOf(date: string) {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

export function addDays(date: string, days: number) {
  const [y, mo, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d + days));
  return t.toISOString().slice(0, 10);
}

export function formatTime(instant: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(new Date(instant));
}

export function formatDateLong(instant: Date | string) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(
    new Date(instant),
  );
}

/** "24:00" (midnight as a closing time) reads as "00:00". */
export const displayTime = (hhmm: string) => (hhmm === "24:00" ? "00:00" : hhmm);

/** "10:00–12:00, 15:00–16:00", or "Closed". */
export const describeRanges = (ranges: TimeRange[], sep = "–") =>
  ranges.length ? ranges.map((r) => `${r.open}${sep}${displayTime(r.close)}`).join(", ") : "Closed";

/** Working blocks on a date: that date's own hours if Shlomo set any, otherwise the usual weekday hours. Sorted. */
export function rangesOn(date: string, hours: Hours): TimeRange[] {
  const ranges = hours.days[date] ?? hours.weekly[weekdayOf(date)] ?? [];
  return [...ranges].sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
}

/** Human status line, e.g. "Open now until 19:00" or "Opens Monday at 10:00". */
export function openStatus(now: Date = new Date(), hours: Hours = { weekly: site.hours, days: {} }) {
  const today = localDateKey(now);
  const t = new TZDate(now, tz);
  const nowMins = t.getHours() * 60 + t.getMinutes();
  const todays = rangesOn(today, hours);
  const current = todays.find((r) => nowMins >= toMinutes(r.open) && nowMins < toMinutes(r.close));
  if (current) return { open: true, text: `Open now until ${displayTime(current.close)}` };
  const later = todays.find((r) => nowMins < toMinutes(r.open));
  if (later) return { open: false, text: `Opens today at ${later.open}` };
  for (let i = 1; i <= 14; i++) {
    const day = addDays(today, i);
    const next = rangesOn(day, hours)[0];
    if (next) {
      const name = i === 1 ? "tomorrow" : new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(day));
      return { open: false, text: `Opens ${name} at ${next.open}` };
    }
  }
  return { open: false, text: "Closed" };
}
