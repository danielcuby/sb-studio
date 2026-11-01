"use client";

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, supabaseConfigured } from "@/lib/supabase";
import { site, type Hours } from "@/config/site";
import { addDays, describeRanges, formatDateLong, formatTime, localDateKey, localDateTime, rangesOn, toMinutes } from "@/lib/time";
import { rowsToHours } from "@/lib/hours-rows";
import BookingCard from "./BookingCard";
import { inputCls as input, must, useLoad, type Blocked, type Booking } from "./data";
import DayPanel from "./DayPanel";
import HoursEditor from "./HoursEditor";
import MonthCalendar, { shiftMonth } from "./MonthCalendar";
import NotificationsCard from "./NotificationsCard";

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
  return <Dashboard email={session.user.email ?? ""} userId={session.user.id} />;
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

type Tab = "calendar" | "week" | "settings";
const tabs: { id: Tab; label: string }[] = [
  { id: "calendar", label: "Calendar" },
  { id: "week", label: "Next 7 days" },
  { id: "settings", label: "Settings" },
];

const dayOf = (b: Booking) => localDateKey(new Date(b.starts_at));

function Dashboard({ email, userId }: { email: string; userId: string }) {
  const db = getSupabase()!;
  // A notification opens /admin?day=YYYY-MM-DD on the booking's day.
  const [day, setDay] = useState(() => {
    const q = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("day");
    return q && /^\d{4}-\d{2}-\d{2}$/.test(q) ? q : localDateKey();
  });
  const [month, setMonth] = useState(day.slice(0, 7));
  const [tab, setTab] = useState<Tab>("calendar");
  const [bookingsVersion, setBookingsVersion] = useState(0);
  const [hoursVersion, setHoursVersion] = useState(0);
  const reloadBookings = () => setBookingsVersion((n) => n + 1);
  const reloadHours = () => setHoursVersion((n) => n + 1);
  const today = localDateKey();

  const hoursQ = useLoad(`hours|${hoursVersion}`, async () => {
    const [weekly, dates] = await Promise.all([
      must(db.from("opening_hours").select("weekday, ranges")),
      must(db.from("date_hours").select("date, ranges")),
    ]);
    return rowsToHours(weekly, dates);
  });
  const hours: Hours = hoursQ.data ?? { weekly: site.hours, days: {} };

  // The whole visible month at once; the day panel and the counts both come from it.
  const monthQ = useLoad(`month|${month}|${bookingsVersion}`, () =>
    must<Booking[]>(
      db
        .from("bookings")
        .select("*")
        .gte("starts_at", localDateTime(`${month}-01`, 0).toISOString())
        .lt("starts_at", localDateTime(`${shiftMonth(month, 1)}-01`, 0).toISOString())
        .order("starts_at"),
    ),
  );
  const weekQ = useLoad(`week|${today}|${bookingsVersion}`, () =>
    must<Booking[]>(
      db
        .from("bookings")
        .select("*")
        .gte("starts_at", localDateTime(today, 0).toISOString())
        .lt("starts_at", localDateTime(addDays(today, 7), 0).toISOString())
        .order("starts_at"),
    ),
  );
  const blockedQ = useLoad(`blocked|${bookingsVersion}`, () =>
    must<Blocked[]>(db.from("blocked_times").select("*").gte("ends_at", new Date(Date.now() - 31 * 86_400_000).toISOString()).order("starts_at")),
  );

  const monthBookings = (monthQ.data ?? []).filter((b) => dayOf(b).startsWith(month));
  const counts: Record<string, number> = {};
  for (const b of monthBookings) if (b.status !== "cancelled") counts[dayOf(b)] = (counts[dayOf(b)] ?? 0) + 1;
  const dayLoaded = day.startsWith(month) && !monthQ.loading;
  const loadError = hoursQ.error || monthQ.error || weekQ.error || blockedQ.error;

  const openDay = (d: string) => {
    setDay(d);
    setMonth(d.slice(0, 7));
    setTab("calendar");
    // On a phone the day is under the calendar, so bring it into view.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => document.getElementById("day-panel")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  };

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 mb-8 bg-ink/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex w-full rounded-full border border-line p-1 sm:w-fit" role="tablist">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 rounded-full px-2 py-2 text-sm transition sm:flex-none sm:px-5 ${tab === t.id ? "bg-brass font-semibold text-ink" : "text-stone hover:text-bone"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loadError && (
        <p role="alert" className="mb-6 rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          Couldn&apos;t load everything. Check your connection and refresh.
        </p>
      )}

      {tab === "calendar" && (
        <div className="grid gap-10 lg:grid-cols-[26rem_minmax(0,1fr)] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <MonthCalendar
              month={month}
              onMonth={setMonth}
              selected={day}
              onSelect={openDay}
              counts={counts}
              hours={hours}
            />
          </div>
          <div id="day-panel" className="scroll-mt-24">
            <DayPanel
              day={day}
              hours={hours}
              bookings={day.startsWith(month) ? monthBookings.filter((b) => dayOf(b) === day) : []}
              blocked={blockedQ.data ?? []}
              loading={!dayLoaded}
              onBookingsChanged={reloadBookings}
              onHoursChanged={reloadHours}
            />
          </div>
        </div>
      )}

      {tab === "week" && <NextSevenDays bookings={weekQ.data} loading={weekQ.loading} hours={hours} onOpenDay={openDay} onChanged={reloadBookings} />}

      {tab === "settings" && (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="grid gap-6">
            <NotificationsCard userId={userId} />
            {hoursQ.data && <HoursEditor key={hoursVersion} hours={hoursQ.data.weekly} onSaved={reloadHours} />}
          </div>
          <div className="grid gap-6">
            <BlockTime blocked={(blockedQ.data ?? []).filter((t) => new Date(t.ends_at) > new Date())} onDone={reloadBookings} />
            <p className="text-sm text-stone">
              Signed in as {email}.{" "}
              <button onClick={() => db.auth.signOut()} className="underline underline-offset-4 hover:text-bone">
                Sign out
              </button>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function NextSevenDays({
  bookings,
  loading,
  hours,
  onOpenDay,
  onChanged,
}: {
  bookings?: Booking[];
  loading: boolean;
  hours: Hours;
  onOpenDay: (day: string) => void;
  onChanged: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const today = localDateKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const all = bookings ?? [];
  const total = all.filter((b) => b.status !== "cancelled").length;
  const weekday = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(d));
  const dayMonth = (d: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-5xl font-extrabold uppercase">Next 7 days</h1>
      <p className="mt-2 text-stone">{bookings ? `${total} booking${total === 1 ? "" : "s"}. Tap a day to open it in the calendar.` : "Loading…"}</p>
      {error && (
        <p role="alert" className="mt-4 rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
          {error}
        </p>
      )}
      <ol className={`mt-8 grid gap-8 transition-opacity ${loading && bookings ? "opacity-60" : ""}`}>
        {days.map((d, i) => {
          const list = all.filter((b) => dayOf(b) === d);
          const active = list.filter((b) => b.status !== "cancelled").length;
          return (
            <li key={d}>
              <button onClick={() => onOpenDay(d)} className="group flex w-full flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-b border-line pb-2 text-left">
                <span>
                  <span className="font-display text-3xl font-bold uppercase group-hover:text-brass-bright">
                    {i === 0 ? "Today" : i === 1 ? "Tomorrow" : weekday(d)}
                  </span>{" "}
                  <span className="text-stone">
                    {i < 2 ? `${weekday(d)} ` : ""}
                    {dayMonth(d)}
                  </span>
                </span>
                <span className="text-sm text-stone">
                  {active ? <span className="font-semibold text-brass-bright">{active} booked · </span> : null}
                  {describeRanges(rangesOn(d, hours))}
                </span>
              </button>
              {!bookings && <div className="mt-3 h-16 animate-pulse rounded-sm bg-coal" />}
              {bookings && list.length === 0 && <p className="mt-3 text-sm text-stone">No bookings.</p>}
              {list.length > 0 && (
                <ul className="mt-3 grid gap-3">
                  {list.map((b) => (
                    <BookingCard key={b.id} b={b} onChanged={onChanged} onError={setError} />
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function BlockTime({ blocked, onDone }: { blocked: Blocked[]; onDone: () => void }) {
  const db = getSupabase()!;
  const defaultDay = localDateKey();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ from: defaultDay, to: defaultDay, wholeDay: true, start: "13:00", end: "14:00", reason: "" });
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <section className="rounded-sm border border-line bg-coal p-5">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between font-semibold" aria-expanded={open}>
        Holidays and time off <span className="text-brass">{open ? "–" : "+"}</span>
      </button>
      <p className="mt-1 text-xs text-stone">
        Block several days (a holiday) or a few hours. Customers can&apos;t book blocked time. To change one day&apos;s hours, tap it in the calendar.
      </p>
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
    </section>
  );
}
