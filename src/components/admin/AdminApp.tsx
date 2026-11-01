"use client";

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { services, getService, formatPrice } from "@/config/services";
import { site } from "@/config/site";
import { addDays, formatDateLong, formatTime, localDateKey, localDateTime, toMinutes } from "@/lib/time";
import { openingRange } from "@/lib/availability";
import { ChevronIcon, PhoneIcon, WhatsAppIcon } from "../icons";

type Booking = {
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
};
type Blocked = { id: string; starts_at: string; ends_at: string; reason: string | null };

const input = "mt-1 block w-full rounded-sm border border-line bg-ink px-3 py-2.5 text-bone focus:border-brass focus:outline-none";
const statusLabel: Record<Booking["status"], string> = {
  confirmed: "Booked",
  completed: "Done",
  no_show: "No-show",
  cancelled: "Cancelled",
};

export default function AdminApp() {
  const db = getSupabase();
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [adminCheck, setAdminCheck] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const userId = session?.user.id;
  const isAdmin = adminCheck && adminCheck.userId === userId ? adminCheck.isAdmin : null;

  useEffect(() => {
    if (!db) return;
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [db]);

  useEffect(() => {
    if (!db || !userId) return;
    db.rpc("is_admin").then(({ data }) => setAdminCheck({ userId, isAdmin: Boolean(data) }));
  }, [db, userId]);

  if (!supabaseConfigured || !db) {
    return <Panel title="Not set up">Add the Supabase keys to the environment variables to use the admin dashboard. See README.md.</Panel>;
  }
  if (session === undefined) return <p className="text-stone">Loading…</p>;
  if (!session) return <Login />;
  if (isAdmin === null) return <p className="text-stone">Checking access…</p>;
  if (!isAdmin) {
    return (
      <Panel title="No access">
        <p>{session.user.email} isn&apos;t an admin. Ask the owner to run `npm run admin:add` for this email.</p>
        <button className="btn btn-ghost mt-5" onClick={() => db.auth.signOut()}>
          Sign out
        </button>
      </Panel>
    );
  }
  return <Dashboard email={session.user.email ?? ""} />;
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md rounded-sm border border-line bg-coal p-8">
      <h1 className="font-display text-4xl font-extrabold uppercase">{title}</h1>
      <div className="mt-4 text-bone/85">{children}</div>
    </div>
  );
}

function Login() {
  const db = getSupabase()!;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <Panel title="Admin sign in">
      <form
        className="grid gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const { error } = await db.auth.signInWithPassword({ email, password });
          if (error) setError("Email or password is wrong.");
          setBusy(false);
        }}
      >
        <label className="text-sm font-semibold">
          Email
          <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={input} />
        </label>
        <label className="text-sm font-semibold">
          Password
          <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={input} />
        </label>
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button className="btn btn-primary" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </Panel>
  );
}

