"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Marks [data-reveal] elements as revealed when they enter the viewport. */
export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    document.documentElement.classList.add("js-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    document.querySelectorAll("[data-reveal]:not(.is-revealed)").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
