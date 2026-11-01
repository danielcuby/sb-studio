"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { images } from "@/config/images";
import { site } from "@/config/site";
import { services, formatPrice } from "@/config/services";
import { WhatsAppIcon } from "./icons";
import OpenStatus from "./OpenStatus";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const lines = ["One chair.", "One barber.", "Your time."];
const from = Math.min(...services.map((s) => s.price));

export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      // Parallax drift as you scroll away (the push-in on load is CSS, see globals.css).
      gsap.to(".hero-media", {
        yPercent: 18,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
      gsap.to(".hero-copy", {
        yPercent: -12,
        opacity: 0.2,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative isolate flex min-h-[100svh] flex-col justify-end overflow-hidden" aria-labelledby="hero-title">
      <div className="hero-media absolute inset-0 -z-10">
        <Image
          src={images.hero.src}
          alt={images.hero.alt}
          fill
          priority
          fetchPriority="high"
          sizes="100vw"
          className="hero-img object-cover object-[50%_40%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(to_top,var(--color-ink)_4%,rgb(20_18_16/0.82)_38%,rgb(20_18_16/0.35)_75%,rgb(20_18_16/0.55))]" />
      </div>

      <div className="hero-copy container-x pb-28 pt-32 md:pb-20">
        <h1 id="hero-title" className="text-[clamp(4.2rem,15vw,12.5rem)] uppercase">
          {lines.map((line, i) => (
            <span key={line} className="block overflow-hidden pb-[0.06em]">
              <span className="hero-line block" style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
                {line}
              </span>
            </span>
          ))}
        </h1>

        <div
          className="hero-sub mt-7 grid gap-8 md:mt-10 md:grid-cols-[minmax(0,34rem)_auto] md:items-end md:justify-between"
        >
          <p className="max-w-[34rem] text-lg text-bone/85 md:text-xl">
            Skin fades, tapers and beard work by {site.barber}, in Gibraltar. Cuts from {formatPrice(from)}. Book a slot
            online, pay in person.
          </p>
          <div className="flex flex-col gap-4 md:items-end">
            <div className="flex flex-wrap gap-3">
              <Link href="/book" className="btn btn-primary">
                Book now
              </Link>
              <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">
                <WhatsAppIcon className="size-5" />
                WhatsApp us
              </a>
            </div>
            <OpenStatus />
          </div>
        </div>
      </div>
    </section>
  );
}
