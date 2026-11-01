"use client";

import { useState } from "react";
import { weekdayNames, type TimeRange, type WeeklyHours } from "@/config/site";
import { getSupabase } from "@/lib/supabase";
import { refreshPublicHours } from "./data";
import RangesEditor, { cleanRanges } from "./RangesEditor";

const order = [1, 2, 3, 4, 5, 6, 0];

/** Shlomo's usual week. Customers can only book inside these; the website shows them too. */
export default function HoursEditor({ hours, onSaved }: { hours: WeeklyHours; onSaved: () => void }) {
  const db = getSupabase()!;
  const [draft, setDraft] = useState<WeeklyHours>(() => Object.fromEntries(order.map((d) => [d, hours[d] ?? []])));
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    const clean: Record<number, TimeRange[]> = {};
    for (const d of order) {
      const c = cleanRanges(draft[d], weekdayNames[d]);
      if (typeof c === "string") return setMsg(c);
      clean[d] = c;
    }
    setSaving(true);
    setMsg(null);
    const results = await Promise.all(
      order.map((d) => db.from("opening_hours").update({ ranges: clean[d], updated_at: new Date().toISOString() }).eq("weekday", d)),
    );
    if (results.some((r) => r.error)) {
      setSaving(false);
      return setMsg("Couldn't save. Try again.");
    }
    await refreshPublicHours();
    setDraft(clean);
    setSaving(false);
    setMsg("Saved. Customers can now book in these hours.");
    onSaved();
  }

  return (
    <section className="rounded-sm border border-line bg-coal p-5">
      <h2 className="font-semibold">Your usual week</h2>
      <p className="mt-1 text-xs text-stone">
        When you take bookings. Add several times for a day if you have gaps, e.g. 10:00 to 12:00 and 15:00 to 16:00. An end time of 00:00 means
        midnight. To change one date only, tap it in the calendar.
      </p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {order.map((d) => (
          <li key={d} className="grid gap-2 py-3 sm:grid-cols-[6rem_1fr] sm:items-start">
            <span className="pt-2 text-sm font-semibold">{weekdayNames[d]}</span>
            <RangesEditor label={weekdayNames[d]} ranges={draft[d]} onChange={(r) => setDraft({ ...draft, [d]: r })} />
          </li>
        ))}
      </ul>
      {msg && (
        <p role="status" className="mt-3 text-sm">
          {msg}
        </p>
      )}
      <button onClick={save} disabled={saving} className="btn btn-primary mt-4 min-h-11 w-full">
        {saving ? "Saving…" : "Save usual week"}
      </button>
    </section>
  );
}
