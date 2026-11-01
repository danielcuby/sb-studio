"use client";

import { useEffect, useState } from "react";
import { openStatus } from "@/lib/time";

/** "Open now until 19:00" with a live dot. Rendered on the client so it's always current. */
export default function OpenStatus({ className }: { className?: string }) {
  const [status, setStatus] = useState<ReturnType<typeof openStatus> | null>(null);

  useEffect(() => {
    const update = () => setStatus(openStatus());
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className={`inline-flex min-h-6 items-center gap-2 text-sm text-bone/80 ${className ?? ""}`} aria-live="polite">
      {status && (
        <>
          <span className="relative flex size-2">
            {status.open && <span className="absolute inset-0 animate-ping rounded-full bg-ok/70" />}
            <span className={`relative size-2 rounded-full ${status.open ? "bg-ok" : "bg-stone"}`} />
          </span>
          {status.text}
        </>
      )}
    </span>
  );
}
