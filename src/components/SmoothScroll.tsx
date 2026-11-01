"use client";

import { useEffect } from "react";
import { setLenis } from "@/lib/scroll-lock";
import { loadGsap } from "@/lib/parallax";

/**
 * Lenis smooth scrolling, driven by GSAP's ticker so ScrollTrigger stays in sync.
 * Loaded after the page is idle so it never delays the first paint. Off for reduced motion.
 */
export default function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup: (() => void) | undefined;
    let cancelled = false;

    const start = async () => {
      const [{ default: Lenis }, { gsap, ScrollTrigger }] = await Promise.all([import("lenis"), loadGsap()]);
      if (cancelled) return;
      const lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      // Smooth in-page anchor links (#services etc.), offset for the header.
      const onClick = (e: MouseEvent) => {
        const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"], a[href^="/#"]');
        if (!a || location.pathname !== "/") return;
        const id = a.getAttribute("href")!.replace(/^\/?#/, "");
        const el = id ? document.getElementById(id) : null;
        if (!el) return;
        e.preventDefault();
        lenis.scrollTo(el, { offset: -72 });
        history.replaceState(null, "", `#${id}`);
      };
      document.addEventListener("click", onClick);

      cleanup = () => {
        document.removeEventListener("click", onClick);
        gsap.ticker.remove(tick);
        setLenis(null);
        lenis.destroy();
      };
    };

    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 200));
    idle(() => void start());

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, []);

  return null;
}
