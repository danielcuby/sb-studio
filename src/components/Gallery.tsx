"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { images } from "@/config/images";
import { ChevronIcon, CloseIcon } from "./icons";
import Reveal from "./Reveal";
import { lockScroll } from "@/lib/scroll-lock";

const ease = [0.16, 1, 0.3, 1] as const;
// Tall tiles give the grid rhythm on desktop.
const tall = new Set([0, 3, 5]);

export default function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const items = images.gallery;

  return (
    <section id="work" className="py-24 md:py-36" aria-labelledby="work-title">
      <div className="container-x">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal>
            <h2 id="work-title" className="text-[clamp(3.2rem,8vw,6.5rem)] uppercase">
              Recent work
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-stone">Fades, tapers and beards from the chair. Tap any photo to see it larger.</p>
          </Reveal>
        </div>

        <ul className="mt-14 grid grid-cols-2 gap-2 md:mt-20 md:grid-flow-dense md:grid-cols-4 md:gap-3">
          {items.map((im, i) => (
            <li key={im.src} className={tall.has(i) ? "md:row-span-2" : ""}>
              <motion.button
                type="button"
                onClick={() => setOpen(i)}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-sm bg-coal md:h-full"
                initial={reduce ? false : { clipPath: "inset(100% 0 0 0)" }}
                whileInView={{ clipPath: "inset(0% 0 0 0)" }}
                viewport={{ once: true, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 1.1, delay: (i % 4) * 0.08, ease }}
                aria-label={`Open photo: ${im.alt}`}
              >
                <Image
                  src={im.src}
                  alt={im.alt}
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover transition-[transform,filter] duration-[1.2s] ease-[var(--ease-out-expo)] group-hover:scale-[1.06] group-hover:brightness-110"
                />
                <span className="absolute inset-0 ring-1 ring-inset ring-bone/0 transition group-hover:ring-brass/60" />
              </motion.button>
            </li>
          ))}
        </ul>
      </div>

      <AnimatePresence>
        {open !== null && <Lightbox index={open} onChange={setOpen} onClose={() => setOpen(null)} />}
      </AnimatePresence>
    </section>
  );
}

function Lightbox({ index, onChange, onClose }: { index: number; onChange: (i: number) => void; onClose: () => void }) {
  const items = images.gallery;
  const im = items[index];
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = useCallback((d: number) => onChange((index + d + items.length) % items.length), [index, items.length, onChange]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const unlock = lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      unlock();
      prevFocus?.focus();
    };
  }, [go, onClose]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClose}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={im.src}
          className="relative h-[78svh] w-[min(92vw,62svh)]"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.45, ease }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.x < -60) go(1);
            else if (info.offset.x > 60) go(-1);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Image src={im.src} alt={im.alt} fill sizes="(min-width: 768px) 62vh, 92vw" className="rounded-sm object-cover" draggable={false} />
        </motion.div>
      </AnimatePresence>

      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-sm text-stone" aria-live="polite">
        {index + 1} / {items.length}
      </p>
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid size-12 place-items-center rounded-full border border-line bg-coal text-bone transition hover:border-brass hover:text-brass-bright"
        aria-label="Close photo viewer"
      >
        <CloseIcon className="size-5" />
      </button>
      {[-1, 1].map((d) => (
        <button
          key={d}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            go(d);
          }}
          className={`absolute top-1/2 hidden size-14 -translate-y-1/2 place-items-center rounded-full border border-line bg-coal text-bone transition hover:border-brass hover:text-brass-bright md:grid ${
            d < 0 ? "left-6" : "right-6"
          }`}
          aria-label={d < 0 ? "Previous photo" : "Next photo"}
        >
          <ChevronIcon direction={d < 0 ? "left" : "right"} className="size-6" />
        </button>
      ))}
    </motion.div>
  );
}
