import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { site, type WeeklyHours } from "@/config/site";
import { getSupabase } from "./supabase";

type Row = { weekday: number; open_time: string | null; close_time: string | null };

/** "10:00:00" → "10:00" */
const hhmm = (t: string) => t.slice(0, 5);

export function rowsToHours(rows: Row[]): WeeklyHours {
  const hours: WeeklyHours = { ...site.hours };
  for (const r of rows) hours[r.weekday] = r.open_time && r.close_time ? { open: hhmm(r.open_time), close: hhmm(r.close_time) } : null;
  return hours;
}

/**
 * Weekly opening hours, as set by Shlomo in /admin. Cached and refreshed when he saves
 * (tag "hours"). Falls back to the defaults in src/config/site.ts if the database isn't reachable.
 */
export async function getHours(): Promise<WeeklyHours> {
  "use cache";
  cacheTag("hours");
  cacheLife("days");
  const db = getSupabase();
  if (!db) return site.hours;
  const { data, error } = await db.from("opening_hours").select("weekday, open_time, close_time");
  if (error || !data) {
    console.error("Couldn't load opening hours, using defaults", error);
    return site.hours;
  }
  return rowsToHours(data);
}
