"use client";

import type { Hours } from "@/config/site";
import { localDateKey, rangesOn } from "@/lib/time";
import { ChevronIcon } from "../icons";

const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "YYYY-MM" plus or minus some months. */
export function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

/** Shlomo's month view: bookings per day, closed days faded, dates with their own hours marked. */
export default function MonthCalendar({
  month,
  onMonth,
  selected,
  onSelect,
  counts,
  hours,
}: {
  month: string;
  onMonth: (month: string) => void;
  selected: string;
  onSelect: (date: string) => void;
  /** Active bookings per date ("YYYY-MM-DD"). */
  counts: Record<string, number>;
  hours: Hours;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday first
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const today = localDateKey();

  return (
    <div className="rounded-sm border border-line bg-coal p-3 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-display text-3xl font-bold uppercase" aria-live="polite">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {month !== today.slice(0, 7) && (
            <button onClick={() => { onMonth(today.slice(0, 7)); onSelect(today); }} className="mr-1 text-sm text-brass-bright underline underline-offset-4">
              Today
            </button>
          )}
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onMonth(shiftMonth(month, d))}
              className="grid size-10 place-items-center rounded-full border border-line transition hover:border-brass"
              aria-label={d < 0 ? "Previous month" : "Next month"}
            >
              <ChevronIcon direction={d < 0 ? "left" : "right"} className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayShort.map((w) => (
          <div key={w} className="pb-1 text-xs font-semibold text-stone">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const count = counts[date] ?? 0;
          const closed = rangesOn(date, hours).length === 0;
          const special = date in hours.days;
          const isSelected = date === selected;
          const past = date < today;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onSelect(date)}
              aria-pressed={isSelected}
              aria-label={`${new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(date))}: ${
                count ? `${count} booking${count === 1 ? "" : "s"}` : "no bookings"
              }${closed ? ", closed" : ""}${special ? ", changed hours" : ""}`}
              className={`relative flex aspect-square flex-col items-center justify-center gap-1 rounded-sm text-[0.95rem] tabular-nums transition-colors ${
                isSelected
                  ? "bg-brass font-bold text-ink"
                  : `${date === today ? "ring-1 ring-brass ring-inset" : ""} ${closed || past ? "text-stone/45" : "text-bone"} hover:bg-ash`
              }`}
            >
              {i + 1}
              <span className={`min-h-4 rounded-full px-1.5 text-[0.7rem] font-semibold leading-4 ${count ? (isSelected ? "bg-ink text-brass-bright" : "bg-brass/20 text-brass-bright") : ""}`}>
                {count || ""}
              </span>
              {special && (
                <span className={`absolute right-1 top-1 size-1.5 rotate-45 ${isSelected ? "bg-ink" : "bg-brass-bright"}`} aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone">
        <span>
          <span className="rounded-full bg-brass/20 px-1.5 font-semibold text-brass-bright">2</span> bookings
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-1.5 rotate-45 bg-brass-bright" /> hours changed for that date
        </span>
        <span>Faded = closed</span>
      </p>
    </div>
  );
}
