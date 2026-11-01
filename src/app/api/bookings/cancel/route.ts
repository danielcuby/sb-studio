import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { notifyCancelled } from "@/lib/push";
import { getSupabase } from "@/lib/supabase";

const Token = z.uuid();

// GET /api/bookings/cancel?t=<token> → the booking behind a customer's private cancel link.
export async function GET(req: NextRequest) {
  const token = Token.safeParse(req.nextUrl.searchParams.get("t"));
  const db = getSupabase();
  if (!token.success || !db) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await db.rpc("get_booking_for_cancel", { p_token: token.data });
  if (error) {
    console.error("get_booking_for_cancel failed", error);
    return NextResponse.json({ error: "Couldn't load your booking. Try again." }, { status: 500 });
  }
  const booking = (data as unknown[])[0];
  if (!booking) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ booking }, { headers: { "Cache-Control": "no-store" } });
}

// POST /api/bookings/cancel { token } → cancels it if the appointment is at least 24 hours away.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { token?: unknown } | null;
  const token = Token.safeParse(body?.token);
  const db = getSupabase();
  if (!token.success || !db) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data, error } = await db.rpc("cancel_booking", { p_token: token.data });
  if (error) {
    if (error.code === "P0002") return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (error.code === "55000") return NextResponse.json({ error: "not_active" }, { status: 409 });
    if (error.code === "22023") return NextResponse.json({ error: "too_late" }, { status: 409 });
    console.error("cancel_booking failed", error);
    return NextResponse.json({ error: "Couldn't cancel. Try again, or message us on WhatsApp." }, { status: 500 });
  }

  const b = (data as { customer_name: string; service_name: string; starts_at: string }[])[0];
  after(() => notifyCancelled({ name: b.customer_name, serviceName: b.service_name, startsAt: b.starts_at }));
  return NextResponse.json({ ok: true });
}
