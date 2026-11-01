import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { addDays, localDateKey, localDateTime } from "../src/lib/time";

// The admin app with a pretend signed-in admin. Every Supabase call is answered here with sample data,
// so nothing touches the real database and no real login is used.
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  (fs.existsSync(".env.local") ? /NEXT_PUBLIC_SUPABASE_URL=(.+)/.exec(fs.readFileSync(".env.local", "utf8"))?.[1]?.trim() : undefined);

const today = localDateKey();
const at = (day: string, hhmm: string) => localDateTime(day, Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))).toISOString();
const booking = (id: string, day: string, time: string, name: string, extra: object = {}) => ({
  id,
  service_id: "adult",
  service_name: "Adult haircut",
  price_gbp: 10,
  duration_minutes: 30,
  starts_at: at(day, time),
  ends_at: new Date(Date.parse(at(day, time)) + 30 * 60_000).toISOString(),
  customer_name: name,
  customer_phone: "+350 5400 0000",
  customer_email: null,
  notes: null,
  status: "confirmed",
  source: "online",
  cancelled_by_customer: false,
  ...extra,
});

async function signedInAdmin(page: Page) {
  const ref = new URL(supabaseUrl!).hostname.split(".")[0];
  const session = {
    access_token: "test",
    refresh_token: "test",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: { id: "00000000-0000-4000-8000-000000000001", email: "shlomo@example.com", aud: "authenticated", role: "authenticated" },
  };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [`sb-${ref}-auth-token`, JSON.stringify(session)]);

  const weekly = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    ranges: [{ open: "10:00", close: "12:00" }, { open: "15:00", close: "19:00" }],
  }));
  const tables: Record<string, unknown> = {
    opening_hours: weekly,
    date_hours: [{ date: addDays(today, 2), ranges: [{ open: "20:00", close: "24:00" }] }],
    bookings: [
      booking("b1", today, "10:00", "Daniel"),
      booking("b2", today, "15:30", "Marco"),
      booking("b3", addDays(today, 1), "11:00", "Leon"),
      booking("b4", addDays(today, 3), "16:00", "Sam", { status: "cancelled", cancelled_by_customer: true }),
    ],
    blocked_times: [],
  };
  await page.route(`${supabaseUrl}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/rpc/is_admin")) return route.fulfill({ json: true });
    const table = path.split("/rest/v1/")[1];
    if (table && table in tables) return route.fulfill({ json: route.request().method() === "GET" ? tables[table] : [] });
    return route.fulfill({ json: {} });
  });
}

test.skip(!supabaseUrl, "Needs NEXT_PUBLIC_SUPABASE_URL (the admin app is off without Supabase)");

test("calendar shows bookings per day and the selected day's bookings", async ({ page }) => {
  await signedInAdmin(page);
  await page.goto("/admin");
  await expect(page.getByRole("tab", { name: "Calendar" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("button", { name: /: 2 bookings/ })).toBeVisible(); // today
  await expect(page.getByText("Daniel")).toBeVisible();
  await expect(page.getByText("Marco")).toBeVisible();
  await expect(page.getByText("10:00–12:00, 15:00–19:00")).toBeVisible();

  // A day with its own hours, then change them.
  await page.getByRole("button", { name: /changed hours/ }).first().click();
  await expect(page.getByText("20:00–00:00")).toBeVisible();
  await expect(page.getByText("Changed for this date only")).toBeVisible();
  await page.getByRole("button", { name: "Change this day" }).click();
  await page.getByRole("button", { name: "+ Add another time" }).click();
  await expect(page.getByRole("button", { name: "Save for this day" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Back to usual/ })).toBeVisible();
});

test("next 7 days lists upcoming bookings by day", async ({ page }) => {
  await signedInAdmin(page);
  await page.goto("/admin");
  await page.getByRole("tab", { name: "Next 7 days" }).click();
  await expect(page.getByRole("heading", { name: "Next 7 days" })).toBeVisible();
  await expect(page.getByText("3 bookings.")).toBeVisible();
  await expect(page.getByText("Leon")).toBeVisible();
  await expect(page.getByText("Cancelled by customer")).toBeVisible();
});

test("usual week allows several blocks a day", async ({ page }) => {
  await signedInAdmin(page);
  await page.goto("/admin");
  await page.getByRole("tab", { name: "Settings" }).click();
  await expect(page.getByRole("heading", { name: "Your usual week" })).toBeVisible();
  await expect(page.getByLabel("Monday, block 2 starts")).toHaveValue("15:00");
});
