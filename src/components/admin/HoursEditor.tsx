"use client";

import { useState } from "react";
import { weekdayNames, type WeeklyHours } from "@/config/site";
import { getSupabase } from "@/lib/supabase";
import { toMinutes } from "@/lib/time";

const order = [1, 2, 3, 4, 5, 6, 0];
const input = "rounded-sm border border-line bg-ink px-2 py-2 text-bone [color-scheme:dark] focus:border-brass focus:outline-none disabled:opacity-40";

/** Shlomo's weekly hours. Customers can only book inside these; the website shows them too. */
export default function HoursEditor({ hours, onSaved }: { hours: WeeklyHours; onSaved: (h: WeeklyHours) => void }) {
  const db = getSupabase()!;
  const [draft, setDraft] = useState(() =>
    Object.fromEntries(order.map((d) => [d, { open: !!hours[d], from: hours[d]?.open ?? "10:00", to: hours[d]?.close ?? "19:00" }])),
  );
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    for (const d of order) {
      const r = draft[d];
      if (r.open && toMinutes(r.to) <= toMinutes(r.from)) return setMsg(`${weekdayNames[d]}: closing time must be after opening time.`);
    }
    setSaving(true);
    setMsg(null);
    const results = await Promise.all(
      order.map((d) =>
        db
          .from("opening_hours")
          .update({ open_time: draft[d].open ? draft[d].from : null, close_time: draft[d].open ? draft[d].to : null, updated_at: new Date().toISOString() })
          .eq("weekday", d),
      ),
    );
    if (results.some((r) => r.error)) {
      setSaving(false);
      return setMsg("Couldn't save. Try again.");
    }
    // Refresh the public website's copy of the hours.
    const { data } = await db.auth.getSession();
    await fetch("/api/hours-updated", { method: "POST", headers: { Authorization: `Bearer ${data.session?.access_token}` } }).catch(() => {});
    setSaving(false);
    setMsg("Saved. Customers can now book in these hours.");
    onSaved(Object.fromEntries(order.map((d) => [d, draft[d].open ? { open: draft[d].from, close: draft[d].to } : null])));
  }

  return (
    <section className="rounded-sm border border-line bg-coal p-5">
      <h2 className="font-semibold">Your weekly hours</h2>
      <p className="mt-1 text-xs text-stone">When you&apos;re free to take bookings. For one-off days off, use &ldquo;Block off time&rdquo;.</p>
      <ul className="mt-4 grid gap-2 text-sm">
        {order.map((d) => {
          const r = draft[d];
          const set = (patch: Partial<typeof r>) => setDraft({ ...draft, [d]: { ...r, ...patch } });
          return (
            <li key={d} className="grid grid-cols-[6.5rem_1fr] items-center gap-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={r.open} onChange={(e) => set({ open: e.target.checked })} className="accent-[var(--color-brass)]" />
                {weekdayNames[d].slice(0, 3)}
              </label>
              {r.open ? (
                <span className="flex items-center gap-1.5">
                  <input type="time" step={900} value={r.from} onChange={(e) => set({ from: e.target.value })} className={input} aria-label={`${weekdayNames[d]} opens`} />
                  –
                  <input type="time" step={900} value={r.to} onChange={(e) => set({ to: e.target.value })} className={input} aria-label={`${weekdayNames[d]} closes`} />
                </span>
              ) : (
                <span className="text-stone">Closed</span>
              )}
            </li>
          );
        })}
      </ul>
      {msg && (
        <p role="status" className="mt-3 text-sm">
          {msg}
        </p>
      )}
      <button onClick={save} disabled={saving} className="btn btn-primary mt-4 min-h-11 w-full">
        {saving ? "Saving…" : "Save hours"}
      </button>
    </section>
  );
}
