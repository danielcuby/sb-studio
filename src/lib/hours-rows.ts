import { site, type Hours, type TimeRange } from "@/config/site";

export type WeekdayRow = { weekday: number; ranges: TimeRange[] };
export type DateRow = { date: string; ranges: TimeRange[] };

/** Database rows (`opening_hours`, `date_hours`) → Hours. Missing weekdays fall back to src/config/site.ts. */
export function rowsToHours(weekly: WeekdayRow[], dates: DateRow[]): Hours {
  const hours: Hours = { weekly: { ...site.hours }, days: {} };
  for (const r of weekly) hours.weekly[r.weekday] = r.ranges ?? [];
  for (const r of dates) hours.days[r.date] = r.ranges ?? [];
  return hours;
}
