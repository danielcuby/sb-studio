"use client";

import { useEffect, useState } from "react";
import { site, weekdayNames } from "@/config/site";
import { localDateKey, weekdayOf } from "@/lib/time";

// Monday first, the way people read a week.
const order = [1, 2, 3, 4, 5, 6, 0];

export default function HoursList() {
  const [today, setToday] = useState<number | null>(null);
  useEffect(() => setToday(weekdayOf(localDateKey())), []);

  return (
    <dl className="divide-y divide-line border-y border-line">
      {order.map((d) => {
        const h = site.hours[d];
        const isToday = d === today;
        return (
          <div key={d} className={`flex justify-between gap-4 py-3 ${isToday ? "text-bone" : "text-bone/70"}`}>
            <dt className="flex items-center gap-2">
              {weekdayNames[d]}
              {isToday && <span className="rounded-full bg-brass px-2 py-px text-xs font-semibold text-ink">Today</span>}
            </dt>
            <dd className="tabular-nums">{h ? `${h.open} – ${h.close}` : "Closed"}</dd>
          </div>
        );
      })}
    </dl>
  );
}
