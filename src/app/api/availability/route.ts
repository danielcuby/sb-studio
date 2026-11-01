import { NextResponse, type NextRequest } from "next/server";
import { getService } from "@/config/services";
import { freeSlots, isDateKey } from "@/lib/availability";
import { busyRanges } from "@/lib/bookings";

// GET /api/availability?date=2026-11-03&service=adult → { slots: [{ time, startsAt }] }
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  const service = getService(req.nextUrl.searchParams.get("service"));
  if (!isDateKey(date) || !service) {
    return NextResponse.json({ error: "Choose a service and a date." }, { status: 400 });
  }

  const busy = await busyRanges(date);
  if ("error" in busy) {
    return NextResponse.json(
      { error: busy.error === "not_configured" ? "not_configured" : "Couldn't load times. Try again, or message us on WhatsApp." },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { slots: freeSlots(date, service.durationMinutes, busy) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
