import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { site, type Hours } from "@/config/site";
import { getSupabase } from "./supabase";
import { rowsToHours } from "./hours-rows";
import { addDays, localDateKey } from "./time";

const fallback: Hours = { weekly: site.hours, days: {} };

/**
 * Opening hours as set by Shlomo in /admin: his usual week plus changes for specific dates.
 * Cached and refreshed when he saves (tag "hours"). Falls back to the defaults in src/config/site.ts
 * if the database isn't reachable.
 */
export async function getHours(): Promise<Hours> {
  "use cache";
  cacheTag("hours");
  cacheLife("days");
  const db = getSupabase();
  if (!db) return fallback;
  const [weekly, dates] = await Promise.all([
    db.from("opening_hours").select("weekday, ranges"),
    db.from("date_hours").select("date, ranges").gte("date", addDays(localDateKey(), -2)),
  ]);
  if (weekly.error || dates.error || !weekly.data || !dates.data) {
    console.error("Couldn't load opening hours, using defaults", weekly.error ?? dates.error);
    return fallback;
  }
  return rowsToHours(weekly.data, dates.data);
}
