"use client";

import { useEffect, type RefObject } from "react";

/** GSAP + ScrollTrigger, loaded on demand so they never delay the first paint. */
export async function loadGsap() {
  const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
  gsap.registerPlugin(ScrollTrigger);
  return { gsap, ScrollTrigger };
}

type Tween = { target: string; from?: Record<string, number>; to: Record<string, number>; start?: string; end?: string };

/** Scroll-scrubbed tweens scoped to `root`. Skipped for reduced motion. */
export function useScrollTweens(root: RefObject<HTMLElement | null>, tweens: Tween[]) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !root.current) return;
    let revert: (() => void) | undefined;
    let cancelled = false;
    loadGsap().then(({ gsap }) => {
      if (cancelled || !root.current) return;
      const ctx = gsap.context(() => {
        for (const t of tweens) {
          const scrollTrigger = { trigger: root.current, start: t.start ?? "top top", end: t.end ?? "bottom top", scrub: true };
          if (t.from) gsap.fromTo(t.target, t.from, { ...t.to, ease: "none", scrollTrigger });
          else gsap.to(t.target, { ...t.to, ease: "none", scrollTrigger });
        }
      }, root.current);
      revert = () => ctx.revert();
    });
    return () => {
      cancelled = true;
      revert?.();
    };
    // Tweens are static per component.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);
}
