"use client";

import { useMemo, useState } from "react";
import { ChevronIcon } from "../icons";

const weekdayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Month calendar. Only `enabled` dates ("YYYY-MM-DD") can be picked. */
export default function Calendar({
  enabled,
  value,
  onChange,
}: {
  enabled: string[];
  value: string | null;
  onChange: (date: string) => void;
}) {
  const enabledSet = useMemo(() => new Set(enabled), [enabled]);
  const months = useMemo(() => [...new Set(enabled.map((d) => d.slice(0, 7)))], [enabled]);
  const [monthIdx, setMonthIdx] = useState(() => Math.max(0, months.indexOf((value ?? enabled[0] ?? "").slice(0, 7))));
  const month = months[monthIdx] ?? enabled[0]?.slice(0, 7);
  if (!month) return null;

  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7; // Monday-first offset
  const label = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(first);
  const today = enabled[0];

  return (
    <div className="rounded-sm border border-line bg-coal p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-display text-2xl font-bold uppercase" aria-live="polite">
          {label}
        </p>
        <div className="flex gap-2">
          {[-1, 1].map((d) => (
            <button
              key={d}
              type="button"
              disabled={monthIdx + d < 0 || monthIdx + d >= months.length}
              onClick={() => setMonthIdx((i) => i + d)}
              className="grid size-10 place-items-center rounded-full border border-line transition hover:border-brass disabled:opacity-30"
              aria-label={d < 0 ? "Previous month" : "Next month"}
            >
              <ChevronIcon direction={d < 0 ? "left" : "right"} className="size-4" />
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdayShort.map((w) => (
          <div key={w} className="pb-2 text-xs font-semibold text-stone">
            {w}
          </div>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <div key={`lead-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, "0")}`;
          const ok = enabledSet.has(date);
          const selected = date === value;
          return (
            <button
              key={date}
              type="button"
              disabled={!ok}
              onClick={() => onChange(date)}
              aria-pressed={selected}
              aria-label={new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
                new Date(date),
              )}
              className={`relative aspect-square rounded-sm text-[0.95rem] tabular-nums transition-[background-color,color,transform] duration-300 ${
                selected
                  ? "bg-brass font-bold text-ink"
                  : ok
                    ? "text-bone hover:bg-ash active:scale-95"
                    : "text-stone/30 line-through decoration-stone/20"
              }`}
            >
              {i + 1}
              {date === today && !selected && <span className="absolute bottom-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-brass" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
