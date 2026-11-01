"use client";

import { formatPrice } from "@/config/services";
import { formatTime } from "@/lib/time";
import { getSupabase } from "@/lib/supabase";
import { PhoneIcon, WhatsAppIcon } from "../icons";
import type { Booking } from "./data";

const statusLabel: Record<Booking["status"], string> = {
  confirmed: "Booked",
  completed: "Done",
  no_show: "No-show",
  cancelled: "Cancelled",
};

/** One booking, with contact links and Done / No-show / Cancel. */
export default function BookingCard({ b, onChanged, onError }: { b: Booking; onChanged: () => void; onError: (msg: string) => void }) {
  const db = getSupabase()!;

  async function setStatus(status: Booking["status"]) {
    if (status === "cancelled" && !confirm(`Cancel ${b.customer_name}'s booking at ${formatTime(b.starts_at)}? The slot opens up again.`)) return;
    const { error } = await db.from("bookings").update({ status, cancelled_by_customer: false }).eq("id", b.id);
    if (error) onError(error.code === "23P01" ? "That time now overlaps another booking." : "Couldn't update the booking.");
    onChanged();
  }

  const cancelled = b.status === "cancelled";
  const phone = b.customer_phone.replace(/\D/g, "");

  return (
    <li className={`rounded-sm border border-line bg-coal p-4 sm:p-5 ${cancelled ? "opacity-55" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`font-display text-3xl font-bold tabular-nums ${cancelled ? "line-through decoration-2" : ""}`}>
            {formatTime(b.starts_at)}–{formatTime(b.ends_at)}
          </p>
          <p className="mt-1 font-semibold">
            {b.customer_name}{" "}
            <span className="font-normal text-stone">
              · {b.service_name}, {formatPrice(Number(b.price_gbp))}
            </span>
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs ${
            b.status === "confirmed" ? "bg-brass/15 text-brass-bright" : b.status === "completed" ? "bg-ok/15 text-ok" : "border border-line text-stone"
          }`}
        >
          {cancelled && b.cancelled_by_customer ? "Cancelled by customer" : statusLabel[b.status]}
        </span>
      </div>
      {b.notes && <p className="mt-2 text-sm text-bone/80">“{b.notes}”</p>}
      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a className="inline-flex items-center gap-1.5 text-brass-bright" href={`https://wa.me/${phone}`} target="_blank" rel="noopener">
          <WhatsAppIcon className="size-4" /> {b.customer_phone}
        </a>
        <a className="inline-flex items-center gap-1.5 text-stone hover:text-bone" href={`tel:${b.customer_phone.replace(/[^\d+]/g, "")}`}>
          <PhoneIcon className="size-4" /> Call
        </a>
        {b.customer_email && (
          <a className="text-stone hover:text-bone" href={`mailto:${b.customer_email}`}>
            {b.customer_email}
          </a>
        )}
        {b.source === "admin" && <span className="text-stone">Added by you</span>}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-sm">
        {b.status === "confirmed" && (
          <>
            <button onClick={() => setStatus("completed")} className="rounded-full bg-brass px-4 py-1.5 font-semibold text-ink hover:bg-brass-bright">
              Mark done
            </button>
            <button onClick={() => setStatus("no_show")} className="rounded-full border border-line px-4 py-1.5 hover:border-bone">
              No-show
            </button>
          </>
        )}
        {cancelled || b.status === "no_show" ? (
          <button onClick={() => setStatus("confirmed")} className="rounded-full border border-line px-4 py-1.5 hover:border-bone">
            Restore
          </button>
        ) : (
          <button onClick={() => setStatus("cancelled")} className="rounded-full border border-danger/50 px-4 py-1.5 text-danger hover:bg-danger/10">
            Cancel
          </button>
        )}
      </div>
    </li>
  );
}
