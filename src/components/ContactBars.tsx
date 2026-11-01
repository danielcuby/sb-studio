"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { site } from "@/config/site";
import { WhatsAppIcon } from "./icons";

/** Sticky Book / WhatsApp bar on mobile, floating WhatsApp button on desktop. Both appear once you scroll past the hero. */
export default function ContactBars({ alwaysVisible = false }: { alwaysVisible?: boolean }) {
  const [show, setShow] = useState(alwaysVisible);

  useEffect(() => {
    if (alwaysVisible) return;
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 0.6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [alwaysVisible]);

  return (
    <>
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-ink/90 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md transition-transform duration-500 ease-[var(--ease-out-expo)] md:hidden ${
          show ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="grid grid-cols-2 gap-2">
          <Link href="/book" className="btn btn-primary min-h-12" tabIndex={show ? 0 : -1}>
            Book
          </Link>
          <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-ghost min-h-12" tabIndex={show ? 0 : -1}>
            <WhatsAppIcon className="size-5" />
            WhatsApp
          </a>
        </div>
      </div>

      <a
        href={site.whatsapp}
        target="_blank"
        rel="noopener"
        aria-label="Message SB Studio on WhatsApp"
        className={`group fixed bottom-6 right-6 z-40 hidden items-center gap-0 overflow-hidden rounded-full bg-brass p-4 text-ink shadow-[0_10px_40px_-10px_rgb(195_154_90/0.6)] transition-all duration-500 ease-[var(--ease-out-expo)] hover:gap-2 hover:bg-brass-bright hover:pr-6 md:flex ${
          show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
        }`}
      >
        <WhatsAppIcon className="size-6" />
        <span className="max-w-0 whitespace-nowrap font-semibold transition-[max-width] duration-500 group-hover:max-w-40">
          WhatsApp us
        </span>
      </a>
    </>
  );
}
