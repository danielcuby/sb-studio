import { test, expect } from "@playwright/test";
import { freeSlots, bookableDates } from "../src/lib/availability";

// Pure logic tests for slot calculation (no browser needed).
// 2030-01-07 is a Monday (open 10:00–19:00 Gibraltar time, which is UTC+1 in winter).
const now = new Date("2030-01-01T08:00:00Z");
const day = "2030-01-07";

test("offers every 15 minutes, and the last 45-min slot ends at closing", () => {
  const slots = freeSlots(day, 45, [], now);
  expect(slots[0].time).toBe("10:00");
  expect(slots[0].startsAt).toBe("2030-01-07T09:00:00.000Z");
  expect(slots.at(-1)!.time).toBe("18:15");
});

test("skips slots that overlap a booking", () => {
  const busy = [{ start: new Date("2030-01-07T10:00:00Z"), end: new Date("2030-01-07T10:30:00Z") }]; // 11:00–11:30 local
  const times = freeSlots(day, 30, busy, now).map((s) => s.time);
  expect(times).toContain("10:30");
  expect(times).not.toContain("10:45");
  expect(times).not.toContain("11:00");
  expect(times).not.toContain("11:15");
  expect(times).toContain("11:30");
});

test("closed days and past days have no slots", () => {
  expect(freeSlots("2030-01-06", 30, [], now)).toEqual([]); // Sunday
  expect(freeSlots("2029-12-31", 30, [], now)).toEqual([]);
  expect(bookableDates(now)).not.toContain("2030-01-06");
});

test("minimum notice hides slots starting too soon", () => {
  const morning = new Date("2030-01-07T09:20:00Z"); // 10:20 local
  const times = freeSlots(day, 30, [], morning).map((s) => s.time);
  expect(times[0]).toBe("11:30");
});
