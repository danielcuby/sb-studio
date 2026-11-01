import { NextResponse, after } from "next/server";
import { z } from "zod";
import { getService } from "@/config/services";
import { freeSlots } from "@/lib/availability";
import { busyRanges } from "@/lib/bookings";
import { sendBookingEmails } from "@/lib/email";
import { getSupabase } from "@/lib/supabase";
import { localDateKey } from "@/lib/time";

const Body = z.object({
  serviceId: z.string(),
  startsAt: z.iso.datetime(),
  name: z.string().trim().min(2, "Enter your name.").max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()-]{6,24}$/, "Enter a phone number we can WhatsApp."),
  email: z.union([z.literal(""), z.email("Check your email address.")]).optional(),
  notes: z.string().trim().max(500).optional(),
  // Honeypot: real people never see or fill this.
  company: z.string().max(0).optional(),
});

// POST /api/bookings → { id }
export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check your details." }, { status: 400 });
  }
  const b = parsed.data;
  const service = getService(b.serviceId);
  if (!service) return NextResponse.json({ error: "Choose a service." }, { status: 400 });

  // Re-check the slot against opening hours and current bookings.
  const date = localDateKey(new Date(b.startsAt));
  const busy = await busyRanges(date);
  if ("error" in busy) {
    return NextResponse.json({ error: "Online booking is unavailable right now. Message us on WhatsApp." }, { status: 503 });
  }
  const startsAt = new Date(b.startsAt).toISOString();
  if (!freeSlots(date, service.durationMinutes, busy).some((s) => s.startsAt === startsAt)) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  const db = getSupabase()!;
  const { data: id, error } = await db.rpc("create_booking", {
    p_service_id: service.id,
    p_service_name: service.name,
    p_price_gbp: service.price,
    p_duration_minutes: service.durationMinutes,
    p_starts_at: startsAt,
    p_name: b.name,
    p_phone: b.phone,
    p_email: b.email || null,
    p_notes: b.notes || null,
  });

  if (error) {
    if (error.code === "23P01") return NextResponse.json({ error: "slot_taken" }, { status: 409 });
    console.error("create_booking failed", error);
    return NextResponse.json({ error: "Couldn't save your booking. Try again, or message us on WhatsApp." }, { status: 500 });
  }

  // Send emails after responding, so the customer isn't kept waiting.
  after(() =>
    sendBookingEmails({
      id: id as string,
      serviceName: service.name,
      price: service.price,
      durationMinutes: service.durationMinutes,
      startsAt,
      name: b.name,
      phone: b.phone,
      email: b.email || null,
      notes: b.notes || null,
    }),
  );

  return NextResponse.json({ id }, { status: 201 });
}