function Dashboard({ email }: { email: string }) {
  const db = getSupabase()!;
  const [day, setDay] = useState(() => localDateKey());
  const [view, setView] = useState<"day" | "upcoming">("day");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [blocked, setBlocked] = useState<Blocked[]>([]);
  const [loadedKey, setLoadedKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reloads, setReloads] = useState(0);
  const key = `${view}|${day}|${reloads}`;
  const loading = loadedKey.split("|").slice(0, 2).join("|") !== `${view}|${day}`;
  const load = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    let current = true;
    const from = view === "day" ? localDateTime(day, 0) : new Date();
    const to = view === "day" ? localDateTime(addDays(day, 1), 0) : new Date(Date.now() + 60 * 86_400_000);
    Promise.all([
      db.from("bookings").select("*").gte("starts_at", from.toISOString()).lt("starts_at", to.toISOString()).order("starts_at"),
      db.from("blocked_times").select("*").gte("ends_at", new Date().toISOString()).order("starts_at"),
    ]).then(([b, t]) => {
      if (!current) return;
      setError(b.error || t.error ? "Couldn't load bookings. Refresh to try again." : null);
      setBookings((b.data as Booking[]) ?? []);
      setBlocked((t.data as Blocked[]) ?? []);
      setLoadedKey(key);
    });
    return () => {
      current = false;
    };
  }, [db, day, view, key]);

  async function setStatus(b: Booking, status: Booking["status"]) {
    if (status === "cancelled" && !confirm(`Cancel ${b.customer_name}'s booking at ${formatTime(b.starts_at)}? The slot opens up again.`)) return;
    const { error } = await db.from("bookings").update({ status }).eq("id", b.id);
    if (error) setError(error.code === "23P01" ? "That time now overlaps another booking." : "Couldn't update the booking.");
    load();
  }

  const active = bookings.filter((b) => b.status !== "cancelled");
  const takings = bookings.filter((b) => b.status === "completed").reduce((n, b) => n + Number(b.price_gbp), 0);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex rounded-full border border-line p-1">
            {(["day", "upcoming"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`rounded-full px-4 py-1.5 text-sm transition ${view === v ? "bg-brass font-semibold text-ink" : "text-stone hover:text-bone"}`}
              >
                {v === "day" ? "Day" : "Next 60 days"}
              </button>
            ))}
          </div>
          {view === "day" && (
            <div className="flex items-center gap-2">
              <button onClick={() => setDay(addDays(day, -1))} className="grid size-10 place-items-center rounded-full border border-line hover:border-brass" aria-label="Previous day">
                <ChevronIcon direction="left" className="size-4" />
              </button>
              <input type="date" value={day} onChange={(e) => e.target.value && setDay(e.target.value)} className="rounded-sm border border-line bg-coal px-3 py-2 text-sm [color-scheme:dark]" />
              <button onClick={() => setDay(addDays(day, 1))} className="grid size-10 place-items-center rounded-full border border-line hover:border-brass" aria-label="Next day">
                <ChevronIcon className="size-4" />
              </button>
              <button onClick={() => setDay(localDateKey())} className="text-sm text-brass-bright underline underline-offset-4">
                Today
              </button>
            </div>
          )}
        </div>

        <h1 className="mt-8 font-display text-5xl font-extrabold uppercase">
          {view === "day" ? formatDateLong(`${day}T12:00:00Z`) : "Upcoming"}
        </h1>
        <p className="mt-2 text-sm text-stone">
          {active.length} booking{active.length === 1 ? "" : "s"}
          {view === "day" && !openingRange(day) ? ". Closed this day." : ""}
          {takings ? `. ${formatPrice(takings)} taken (marked done).` : ""}
        </p>
        {error && (
          <p role="alert" className="mt-4 rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
            {error}
          </p>
        )}

        <ul className="mt-6 grid gap-3">
          {loading && <li className="h-24 animate-pulse rounded-sm bg-coal" />}
          {!loading && bookings.length === 0 && <li className="rounded-sm border border-dashed border-line p-8 text-center text-stone">No bookings.</li>}
          {!loading &&
            bookings.map((b) => (
              <li key={b.id} className={`rounded-sm border border-line bg-coal p-5 ${b.status === "cancelled" ? "opacity-50" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-3xl font-bold tabular-nums">
                      {view === "upcoming" && <span className="mr-2 text-xl text-stone">{formatDateLong(b.starts_at)}</span>}
                      {formatTime(b.starts_at)}–{formatTime(b.ends_at)}
                    </p>
                    <p className="mt-1 font-semibold">
                      {b.customer_name} <span className="font-normal text-stone">· {b.service_name}, {formatPrice(Number(b.price_gbp))}</span>
                    </p>
                    {b.notes && <p className="mt-1 text-sm text-bone/80">“{b.notes}”</p>}
                    <p className="mt-2 flex flex-wrap gap-4 text-sm">
                      <a className="inline-flex items-center gap-1.5 text-brass-bright" href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}`} target="_blank" rel="noopener">
                        <WhatsAppIcon className="size-4" /> {b.customer_phone}
                      </a>
                      <a className="inline-flex items-center gap-1.5 text-stone hover:text-bone" href={`tel:${b.customer_phone.replace(/[^\d+]/g, "")}`}>
                        <PhoneIcon className="size-4" /> Call
                      </a>
                      {b.customer_email && <a className="text-stone hover:text-bone" href={`mailto:${b.customer_email}`}>{b.customer_email}</a>}
                    </p>
                  </div>
                  <span className="rounded-full border border-line px-3 py-1 text-xs">
                    {statusLabel[b.status]}
                    {b.source === "admin" ? " · added by you" : ""}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  {b.status !== "completed" && b.status !== "cancelled" && (
                    <button onClick={() => setStatus(b, "completed")} className="rounded-full bg-brass px-4 py-1.5 font-semibold text-ink hover:bg-brass-bright">
                      Mark done
                    </button>
                  )}
                  {b.status === "confirmed" && (
                    <button onClick={() => setStatus(b, "no_show")} className="rounded-full border border-line px-4 py-1.5 hover:border-bone">
                      No-show
                    </button>
                  )}
                  {b.status !== "cancelled" ? (
                    <button onClick={() => setStatus(b, "cancelled")} className="rounded-full border border-danger/50 px-4 py-1.5 text-danger hover:bg-danger/10">
                      Cancel
                    </button>
                  ) : (
                    <button onClick={() => setStatus(b, "confirmed")} className="rounded-full border border-line px-4 py-1.5 hover:border-bone">
                      Restore
                    </button>
                  )}
                </div>
              </li>
            ))}
        </ul>
      </div>

      <div className="grid h-fit gap-6">
        <AddBooking key={day} defaultDay={day} onDone={load} />
        <BlockTime key={`block-${day}`} blocked={blocked} defaultDay={day} onDone={load} />
        <p className="text-sm text-stone">
          Signed in as {email}.{" "}
          <button onClick={() => db.auth.signOut()} className="underline underline-offset-4 hover:text-bone">
            Sign out
          </button>
        </p>
      </div>
    </div>
  );
}

