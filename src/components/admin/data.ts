"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

export type Booking = {
  id: string;
  service_id: string;
  service_name: string;
  price_gbp: number;
  duration_minutes: number;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  notes: string | null;
  status: "confirmed" | "completed" | "no_show" | "cancelled";
  source: "online" | "admin";
  cancelled_by_customer: boolean;
};
export type Blocked = { id: string; starts_at: string; ends_at: string; reason: string | null };

export const inputCls = "mt-1 block w-full rounded-sm border border-line bg-ink px-3 py-2.5 text-bone focus:border-brass focus:outline-none";

/**
 * Runs `load` whenever `key` changes. While a new key loads, the previous data stays on screen
 * (so saving something doesn't flash the page empty); `loading` says it's out of date.
 */
export function useLoad<T>(key: string, load: () => Promise<T>) {
  const [res, setRes] = useState<{ key: string; data?: T; error?: boolean }>({ key: "" });
  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setRes({ key, data }),
      () => live && setRes((r) => ({ key, data: r.data, error: true })),
    );
    return () => {
      live = false;
    };
    // `load` is a new function every render; `key` says when it needs to run again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { data: res.data, loading: res.key !== key, error: res.key === key && !!res.error };
}

/** Throws on a Supabase error so useLoad can show it. */
export async function must<T>(q: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await q;
  if (error) throw error;
  return data as T;
}

/** Tell the public website its copy of the hours is out of date. */
export async function refreshPublicHours() {
  const db = getSupabase()!;
  const { data } = await db.auth.getSession();
  await fetch("/api/hours-updated", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token}` } }).catch(() => {});
}
