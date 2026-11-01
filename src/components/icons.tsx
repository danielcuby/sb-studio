import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;

export const WhatsAppIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.18.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.27.49 1.7.63.71.23 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.32l-.34-.2-3.57.94.95-3.48-.22-.36a9.39 9.39 0 0 1-1.44-5.01c0-5.2 4.23-9.43 9.44-9.43a9.4 9.4 0 0 1 9.43 9.44c0 5.2-4.24 9.42-9.44 9.42m8.03-17.46A11.27 11.27 0 0 0 12.05.72C5.8.72.7 5.8.7 12.07c0 2 .52 3.95 1.52 5.67L.6 23.6l6-1.57a11.33 11.33 0 0 0 5.43 1.38h.01c6.25 0 11.34-5.09 11.34-11.35 0-3.03-1.18-5.88-3.32-8.02" />
  </svg>
);

export const PhoneIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

export const CalendarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
    <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
  </svg>
);

export const ChevronIcon = ({ direction = "right", ...p }: P & { direction?: "left" | "right" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d={direction === "right" ? "m9 5 7 7-7 7" : "m15 5-7 7 7 7"} />
  </svg>
);

export const CloseIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const PinIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
);

export const CashIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true" {...p}>
    <rect x="2.5" y="6" width="19" height="12" rx="1.5" />
    <circle cx="12" cy="12" r="2.6" />
    <path d="M6 9.5v5M18 9.5v5" strokeLinecap="round" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ClockIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
);

export const StarIcon = (p: P) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...p}>
    <path d="m12 2.8 2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3L2.9 9.5l6.3-.9z" />
  </svg>
);

/** SB Studio mark: a straight razor's edge as a brass rule between S and B. */
export const Logo = ({ className }: { className?: string }) => (
  <span className={`inline-flex items-baseline gap-2 font-display font-extrabold uppercase leading-none tracking-wide ${className ?? ""}`}>
    <span className="text-[1.65rem]">SB</span>{" "}
    <span className="h-[2px] w-5 translate-y-[-0.35rem] bg-brass" aria-hidden="true" />{" "}
    <span className="text-[1.05rem] font-semibold tracking-[0.18em] text-stone">Studio</span>
  </span>
);
