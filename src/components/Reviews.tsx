"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { Review } from "@/config/reviews";
import { ChevronIcon, StarIcon } from "./icons";
import Reveal from "./Reveal";

const ease = [0.16, 1, 0.3, 1] as const;

/** Testimonial carousel. The parent decides which reviews to pass (and hides the section when there are none). */
export default function Reviews({ reviews }: { reviews: Review[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const r = reviews[i];
  const go = (d: number) => setI((n) => (n + d + reviews.length) % reviews.length);

  useEffect(() => {
    if (paused || reduce || reviews.length < 2) return;
    const id = setTimeout(() => setI((n) => (n + 1) % reviews.length), 7000);
    return () => clearTimeout(id);
  }, [i, paused, reduce, reviews.length]);

  return (
    <section className="py-24 md:py-36" aria-labelledby="reviews-title" aria-roledescription="carousel">
      <div className="container-x">
        <Reveal>
          <h2 id="reviews-title" className="text-[clamp(3.2rem,8vw,6.5rem)] uppercase">
            What clients say
          </h2>
        </Reveal>

        <div
          className="mt-14 grid gap-10 md:mt-20 md:grid-cols-[1fr_auto] md:items-end"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <div className="relative min-h-[16rem] md:min-h-[14rem]" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.figure
                key={i}
                initial={reduce ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -16 }}
                transition={{ duration: 0.6, ease }}
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${reviews.length}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex gap-0.5 text-brass" aria-label={`${r.rating} out of 5 stars`}>
                    {Array.from({ length: r.rating }, (_, k) => (
                      <StarIcon key={k} className="size-4" />
                    ))}
                  </span>
                  {r.placeholder && (
                    <span className="rounded-full border border-danger/50 px-2 py-0.5 text-xs font-semibold text-danger">
                      Sample
                    </span>
                  )}
                </div>
                <blockquote className="mt-6 max-w-[48rem] font-display text-[clamp(2rem,4.4vw,3.6rem)] font-semibold leading-[1.02]">
                  &ldquo;{r.text}&rdquo;
                </blockquote>
                <figcaption className="mt-6 text-stone">
                  {r.name}
                  {r.source ? `, via ${r.source}` : ""}
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>

          {reviews.length > 1 && (
            <div className="flex items-center gap-5">
              <div className="flex gap-1.5" role="tablist" aria-label="Choose review">
                {reviews.map((_, k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={k === i}
                    aria-label={`Review ${k + 1}`}
                    onClick={() => setI(k)}
                    className="grid h-8 place-items-center"
                  >
                    <span className={`block h-[3px] rounded-full transition-all duration-500 ${k === i ? "w-8 bg-brass" : "w-4 bg-line hover:bg-stone"}`} />
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                {[-1, 1].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => go(d)}
                    className="grid size-12 place-items-center rounded-full border border-line text-bone transition hover:border-brass hover:text-brass-bright active:scale-95"
                    aria-label={d < 0 ? "Previous review" : "Next review"}
                  >
                    <ChevronIcon direction={d < 0 ? "left" : "right"} className="size-5" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
