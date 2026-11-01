"use client";

import { useState } from "react";
import { services, getService, formatPrice } from "@/config/services";
import { weekdayNames, type Hours, type TimeRange } from "@/config/site";
import { addDays, describeRanges, formatDateLong, formatTime, localDateKey, localDateTime, rangesOn, toMinutes, weekdayOf } from "@/lib/time";
import { getSupabase } from "@/lib/supabase";
import BookingCard from "./BookingCard";
import { inputCls, refreshPublicHours, type Blocked, type Booking } from "./data";
import RangesEditor, { cleanRanges } from "./RangesEditor";

/** One day: its working hours (changeable for this date only), blocked time and bookings. */
export default function DayPanel({
  day,
  hours,
  bookings,
  blocked,
  loading,
  onBookingsChanged,
  onHoursChanged,
}: {
  day: string;
  hours: Hours;
  bookings: Booking[];
  blocked: Blocked[];
  loading: boolean;
  onBookingsChanged: () => void;
  onHoursChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const ranges = rangesOn(day, hours);
  const special = day in hours.days;
  const today = localDateKey();
  const active = bookings.filter((b) => b.status !== "cancelled");
  const takings = bookings.filter((b) => b.status === "completed").reduce((n, b) => n + Number(b.price_gbp), 0);
  const dayStart = localDateTime(day, 0);
  const dayEnd = localDateTime(addDays(day, 1), 0);
  const blocks = blocked.filter((t) => new Date(t.starts_at) < dayEnd && new Date(t.ends_at) > dayStart);

  return (
    <div>
      {(day === today || day === addDays(today, 1)) && (
        <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-brass">{day === today ? "Today" : "Tomorrow"}</p>
      )}
      <h2 className="font-display text-5xl font-extrabold uppercase">{formatDateLong(`${day}T12:00:00Z`)}</h2>

      <DayHours key={`${day}|${JSON.stringify(ranges)}`} day={day} ranges={ranges} special={special} bookings={active} onSaved={onHoursChanged} />

      {blocks.length > 0 && (
        <ul className="mt-3 grid gap-2 text-sm">
          {blocks.map((t) => (
            <li key={t.id} className="rounded-sm border border-dashed border-line px-4 py-2.5 text-stone">
              Blocked {formatTime(new Date(Math.max(+new Date(t.starts_at), +dayStart)))}–
              {new Date(t.ends_at) >= dayEnd ? "end of day" : formatTime(t.ends_at)}
              {t.reason ? ` · ${t.reason}` : ""}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 flex items-baseline justify-between gap-4">
        <h3 className="font-sans text-lg font-semibold">
          {active.length} booking{active.length === 1 ? "" : "s"}
        </h3>
        {takings > 0 && <span className="text-sm text-stone">{formatPrice(takings)} taken (marked done)</span>}
      </div>
      {error && (
        <p role="alert" className="mt-3 rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}
      <ul className={`mt-3 grid gap-3 transition-opacity ${loading ? "opacity-60" : ""}`}>
        {loading && bookings.length === 0 && <li className="h-24 animate-pulse rounded-sm bg-coal" />}
        {!loading && bookings.length === 0 && (
          <li className="rounded-sm border border-dashed border-line p-6 text-center text-stone">No bookings this day.</li>
        )}
        {bookings.map((b) => (
          <BookingCard key={b.id} b={b} onChanged={onBookingsChanged} onError={setError} />
        ))}
      </ul>

      <AddBooking key={day} day={day} onDone={onBookingsChanged} />
    </div>
  );
}

function DayHours({ day, ranges, special, bookings, onSaved }: { day: string; ranges: TimeRange[]; special: boolean; bookings: Booking[]; onSaved: () => void }) {
  const db = getSupabase()!;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(ranges);
  const [msg, setMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const weekday = weekdayNames[weekdayOf(day)];

  // Bookings that would fall outside the new hours. They stay booked; Shlomo decides what to do.
  const clean = cleanRanges(draft, "This day");
  const outside =
    typeof clean === "string"
      ? []
      : bookings.filter((b) => {
          const s = toMinutes(formatTime(b.starts_at));
          return !clean.some((r) => toMinutes(r.open) <= s && s + b.duration_minutes <= toMinutes(r.close));
        });

  async function run(change: () => PromiseLike<{ error: unknown }>) {
    setSaving(true);
    setMsg(null);
    const { error } = await change();
    if (error) {
      setSaving(false);
      return setMsg("Couldn't save. Try again.");
    }
    await refreshPublicHours();
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  const save = () => {
    if (typeof clean === "string") return setMsg(clean);
    run(() => db.from("date_hours").upsert({ date: day, ranges: clean, updated_at: new Date().toISOString() }));
  };
  const useUsual = () => run(() => db.from("date_hours").delete().eq("date", day));

  return (
    <section className="mt-5 rounded-sm border border-line bg-coal p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone">Taking bookings</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">{describeRanges(ranges)}</p>
          <p className="text-xs text-stone">{special ? "Changed for this date only" : `Your usual ${weekday} hours`}</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="rounded-full border border-brass/60 px-4 py-2 text-sm text-brass-bright hover:bg-brass/10">
            Change this day
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-4 border-t border-line pt-4">
          <RangesEditor label="This day" ranges={draft} onChange={setDraft} />
          <p className="mt-2 text-xs text-stone">Only changes this date. An end time of 00:00 means midnight.</p>
          {outside.length > 0 && (
            <p className="mt-3 rounded-sm border border-brass/40 bg-brass/10 px-3 py-2 text-sm">
              {outside.length} booking{outside.length === 1 ? " is" : "s are"} outside these hours (
              {outside.map((b) => `${formatTime(b.starts_at)} ${b.customer_name}`).join(", ")}). They stay booked. Cancel or message them if needed.
            </p>
          )}
          {msg && (
            <p role="status" className="mt-3 text-sm">
              {msg}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={save} disabled={saving} className="btn btn-primary min-h-11">
              {saving ? "Saving…" : draft.length ? "Save for this day" : "Save: closed this day"}
            </button>
            {draft.length > 0 && (
              <button onClick={() => setDraft([])} className="rounded-full border border-line px-4 text-sm hover:border-bone">
                Day off
              </button>
            )}
            {special && (
              <button onClick={useUsual} disabled={saving} className="rounded-full border border-line px-4 text-sm hover:border-bone">
                Back to usual {weekday}
              </button>
            )}
            <button
              onClick={() => {
                setEditing(false);
                setDraft(ranges);
                setMsg(null);
              }}
              className="px-2 text-sm text-stone underline underline-offset-4 hover:text-bone"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function AddBooking({ day, onDone }: { day: string; onDone: () => void }) {
  const db = getSupabase()!;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ service: services[0].id, time: "10:00", name: "", phone: "" });
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="mt-6 rounded-sm border border-line bg-coal p-4 sm:p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between font-semibold" aria-expanded={open}>
        Add a booking on this day <span className="text-brass">{open ? "–" : "+"}</span>
      </button>
      <p className="mt-1 text-xs text-stone">For bookings made by phone or in person.</p>
      {open && (
        <form
          className="mt-4 grid gap-3 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const s = getService(f.service)!;
            const start = localDateTime(day, toMinutes(f.time));
            const { error } = await db.from("bookings").insert({
              service_id: s.id,
              service_name: s.name,
              price_gbp: s.price,
              duration_minutes: s.durationMinutes,
              starts_at: start.toISOString(),
              ends_at: new Date(start.getTime() + s.durationMinutes * 60_000).toISOString(),
              customer_name: f.name,
              customer_phone: f.phone,
              source: "admin",
            });
            setMsg(error ? (error.code === "23P01" ? "That time overlaps another booking." : "Couldn't add the booking. Check the details.") : "Booking added.");
            if (!error) {
              setF({ ...f, name: "", phone: "" });
              onDone();
            }
          }}
        >
          <div className="grid grid-cols-[1fr_7rem] gap-3">
            <label>
              Service
              <select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} className={inputCls}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.durationMinutes} min, {formatPrice(s.price)})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Time
              <input type="time" required step={300} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={`${inputCls} [color-scheme:dark]`} />
            </label>
          </div>
          <label>
            Name
            <input required minLength={1} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={inputCls} />
          </label>
          <label>
            Phone
            <input required minLength={6} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={inputCls} />
          </label>
          {msg && <p role="status">{msg}</p>}
          <button className="btn btn-primary min-h-11">Add booking</button>
        </form>
      )}
    </section>
  );
}
