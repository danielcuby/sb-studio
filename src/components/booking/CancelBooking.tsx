"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { formatPrice } from "@/config/services";
import { formatDateLong, formatTime } from "@/lib/time";
import { CheckIcon, WhatsAppIcon } from "../icons";

type Booking = { service_name: string; starts_at: string; duration_minutes: number; price_gbp: number; customer_name: string; status: string };
type State =
  | { status: "loading" }
  | { status: "not_found" }
  | { status: "error" }
  | { status: "ready"; booking: Booking; checkedAt: number }
  | { status: "cancelled"; booking: Booking };

/** Customer's private cancel link (/cancel?t=…). Online cancelling closes 24 hours before the appointment. */
export default function CancelBooking() {
  const token = useSearchParams().get("t") ?? "";
  const [loaded, setLoaded] = useState<State & { token: string }>({ token: "", status: "loading" });
  const state: State = loaded.token === token ? loaded : { status: "loading" };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/bookings/cancel?t=${encodeURIComponent(token)}`)
      .then(async (r) => {
        const j = await r.json();
        setLoaded(r.ok ? { token, status: "ready", booking: j.booking, checkedAt: Date.now() } : { token, status: r.status === 404 ? "not_found" : "error" });
      })
      .catch(() => setLoaded({ token, status: "error" }));
  }, [token]);

  async function cancel(booking: Booking) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const j = await r.json();
      if (r.ok) setLoaded({ token, status: "cancelled", booking });
      else if (j.error === "too_late") setError(tooLate);
      else if (j.error === "not_active") setLoaded({ token, status: "ready", booking: { ...booking, status: "cancelled" }, checkedAt: Date.now() });
      else setError(j.error === "not_found" ? "We couldn't find this booking." : j.error);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!token || state.status === "not_found") {
    return (
      <Card title="Booking not found">
        <p>This cancel link doesn&apos;t match a booking. Check you opened the full link, or message {site.barber} on WhatsApp.</p>
        <WhatsAppButton />
      </Card>
    );
  }
  if (state.status === "loading") return <div className="mx-auto h-72 max-w-xl animate-pulse rounded-sm bg-coal" aria-busy="true" />;
  if (state.status === "error") {
    return (
      <Card title="Something went wrong">
        <p>Couldn&apos;t load your booking. Refresh to try again, or message {site.barber} on WhatsApp.</p>
        <WhatsAppButton />
      </Card>
    );
  }

  const b = state.booking;
  const when = `${formatDateLong(b.starts_at)} at ${formatTime(b.starts_at)}`;
  const details = (
    <p className="text-lg text-bone/90">
      {b.service_name} with {site.barber}, {when}.
    </p>
  );

  if (state.status === "cancelled") {
    return (
      <Card title="Booking cancelled">
        <span className="mb-6 grid size-14 place-items-center rounded-full bg-brass text-ink">
          <CheckIcon className="size-7" />
        </span>
        {details}
        <p className="mt-3 text-stone">Thanks for letting us know. {site.barber} has been told and the slot is free again.</p>
        <Link href="/book" className="btn btn-primary mt-6">
          Book another time
        </Link>
      </Card>
    );
  }

  // Measured when the booking loaded. The server checks again when they press cancel.
  const past = new Date(b.starts_at).getTime() < state.checkedAt;
  const late = new Date(b.starts_at).getTime() - state.checkedAt < site.booking.cancelUntilHours * 3_600_000;

  return (
    <Card title={b.status === "confirmed" ? "Cancel your booking?" : "Your booking"}>
      {details}
      <p className="mt-1 text-stone">
        {b.duration_minutes} min, {formatPrice(Number(b.price_gbp))} to pay in person. Booked for {b.customer_name}.
      </p>
      {b.status !== "confirmed" ? (
        <p className="mt-6">{b.status === "cancelled" ? "This booking is already cancelled." : "This appointment has already happened."}</p>
      ) : past ? (
        <p className="mt-6">This appointment has already happened.</p>
      ) : late ? (
        <>
          <p className="mt-6">{tooLate}</p>
          <WhatsAppButton />
        </>
      ) : (
        <>
          {error && (
            <p role="alert" className="mt-6 rounded-sm border border-danger/40 bg-danger/10 px-4 py-3 text-sm">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => cancel(b)} className="btn bg-danger font-semibold text-ink hover:bg-danger/85">
              {busy ? "Cancelling…" : "Yes, cancel it"}
            </button>
            <Link href="/" className="btn btn-ghost">
              Keep my booking
            </Link>
          </div>
          <p className="mt-4 text-sm text-stone">You can cancel online until {site.booking.cancelUntilHours} hours before.</p>
        </>
      )}
    </Card>
  );
}

const tooLate = `It's less than ${site.booking.cancelUntilHours} hours until your appointment, so it can't be cancelled online. Message ${site.barber} on WhatsApp instead.`;

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-xl rounded-sm border border-line bg-coal p-6 sm:p-10" aria-labelledby="cancel-title">
      <h1 id="cancel-title" className="mb-5 font-display text-5xl font-extrabold uppercase">
        {title}
      </h1>
      {children}
    </section>
  );
}

function WhatsAppButton() {
  return (
    <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-primary mt-6">
      <WhatsAppIcon className="size-5" /> WhatsApp {site.barber}
    </a>
  );
}
