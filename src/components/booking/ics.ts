import { site } from "@/config/site";

const stamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Downloads an .ics calendar file for the appointment. */
export function downloadIcs({ id, title, start, minutes, cancelUrl }: { id: string; title: string; start: string; minutes: number; cancelUrl: string }) {
  const s = new Date(start);
  const e = new Date(s.getTime() + minutes * 60_000);
  const location = `${site.name}, ${site.address.street}, ${site.address.city}`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//SB Studio//Booking//EN",
    "BEGIN:VEVENT",
    `UID:${id}@sb-studio`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(s)}`,
    `DTEND:${stamp(e)}`,
    `SUMMARY:${title} at ${site.name}`,
    `LOCATION:${location.replace(/,/g, "\\,")}`,
    `DESCRIPTION:${site.payment} Cancel up to ${site.booking.cancelUntilHours} hours before: ${cancelUrl} . To change the time, WhatsApp ${site.phone}.`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: "sb-studio-appointment.ics" });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
