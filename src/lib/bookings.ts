import "server-only";
import { getSupabase } from "./supabase";
import { openingRange, type Range } from "./availability";

/** Busy ranges (bookings + blocked time) for one day. Customer details never leave the database. */
export async function busyRanges(date: string): Promise<Range[] | { error: string }> {
  const db = getSupabase();
  if (!db) return { error: "not_configured" };
  const day = openingRange(date);
  if (!day) return [];
  const { data, error } = await db.rpc("get_busy_ranges", { p_from: day.start.toISOString(), p_to: day.end.toISOString() });
  if (error) {
    console.error("get_busy_ranges failed", error);
    return { error: "db_error" };
  }
  return (data as { starts_at: string; ends_at: string }[]).map((r) => ({ start: new Date(r.starts_at), end: new Date(r.ends_at) }));
}
