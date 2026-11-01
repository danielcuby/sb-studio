import { site, type WeeklyHours } from "@/config/site";
import { addDays, localDateKey, localDateTime, toMinutes, weekdayOf, formatTime } from "./time";

export type Range = { start: Date; end: Date };
export type Slot = { time: string; startsAt: string };

export const isDateKey = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

/** Dates customers may pick: open days from today to `maxDaysAhead`. */
export function bookableDates(now = new Date(), hours: WeeklyHours = site.hours) {
  const today = localDateKey(now);
  const out: string[] = [];
  for (let i = 0; i <= site.booking.maxDaysAhead; i++) {
    const d = addDays(today, i);
    if (hours[weekdayOf(d)]) out.push(d);
  }
  return out;
}

/** Start/end of a day's opening hours, or null when closed. */
export function openingRange(date: string, hours: WeeklyHours = site.hours): Range | null {
  const h = hours[weekdayOf(date)];
  if (!h) return null;
  return { start: localDateTime(date, toMinutes(h.open)), end: localDateTime(date, toMinutes(h.close)) };
}

/**
 * Free start times on `date` for a service of `durationMinutes`.
 * A slot is free when the whole appointment fits inside opening hours, starts after the minimum notice,
 * and doesn't overlap any `busy` range (existing bookings and blocked time).
 */
export function freeSlots(
  date: string,
  durationMinutes: number,
  busy: Range[],
  now = new Date(),
  hours: WeeklyHours = site.hours,
): Slot[] {
  if (!isDateKey(date) || !bookableDates(now, hours).includes(date)) return [];
  const h = hours[weekdayOf(date)]!;
  const earliest = now.getTime() + site.booking.minNoticeMinutes * 60_000;
  const slots: Slot[] = [];

  for (let m = toMinutes(h.open); m + durationMinutes <= toMinutes(h.close); m += site.booking.slotIntervalMinutes) {
    const start = localDateTime(date, m);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    if (start.getTime() < earliest) continue;
    if (busy.some((b) => start < b.end && end > b.start)) continue;
    slots.push({ time: formatTime(start), startsAt: new Date(start.getTime()).toISOString() });
  }
  return slots;
}
