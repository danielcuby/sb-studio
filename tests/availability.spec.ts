import { test, expect } from "@playwright/test";
import { freeSlots, bookableDates } from "../src/lib/availability";
import { openStatus } from "../src/lib/time";
import type { Hours } from "../src/config/site";

// Pure logic tests for slot calculation (no browser needed).
// 2030-01-07 is a Monday (open 10:00–19:00 Gibraltar time, which is UTC+1 in winter).
const now = new Date("2030-01-01T08:00:00Z");
const day = "2030-01-07";
const week = (ranges: Hours["weekly"][number]): Hours["weekly"] => ({ 0: [], 1: ranges, 2: ranges, 3: ranges, 4: ranges, 5: ranges, 6: ranges });

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

test("customers must book at least 3 hours ahead", () => {
  const morning = new Date("2030-01-07T09:20:00Z"); // 10:20 local → earliest 13:20
  const times = freeSlots(day, 30, [], morning).map((s) => s.time);
  expect(times[0]).toBe("13:30");
});

test("a day split into several blocks only offers times inside them", () => {
  const hours: Hours = {
    weekly: week([
      { open: "10:00", close: "12:00" },
      { open: "15:00", close: "16:00" },
      { open: "20:00", close: "24:00" },
    ]),
    days: {},
  };
  const times = freeSlots(day, 30, [], now, hours).map((s) => s.time);
  expect(times).toEqual([
    "10:00", "10:15", "10:30", "10:45", "11:00", "11:15", "11:30",
    "15:00", "15:15", "15:30",
    "20:00", "20:15", "20:30", "20:45", "21:00", "21:15", "21:30", "21:45", "22:00", "22:15", "22:30", "22:45", "23:00", "23:15", "23:30",
  ]);
  // A 45-minute cut doesn't fit in the gap after 11:15, or across a break.
  expect(freeSlots(day, 45, [], now, hours).map((s) => s.time)).not.toContain("11:30");
});

test("hours set for one date replace that weekday's usual hours", () => {
  const hours: Hours = { weekly: week([{ open: "10:00", close: "19:00" }]), days: { [day]: [{ open: "17:00", close: "18:00" }], "2030-01-08": [] } };
  expect(freeSlots(day, 30, [], now, hours).map((s) => s.time)).toEqual(["17:00", "17:15", "17:30"]);
  expect(bookableDates(now, hours)).not.toContain("2030-01-08"); // day off
  expect(freeSlots("2030-01-09", 30, [], now, hours)[0].time).toBe("10:00"); // usual Wednesday
});

test("open status follows the blocks of the day", () => {
  const hours: Hours = { weekly: week([{ open: "10:00", close: "12:00" }, { open: "20:00", close: "24:00" }]), days: {} };
  expect(openStatus(new Date("2030-01-07T10:00:00Z"), hours).text).toBe("Open now until 12:00"); // 11:00 local
  expect(openStatus(new Date("2030-01-07T13:00:00Z"), hours).text).toBe("Opens today at 20:00"); // 14:00 local
  expect(openStatus(new Date("2030-01-07T21:30:00Z"), hours).text).toBe("Open now until 00:00"); // 22:30 local
});
