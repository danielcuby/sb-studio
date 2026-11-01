import "server-only";
import { site } from "@/config/site";
import { formatPrice } from "@/config/services";
import { formatDateLong, formatTime } from "./time";

/**
 * Booking emails through Resend. Optional: with no RESEND_API_KEY nothing is sent and bookings still work.
 * RESEND_FROM must be an address on a domain you've verified in Resend (or onboarding@resend.dev for testing).
 */
const apiKey = process.env.RESEND_API_KEY;
const from = process.env.RESEND_FROM ?? `${site.name} <onboarding@resend.dev>`;
const notify = process.env.BOOKING_NOTIFY_EMAIL;

export type BookingEmail = {
  id: string;
  cancelToken: string;
  serviceName: string;
  price: number;
  durationMinutes: number;
  startsAt: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

async function send(to: string, subject: string, html: string, replyTo?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  if (!res.ok) console.error("Resend error", res.status, await res.text());
}

function layout(body: string) {
  return `<div style="background:#141210;padding:32px 16px;font-family:Helvetica,Arial,sans-serif;color:#ece4d6">
  <div style="max-width:520px;margin:0 auto;background:#1c1916;border:1px solid #3a332c;border-radius:4px;padding:28px">
    <p style="margin:0 0 20px;font-size:20px;font-weight:800;letter-spacing:.04em">SB <span style="color:#c39a5a">—</span> STUDIO</p>
    ${body}
  </div></div>`;
}

function details(b: BookingEmail) {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 0;color:#a39885">${k}</td><td style="padding:6px 0;text-align:right">${v}</td></tr>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:15px">
    ${row("When", `${esc(formatDateLong(b.startsAt))}, ${formatTime(b.startsAt)}`)}
    ${row("Service", `${esc(b.serviceName)} (${b.durationMinutes} min)`)}
    ${row("Price", formatPrice(b.price))}
  </table>`;
}

export async function sendBookingEmails(b: BookingEmail) {
  if (!apiKey) return;
  const jobs: Promise<void>[] = [];

  if (b.email) {
    jobs.push(
      send(
        b.email,
        `Booked: ${b.serviceName}, ${formatDateLong(b.startsAt)} at ${formatTime(b.startsAt)}`,
        layout(`<h1 style="font-size:24px;margin:0 0 8px">You're booked in, ${esc(b.name.split(" ")[0])}.</h1>
          <p style="margin:0 0 20px;color:#a39885">${site.barber} will see you at ${esc(site.address.street)}, ${esc(site.address.city)}.</p>
          ${details(b)}
          <p style="margin:20px 0 0;padding:12px;border-left:3px solid #c39a5a;background:#26221e"><strong>${site.payment}</strong> Nothing was charged online.</p>
          <p style="margin:20px 0 0;color:#a39885;font-size:14px">Can't make it? <a style="color:#dcb779" href="${site.url}/cancel?t=${b.cancelToken}">Cancel your booking</a> up to ${site.booking.cancelUntilHours} hours before. After that, or to change the time, message us on WhatsApp: <a style="color:#dcb779" href="${site.whatsapp}">${site.phone}</a></p>`),
      ),
    );
  }

  if (notify) {
    jobs.push(
      send(
        notify,
        `New booking: ${b.name}, ${formatDateLong(b.startsAt)} ${formatTime(b.startsAt)}`,
        layout(`<h1 style="font-size:22px;margin:0 0 16px">New booking</h1>
          ${details(b)}
          <p style="margin:16px 0 0">${esc(b.name)}<br><a style="color:#dcb779" href="https://wa.me/${b.phone.replace(/\D/g, "")}">${esc(b.phone)}</a>${
            b.email ? `<br>${esc(b.email)}` : ""
          }</p>
          ${b.notes ? `<p style="margin:16px 0 0;color:#a39885">Note: ${esc(b.notes)}</p>` : ""}`),
        b.email ?? undefined,
      ),
    );
  }

  await Promise.allSettled(jobs);
}
