"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { services, getService, formatPrice, type Service } from "@/config/services";
import { site, type Hours, type WeeklyHours } from "@/config/site";
import { bookableDates, type Slot } from "@/lib/availability";
import { describeRanges, formatDateLong } from "@/lib/time";
import Calendar from "./Calendar";
import { downloadIcs } from "./ics";
import { CalendarIcon, CashIcon, CheckIcon, ClockIcon, WhatsAppIcon } from "../icons";

type Step = "service" | "date" | "time" | "details" | "done";
const steps: { id: Step; label: string }[] = [
  { id: "service", label: "Service" },
  { id: "date", label: "Date" },
  { id: "time", label: "Time" },
  { id: "details", label: "Your details" },
];
const ease = [0.16, 1, 0.3, 1] as const;

type SlotState = { status: "idle" | "loading" | "ready" | "error" | "not_configured"; slots: Slot[]; message?: string };

export default function BookingFlow({ hours }: { hours: Hours }) {
  const params = useSearchParams();
  const preselected = getService(params.get("service"));
  const reduce = useReducedMotion();
  const top = useRef<HTMLDivElement>(null);

  const [step, setStep] = useState<Step>(preselected ? "date" : "service");
  const [service, setService] = useState<Service | undefined>(preselected);
  const [date, setDate] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  // Free times, tagged with the request they belong to. Anything else counts as still loading.
  const [loaded, setLoaded] = useState<SlotState & { key: string }>({ key: "", status: "idle", slots: [] });
  const [reloads, setReloads] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", company: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<{ id: string; cancelToken: string } | null>(null);
  const dates = useMemo(() => bookableDates(new Date(), hours), [hours]);

  const go = (s: Step) => {
    setStep(s);
    setError(null);
    top.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  // Load free times whenever the date or service changes.
  const slotsKey = date && service ? `${date}|${service.id}|${reloads}` : "";
  const slotState: SlotState = loaded.key === slotsKey ? loaded : { status: "loading", slots: [] };

  useEffect(() => {
    if (!slotsKey) return;
    const [d, s] = slotsKey.split("|");
    const ctrl = new AbortController();
    fetch(`/api/availability?date=${d}&service=${s}`, { signal: ctrl.signal })
      .then(async (r) => {
        const j = await r.json();
        if (r.ok) setLoaded({ key: slotsKey, status: "ready", slots: j.slots });
        else if (j.error === "not_configured") setLoaded({ key: slotsKey, status: "not_configured", slots: [] });
        else setLoaded({ key: slotsKey, status: "error", slots: [], message: j.error });
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setLoaded({ key: slotsKey, status: "error", slots: [], message: "Couldn't load times. Check your connection and try again." });
      });
    return () => ctrl.abort();
  }, [slotsKey]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!service || !slot) return;
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceId: service.id, startsAt: slot.startsAt, ...form }),
      });
      const j = await r.json();
      if (r.ok) {
        setBooked({ id: j.id, cancelToken: j.cancelToken });
        go("done");
      } else if (j.error === "slot_taken") {
        setSlot(null);
        setReloads((n) => n + 1);
        go("time");
        setError("Someone just booked that time. Pick another one.");
      } else {
        setError(j.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const stepIndex = steps.findIndex((s) => s.id === step);
  const canOpen = (s: Step) =>
    s === "service" || (s === "date" && !!service) || (s === "time" && !!service && !!date) || (s === "details" && !!slot);

  if (step === "done" && service && slot && booked) {
    return <Confirmation service={service} slot={slot} id={booked.id} cancelToken={booked.cancelToken} name={form.name} />;
  }

  return (
    <div ref={top} className="scroll-mt-24 grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-16">
      <div>
        {/* Progress: a real sequence, so numbered steps */}
        <ol className="mb-10 grid grid-cols-4 gap-2" aria-label="Booking steps">
          {steps.map((s, i) => {
            const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!canOpen(s.id)}
                  onClick={() => go(s.id)}
                  aria-current={state === "current" ? "step" : undefined}
                  className="group w-full text-left disabled:cursor-default"
                >
                  <span className={`block h-[3px] rounded-full transition-colors duration-500 ${state === "todo" ? "bg-line" : "bg-brass"}`} />
                  <span className={`mt-2 block text-xs sm:text-sm ${state === "current" ? "text-bone" : "text-stone"}`}>
                    <span className="tabular-nums">{i + 1}.</span> {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            initial={reduce ? false : { opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -24 }}
            transition={{ duration: 0.45, ease }}
          >
            {step === "service" && (
              <section aria-labelledby="service-title">
                <h1 id="service-title" className="font-display text-5xl font-extrabold uppercase md:text-6xl">
                  Choose a service
                </h1>
                <div className="mt-8 grid gap-3">
                  {services.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setService(s);
                        setSlot(null);
                        go("date");
                      }}
                      aria-pressed={service?.id === s.id}
                      className={`group flex items-center justify-between gap-4 rounded-sm border p-5 text-left transition-[border-color,background-color,transform] duration-300 hover:border-brass/70 hover:bg-ash active:scale-[0.99] sm:p-6 ${
                        service?.id === s.id ? "border-brass bg-ash" : "border-line bg-coal"
                      }`}
                    >
                      <span>
                        <span className="block text-lg font-semibold">{s.name}</span>
                        <span className="mt-1 block text-sm text-stone">
                          {s.durationMinutes} min. {s.description}
                        </span>
                      </span>
                      <span className="font-display text-5xl font-extrabold text-brass-bright">{formatPrice(s.price)}</span>
                    </button>
                  ))}
                </div>
                <PayNote className="mt-6" />
              </section>
            )}

            {step === "date" && (
              <section aria-labelledby="date-title">
                <h1 id="date-title" className="font-display text-5xl font-extrabold uppercase md:text-6xl">
                  Pick a day
                </h1>
                <p className="mt-3 text-stone">{describeOpenDays(hours.weekly)}</p>
                <div className="mt-8 max-w-md">
                  <Calendar
                    enabled={dates}
                    value={date}
                    onChange={(d) => {
                      setDate(d);
                      setSlot(null);
                      go("time");
                    }}
                  />
                </div>
              </section>
            )}

            {step === "time" && date && (
              <section aria-labelledby="time-title">
                <h1 id="time-title" className="font-display text-5xl font-extrabold uppercase md:text-6xl">
                  Pick a time
                </h1>
                <p className="mt-3 text-stone">
                  {formatDateLong(`${date}T12:00:00Z`)}.{" "}
                  <button type="button" onClick={() => go("date")} className="text-brass-bright underline underline-offset-4">
                    Change day
                  </button>
                </p>
                <p className="mt-1 text-sm text-stone">Book at least {site.booking.minNoticeMinutes / 60} hours ahead. For sooner, message us on WhatsApp.</p>
                {error && <Alert>{error}</Alert>}
                <div className="mt-8">
                  <TimeSlots
                    state={slotState}
                    selected={slot}
                    onPick={(s) => {
                      setSlot(s);
                      go("details");
                    }}
                    onOtherDay={() => go("date")}
                  />
                </div>
              </section>
            )}

            {step === "details" && service && slot && (
              <form onSubmit={submit} aria-labelledby="details-title" noValidate={false}>
                <h1 id="details-title" className="font-display text-5xl font-extrabold uppercase md:text-6xl">
                  Your details
                </h1>
                <p className="mt-3 text-stone">So {site.barber} knows who&apos;s coming and can message you if anything changes.</p>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <Field label="Name" required>
                    <input
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Phone (WhatsApp)" required hint="Include the country code, e.g. +350">
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      pattern="^\+?[\d\s()\-]{6,24}$"
                      placeholder="+350 …"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Email" hint="Optional. We'll send a confirmation.">
                    <input
                      type="email"
                      autoComplete="email"
                      maxLength={200}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className={inputCls}
                    />
                  </Field>
                  <Field label="Note for Shlomo" hint="Optional, e.g. the style you want.">
                    <input maxLength={500} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className={inputCls} />
                  </Field>
                  {/* Honeypot, hidden from people */}
                  <div aria-hidden="true" className="absolute -left-[9999px] h-0 overflow-hidden">
                    <label>
                      Company
                      <input tabIndex={-1} autoComplete="off" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                    </label>
                  </div>
                </div>
                {error && <Alert>{error}</Alert>}
                <PayNote className="mt-8" />
                <button type="submit" disabled={submitting} className="btn btn-primary mt-6 w-full sm:w-auto">
                  {submitting ? "Booking…" : `Confirm booking, ${formatPrice(service.price)} in person`}
                </button>
              </form>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <Summary service={service} date={date} slot={slot} />
    </div>
  );
}

const inputCls =
  "mt-2 block w-full rounded-sm border border-line bg-coal px-4 py-3.5 text-bone placeholder:text-stone/50 transition-colors focus:border-brass focus:outline-none user-invalid:border-danger";

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold">
        {label}
        {required && <span className="text-brass"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-stone">{hint}</span>}
    </label>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-6 rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-bone">
      {children}
    </p>
  );
}

function PayNote({ className }: { className?: string }) {
  return (
    <p className={`flex items-center gap-3 border-l-2 border-brass pl-4 text-sm ${className ?? ""}`}>
      <CashIcon className="size-5 shrink-0 text-brass" />
      <span>
        <strong className="font-semibold">{site.payment}</strong> <span className="text-stone">No payment online.</span>
      </span>
    </p>
  );
}

function describeOpenDays(hours: WeeklyHours) {
  const open = Object.values(hours).filter((h) => h.length).map((h) => describeRanges(h));
  const closed = Object.entries(hours).filter(([, h]) => !h.length).map(([d]) => Number(d));
  const names = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  const closedText = closed.length ? `closed ${closed.map((d) => names[d]).join(" and ")}` : "";
  const sameHours = open.length > 0 && open.every((h) => h === open[0]);
  const parts = [sameHours ? `Open ${open[0]}` : "", closedText].filter(Boolean);
  const sentence = parts.join(", ");
  return `${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}${sentence ? "." : ""} Crossed-out days are closed.`;
}

function TimeSlots({
  state,
  selected,
  onPick,
  onOtherDay,
}: {
  state: SlotState;
  selected: Slot | null;
  onPick: (s: Slot) => void;
  onOtherDay: () => void;
}) {
  if (state.status === "loading" || state.status === "idle") {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" aria-busy="true" aria-label="Loading times">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="h-12 animate-pulse rounded-sm bg-coal" />
        ))}
      </div>
    );
  }
  if (state.status === "not_configured" || state.status === "error") {
    return (
      <div className="rounded-sm border border-line bg-coal p-6">
        <p>
          {state.status === "not_configured"
            ? "Online booking isn't switched on yet. Message us on WhatsApp and we'll find you a time."
            : state.message}
        </p>
        <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-primary mt-5">
          <WhatsAppIcon className="size-5" /> Book on WhatsApp
        </a>
      </div>
    );
  }
  if (state.slots.length === 0) {
    return (
      <div className="rounded-sm border border-line bg-coal p-6">
        <p>No free times left on this day.</p>
        <button type="button" onClick={onOtherDay} className="btn btn-ghost mt-5">
          Pick another day
        </button>
      </div>
    );
  }

  const groups = [
    { label: "Morning", slots: state.slots.filter((s) => s.time < "12:00") },
    { label: "Afternoon", slots: state.slots.filter((s) => s.time >= "12:00" && s.time < "17:00") },
    { label: "Evening", slots: state.slots.filter((s) => s.time >= "17:00") },
  ].filter((g) => g.slots.length);

  return (
    <div className="space-y-8">
      {groups.map((g) => (
        <div key={g.label}>
          <h2 className="mb-3 font-sans text-sm font-semibold text-stone">{g.label}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            {g.slots.map((s) => (
              <button
                key={s.startsAt}
                type="button"
                onClick={() => onPick(s)}
                aria-pressed={selected?.startsAt === s.startsAt}
                className={`h-12 rounded-sm border text-[0.95rem] tabular-nums transition-[border-color,background-color,color,transform] duration-300 active:scale-95 ${
                  selected?.startsAt === s.startsAt ? "border-brass bg-brass font-bold text-ink" : "border-line bg-coal hover:border-brass/70 hover:bg-ash"
                }`}
              >
                {s.time}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function Summary({ service, date, slot }: { service?: Service; date: string | null; slot: Slot | null }) {
  return (
    <aside className="h-fit rounded-sm border border-line bg-coal p-6 lg:sticky lg:top-28" aria-label="Your booking">
      <h2 className="font-display text-3xl font-extrabold uppercase">Your booking</h2>
      <dl className="mt-5 divide-y divide-line border-y border-line text-[0.95rem]">
        <Row label="Service" value={service ? `${service.name}` : "Not chosen yet"} muted={!service} />
        <Row label="Length" value={service ? `${service.durationMinutes} min` : "–"} muted={!service} />
        <Row label="Day" value={date ? formatDateLong(`${date}T12:00:00Z`) : "Not chosen yet"} muted={!date} />
        <Row label="Time" value={slot ? slot.time : "Not chosen yet"} muted={!slot} />
      </dl>
      <div className="mt-5 flex items-end justify-between">
        <span className="text-stone">To pay in person</span>
        <span className="font-display text-5xl font-extrabold text-brass-bright">{service ? formatPrice(service.price) : "–"}</span>
      </div>
      <p className="mt-4 text-sm text-stone">Cash or Revolut at the appointment. Nothing is charged online.</p>
    </aside>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <dt className="text-stone">{label}</dt>
      <dd className={`text-right ${muted ? "text-stone/60" : ""}`}>{value}</dd>
    </div>
  );
}

function Confirmation({ service, slot, id, cancelToken, name }: { service: Service; slot: Slot; id: string; cancelToken: string; name: string }) {
  const cancelUrl = `${window.location.origin}/cancel?t=${cancelToken}`;
  const when = `${formatDateLong(slot.startsAt)} at ${slot.time}`;
  const message = encodeURIComponent(`Hi ${site.barber}, I've just booked a ${service.name.toLowerCase()} on ${when}. ${name}`);
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease }}
      className="mx-auto max-w-2xl text-center"
      aria-labelledby="done-title"
    >
      <motion.span
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.15, ease }}
        className="mx-auto grid size-20 place-items-center rounded-full bg-brass text-ink"
      >
        <CheckIcon className="size-10" />
      </motion.span>
      <h1 id="done-title" className="mt-8 font-display text-6xl font-extrabold uppercase md:text-7xl">
        You&apos;re booked
      </h1>
      <p className="mt-4 text-lg text-bone/85">
        {service.name} with {site.barber}, {when}.
      </p>

      <div className="mt-10 grid gap-3 rounded-sm border border-line bg-coal p-6 text-left">
        <p className="flex items-center gap-3">
          <ClockIcon className="size-5 text-brass" /> {service.durationMinutes} min, at {site.address.street}, {site.address.city}
        </p>
        <p className="flex items-center gap-3 font-semibold">
          <CashIcon className="size-5 text-brass" /> {formatPrice(service.price)} to pay in person. Cash or Revolut.
        </p>
        <p className="text-sm text-stone">Nothing has been charged.</p>
      </div>

      <div className="mt-4 rounded-sm border border-line p-6 text-left text-sm">
        <p className="font-semibold">Can&apos;t make it?</p>
        <p className="mt-1 text-stone">
          Cancel online up to {site.booking.cancelUntilHours} hours before with your private link. It&apos;s also in the calendar file
          {" "}and your email, if you gave one. After that, or to change the time, message {site.barber} on WhatsApp.
        </p>
        <a href={cancelUrl} className="mt-3 inline-block break-all text-brass-bright underline underline-offset-4">
          Cancel this booking
        </a>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => downloadIcs({ id, title: service.name, start: slot.startsAt, minutes: service.durationMinutes, cancelUrl })}
        >
          <CalendarIcon className="size-5" /> Add to calendar
        </button>
        <a href={`${site.whatsapp}?text=${message}`} target="_blank" rel="noopener" className="btn btn-ghost">
          <WhatsAppIcon className="size-5" /> Message {site.barber}
        </a>
      </div>
      <Link href="/" className="mt-8 inline-block text-stone underline underline-offset-4 hover:text-bone">
        Back to the homepage
      </Link>
    </motion.section>
  );
}