function AddBooking({ defaultDay, onDone }: { defaultDay: string; onDone: () => void }) {
  const db = getSupabase()!;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ service: services[0].id, date: defaultDay, time: "10:00", name: "", phone: "" });
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-sm border border-line bg-coal p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between font-semibold" aria-expanded={open}>
        Add a booking <span className="text-brass">{open ? "–" : "+"}</span>
      </button>
      {open && (
        <form
          className="mt-4 grid gap-3 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const s = getService(f.service)!;
            const start = localDateTime(f.date, toMinutes(f.time));
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
          <label>
            Service
            <select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })} className={input}>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.durationMinutes} min, {formatPrice(s.price)})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label>
              Day
              <input type="date" required value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={`${input} [color-scheme:dark]`} />
            </label>
            <label>
              Time
              <input type="time" required step={300} value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={`${input} [color-scheme:dark]`} />
            </label>
          </div>
          <label>
            Name
            <input required minLength={1} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} />
          </label>
          <label>
            Phone
            <input required minLength={6} type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={input} />
          </label>
          {msg && <p role="status">{msg}</p>}
          <button className="btn btn-primary min-h-11">Add booking</button>
        </form>
      )}
    </section>
  );
}

function BlockTime({ blocked, defaultDay, onDone }: { blocked: Blocked[]; defaultDay: string; onDone: () => void }) {
  const db = getSupabase()!;
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ from: defaultDay, to: defaultDay, wholeDay: true, start: "13:00", end: "14:00", reason: "" });
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-sm border border-line bg-coal p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between font-semibold" aria-expanded={open}>
        Block off time <span className="text-brass">{open ? "–" : "+"}</span>
      </button>
      <p className="mt-1 text-xs text-stone">Holidays, breaks, or anything else. Customers can&apos;t book blocked time.</p>
      {open && (
        <form
          className="mt-4 grid gap-3 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const start = f.wholeDay ? localDateTime(f.from, 0) : localDateTime(f.from, toMinutes(f.start));
            const end = f.wholeDay ? localDateTime(addDays(f.to, 1), 0) : localDateTime(f.from, toMinutes(f.end));
            if (end <= start) return setMsg("The end must be after the start.");
            const { error } = await db.from("blocked_times").insert({ starts_at: start.toISOString(), ends_at: end.toISOString(), reason: f.reason || null });
            setMsg(error ? "Couldn't save. Try again." : "Time blocked.");
            if (!error) onDone();
          }}
        >
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={f.wholeDay} onChange={(e) => setF({ ...f, wholeDay: e.target.checked })} className="accent-[var(--color-brass)]" />
            Whole days
          </label>
          {f.wholeDay ? (
            <div className="grid grid-cols-2 gap-3">
              <label>
                From
                <input type="date" required value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className={`${input} [color-scheme:dark]`} />
              </label>
              <label>
                To
                <input type="date" required value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} className={`${input} [color-scheme:dark]`} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              <label>
                Day
                <input type="date" required value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} className={`${input} [color-scheme:dark]`} />
              </label>
              <label>
                From
                <input type="time" required value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} className={`${input} [color-scheme:dark]`} />
              </label>
              <label>
                To
                <input type="time" required value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} className={`${input} [color-scheme:dark]`} />
              </label>
            </div>
          )}
          <label>
            Reason (only you see this)
            <input value={f.reason} maxLength={120} onChange={(e) => setF({ ...f, reason: e.target.value })} className={input} />
          </label>
          {msg && <p role="status">{msg}</p>}
          <button className="btn btn-primary min-h-11">Block time</button>
        </form>
      )}
      {blocked.length > 0 && (
        <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
          {blocked.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-3 py-2.5">
              <span>
                {formatDateLong(t.starts_at)} {formatTime(t.starts_at)} – {formatDateLong(t.ends_at)} {formatTime(t.ends_at)}
                {t.reason && <span className="block text-xs text-stone">{t.reason}</span>}
              </span>
              <button
                onClick={async () => {
                  await db.from("blocked_times").delete().eq("id", t.id);
                  onDone();
                }}
                className="text-xs text-danger hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-stone">Usual hours: {site.hours[1]?.open}–{site.hours[1]?.close}. Change them in src/config/site.ts.</p>
    </section>
  );
}
