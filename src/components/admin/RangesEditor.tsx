"use client";

import type { TimeRange } from "@/config/site";
import { toMinutes } from "@/lib/time";

const timeInput =
  "w-full min-w-0 rounded-sm border border-line bg-ink px-2 py-2 text-bone tabular-nums [color-scheme:dark] focus:border-brass focus:outline-none";

/** Editor for one day's working blocks, e.g. 10:00–12:00, 15:00–16:00, 20:00–00:00. Empty = closed. */
export default function RangesEditor({
  ranges,
  onChange,
  label,
}: {
  ranges: TimeRange[];
  onChange: (ranges: TimeRange[]) => void;
  label: string;
}) {
  const set = (i: number, patch: Partial<TimeRange>) => onChange(ranges.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  return (
    <div className="grid gap-2">
      {ranges.length === 0 && <p className="text-sm text-stone">Closed</p>}
      {ranges.map((r, i) => (
        <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
          <input type="time" step={900} value={r.open} onChange={(e) => set(i, { open: e.target.value })} className={timeInput} aria-label={`${label}, block ${i + 1} starts`} />
          <span className="text-stone">to</span>
          <input
            type="time"
            step={900}
            value={r.close === "24:00" ? "00:00" : r.close}
            onChange={(e) => set(i, { close: e.target.value })}
            className={timeInput}
            aria-label={`${label}, block ${i + 1} ends`}
          />
          <button
            type="button"
            onClick={() => onChange(ranges.filter((_, j) => j !== i))}
            className="grid size-9 place-items-center rounded-full border border-line text-lg leading-none text-stone hover:border-danger hover:text-danger"
            aria-label={`Remove ${label} block ${i + 1}`}
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...ranges, nextBlock(ranges)])} className="w-fit text-sm text-brass-bright underline underline-offset-4">
        + Add {ranges.length ? "another time" : "working time"}
      </button>
    </div>
  );
}

/** A sensible next block: an hour after the last one ends, for an hour. */
function nextBlock(ranges: TimeRange[]): TimeRange {
  if (!ranges.length) return { open: "10:00", close: "19:00" };
  const end = Math.max(...ranges.map((r) => toMinutes(r.close === "00:00" ? "24:00" : r.close)));
  const start = Math.min(end + 60, 22 * 60);
  const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  return { open: hhmm(start), close: hhmm(Math.min(start + 60, 23 * 60 + 45)) };
}

/**
 * Cleans blocks for saving: "00:00" as an end time means midnight ("24:00"), sorted by start.
 * Returns an error message instead when a block ends before it starts or two blocks overlap.
 */
export function cleanRanges(ranges: TimeRange[], label: string): TimeRange[] | string {
  const out = ranges
    .map((r) => ({ open: r.open, close: r.close === "00:00" ? "24:00" : r.close }))
    .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
  for (const [i, r] of out.entries()) {
    if (!r.open || !r.close) return `${label}: fill in both times.`;
    if (toMinutes(r.close) <= toMinutes(r.open)) return `${label}: ${r.open} block must end after it starts.`;
    if (i > 0 && toMinutes(r.open) < toMinutes(out[i - 1].close)) return `${label}: two blocks overlap.`;
  }
  return out;
}
