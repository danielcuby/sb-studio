import { test, expect } from "@playwright/test";
import { services } from "../src/config/services";
import { reviews } from "../src/config/reviews";

test("home page shows the key sections and CTAs", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SB Studio/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One chair.");
  await expect(page.getByRole("link", { name: "Book now" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: /WhatsApp us/ }).first()).toHaveAttribute("href", "https://wa.me/35054008727");

  for (const s of services) {
    await expect(page.getByRole("heading", { name: s.name })).toBeVisible();
  }
  await expect(page.getByText("Pay in person. Cash or Revolut.").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent work" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Meet Shlomo" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Find the studio" })).toBeVisible();
  await expect(page.locator('a[href="tel:+35054008727"]').first()).toBeAttached();
});

test("reviews are hidden in production while they are all samples", async ({ page }) => {
  test.skip(reviews.some((r) => !r.placeholder), "Real reviews exist");
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What clients say" })).toHaveCount(0);
  await expect(page.getByText("Sample", { exact: true })).toHaveCount(0);
});

test("LocalBusiness schema and Open Graph tags are present", async ({ page, request }) => {
  await page.goto("/");
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent())!);
  expect(ld["@type"]).toBe("BarberShop");
  expect(ld.telephone).toBe("+350 5400 8727");
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  const og = await request.get("/opengraph-image");
  expect(og.ok()).toBeTruthy();
});

test("gallery opens a lightbox that closes with Escape", async ({ page }) => {
  await page.goto("/#work");
  await page.getByRole("button", { name: /Open photo/ }).first().click();
  const dialog = page.getByRole("dialog", { name: "Photo viewer" });
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("'Book this' preselects the service and a booking completes", async ({ page }) => {
  let posted: Record<string, unknown> | null = null;
  await page.route("**/api/availability**", (route) =>
    route.fulfill({
      json: {
        slots: [
          { time: "10:00", startsAt: "2030-01-07T10:00:00.000Z" },
          { time: "14:30", startsAt: "2030-01-07T14:30:00.000Z" },
        ],
      },
    }),
  );
  await page.route("**/api/bookings", async (route) => {
    posted = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { id: "test-id", cancelToken: "11111111-1111-4111-8111-111111111111" } });
  });

  await page.goto("/");
  await page.getByRole("link", { name: "Book a haircut & beard" }).click();
  await expect(page).toHaveURL(/service=haircut-beard/);
  await expect(page.getByRole("heading", { name: "Pick a day" })).toBeVisible();

  // First open day in the calendar.
  await page.locator("button[aria-pressed]:not([disabled])").first().click();
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
  await page.getByRole("button", { name: "14:30" }).click();

  await page.getByLabel("Name").fill("Test Person");
  await page.getByLabel("Phone (WhatsApp)").fill("+350 5400 0000");
  await expect(page.getByText("Pay in person. Cash or Revolut.").first()).toBeVisible();
  await page.getByRole("button", { name: /Confirm booking, £14 in person/ }).click();

  await expect(page.getByRole("heading", { name: "You're booked" })).toBeVisible();
  await expect(page.getByText("£14 to pay in person. Cash or Revolut.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Cancel this booking" })).toHaveAttribute("href", /\/cancel\?t=11111111-1111-4111-8111-111111111111$/);
  expect(posted).toMatchObject({ serviceId: "haircut-beard", startsAt: "2030-01-07T14:30:00.000Z", name: "Test Person" });
});

test("a taken slot sends the customer back to pick another time", async ({ page }) => {
  await page.route("**/api/availability**", (route) =>
    route.fulfill({ json: { slots: [{ time: "10:00", startsAt: "2030-01-07T10:00:00.000Z" }] } }),
  );
  await page.route("**/api/bookings", (route) => route.fulfill({ status: 409, json: { error: "slot_taken" } }));

  await page.goto("/book?service=adult");
  await page.locator("button[aria-pressed]:not([disabled])").first().click();
  await page.getByRole("button", { name: "10:00" }).click();
  await page.getByLabel("Name").fill("Test Person");
  await page.getByLabel("Phone (WhatsApp)").fill("+350 5400 0000");
  await page.getByRole("button", { name: /Confirm booking/ }).click();
  await expect(page.getByText("Someone just booked that time")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pick a time" })).toBeVisible();
});

test("admin page asks for sign-in and is not indexed", async ({ page }) => {
  await page.goto("/admin");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.getByRole("heading", { name: /Admin sign in|Not set up/ })).toBeVisible();
});

test("admin is its own installable app", async ({ page, request }) => {
  await page.goto("/admin");
  await expect(page.locator('link[rel="manifest"]').last()).toHaveAttribute("href", "/admin.webmanifest");
  const manifest = await (await request.get("/admin.webmanifest")).json();
  expect(manifest.start_url).toBe("/admin");
  expect((await request.get("/sw.js")).ok()).toBeTruthy();
});

test("hours refresh endpoint rejects people who aren't admins", async ({ request }) => {
  expect((await request.post("/api/hours-updated")).status()).toBe(401);
  expect((await request.post("/api/hours-updated", { headers: { Authorization: "Bearer nope" } })).status()).toBe(403);
});

const token = "22222222-2222-4222-8222-222222222222";
const booking = (hoursAway: number) => ({
  service_name: "Adult haircut",
  starts_at: new Date(Date.now() + hoursAway * 3_600_000).toISOString(),
  duration_minutes: 30,
  price_gbp: 10,
  customer_name: "Test Person",
  status: "confirmed",
});

test("customers can cancel with their link until 24 hours before", async ({ page }) => {
  let cancelled = false;
  await page.route("**/api/bookings/cancel**", async (route) => {
    if (route.request().method() === "POST") {
      cancelled = route.request().postDataJSON().token === token;
      return route.fulfill({ json: { ok: true } });
    }
    return route.fulfill({ json: { booking: booking(48) } });
  });
  await page.goto(`/cancel?t=${token}`);
  await expect(page.getByRole("heading", { name: "Cancel your booking?" })).toBeVisible();
  await page.getByRole("button", { name: "Yes, cancel it" }).click();
  await expect(page.getByRole("heading", { name: "Booking cancelled" })).toBeVisible();
  expect(cancelled).toBe(true);
});

test("inside 24 hours the cancel page points to WhatsApp instead", async ({ page }) => {
  await page.route("**/api/bookings/cancel**", (route) => route.fulfill({ json: { booking: booking(5) } }));
  await page.goto(`/cancel?t=${token}`);
  await expect(page.getByText(/less than 24 hours/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Yes, cancel it" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /WhatsApp Shlomo/ })).toBeVisible();
});

test("cancel endpoint rejects made-up links", async ({ request }) => {
  expect((await request.post("/api/bookings/cancel", { data: { token: "nope" } })).status()).toBe(404);
});
