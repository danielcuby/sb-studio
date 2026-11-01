import type { ReactNode } from "react";

/**
 * Fades content up once when it scrolls into view. Pure CSS plus one shared observer
 * (RevealObserver), so it adds no JavaScript per element. Styles live in globals.css.
 */
export default function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <div data-reveal="" className={className} style={delay ? ({ "--reveal-delay": `${delay}s` } as React.CSSProperties) : undefined}>
      {children}
    </div>
  );
}
