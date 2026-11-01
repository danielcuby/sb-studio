"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { images } from "@/config/images";
import { ChevronIcon, CloseIcon } from "./icons";
import { lockScroll } from "@/lib/scroll-lock";

const ease = [0.16, 1, 0.3, 1] as const;

/** Full-screen photo viewer. Loaded only when someone opens a photo. */
export default function LightboxHost({ index, onChange }: { index: number | null; onChange: (i: number | null) => void }) {
  return (
    <AnimatePresence>{index !== null && <Lightbox index={index} onChange={onChange} onClose={() => onChange(null)} />}</AnimatePresence>
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
