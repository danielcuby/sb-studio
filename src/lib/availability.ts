import { site, type Hours } from "@/config/site";
import { addDays, localDateKey, localDateTime, rangesOn, toMinutes, formatTime } from "./time";

export type Range = { start: Date; end: Date };
export type Slot = { time: string; startsAt: string };

export const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

const defaultHours: Hours = { weekly: site.hours, days: {} };

/** Dates customers may pick: open days from today to `maxDaysAhead`. */
export function bookableDates(now = new Date(), hours: Hours = defaultHours) {
  const today = localDateKey(now);
  const out: string[] = [];
  for (let i = 0; i <= site.booking.maxDaysAhead; i++) {
    const d = addDays(today, i);
    if (rangesOn(d, hours).length) out.push(d);
  }
  return out;
}

/** From the first opening to the last closing on a date, or null when closed. */
export function openingRange(date: string, hours: Hours = defaultHours): Range | null {
  const ranges = rangesOn(date, hours);
  if (!ranges.length) return null;
  return {
    start: localDateTime(date, toMinutes(ranges[0].open)),
    end: localDateTime(date, Math.max(...ranges.map((r) => toMinutes(r.close)))),
  };
}

/**
 * Free start times on `date` for a service of `durationMinutes`.
 * A slot is free when the whole appointment fits inside one block of working hours, starts after the
 * minimum notice, and doesn't overlap any `busy` range (existing bookings and blocked time).
 */
export function freeSlots(date: string, durationMinutes: number, busy: Range[], now = new Date(), hours: Hours = defaultHours): Slot[] {
  if (!isDateKey(date) || !bookableDates(now, hours).includes(date)) return [];
  const earliest = now.getTime() + site.booking.minNoticeMinutes * 60_000;
  const slots: Slot[] = [];

  for (const r of rangesOn(date, hours)) {
    for (let m = toMinutes(r.open); m + durationMinutes <= toMinutes(r.close); m += site.booking.slotIntervalMinutes) {
      const start = localDateTime(date, m);
      const end = new Date(start.getTime() + durationMinutes * 60_000);
      if (start.getTime() < earliest) continue;
      if (busy.some((b) => start < b.end && end > b.start)) continue;
      if (slots.some((s) => s.startsAt === start.toISOString())) continue;
      slots.push({ time: formatTime(start), startsAt: new Date(start.getTime()).toISOString() });
    }
  }
  return slots;
}
