"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { images } from "@/config/images";
import { site } from "@/config/site";
import Reveal from "./Reveal";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const specialities = ["Skin fades and tapers", "Beard shaping and line-ups", "Student cuts for under-18s"];

export default function About() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        ".about-img",
        { yPercent: -8 },
        { yPercent: 8, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
      );
    },
    { scope: root },
  );

  return (
    <section ref={root} id="about" className="border-y border-line bg-coal py-24 md:py-36" aria-labelledby="about-title">
      <div className="container-x grid items-center gap-12 md:grid-cols-[5fr_6fr] md:gap-20">
        <Reveal>
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm">
              {/* PLACEHOLDER photo: swap for a portrait of Shlomo in src/config/images.ts */}
              <Image
                src={images.barber.src}
                alt={images.barber.alt}
                fill
                sizes="(min-width: 768px) 40vw, 100vw"
                className="about-img scale-[1.18] object-cover"
              />
            </div>
            <span aria-hidden="true" className="absolute -bottom-4 -right-4 -z-0 h-2/3 w-2/3 border-b-2 border-r-2 border-brass/70" />
          </div>
        </Reveal>

        <div>
          <Reveal>
            <h2 id="about-title" className="text-[clamp(3.2rem,8vw,6.5rem)] uppercase">
              {site.about.heading}
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-8 max-w-[36rem] space-y-5 text-lg text-bone/85">
              {site.about.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </Reveal>
          <Reveal delay={0.18}>
            <ul className="mt-10 divide-y divide-line border-y border-line">
              {specialities.map((s) => (
                <li key={s} className="flex items-center gap-4 py-4 text-bone">
                  <span aria-hidden="true" className="h-px w-6 bg-brass" />
                  {s}
                </li>
              ))}
            </ul>
            <Link href="/book" className="btn btn-primary mt-10">
              Book with {site.barber}
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
