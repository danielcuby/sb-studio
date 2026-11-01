"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { images } from "@/config/images";
import Reveal from "./Reveal";

const LightboxHost = dynamic(() => import("./Lightbox"), { ssr: false });

// Tall tiles give the grid rhythm on desktop.
const tall = new Set([0, 3, 5]);

export default function Gallery() {
  const [open, setOpen] = useState<number | null>(null);
  // The viewer's code loads the first time a photo is opened, then stays for its exit animation.
  const [viewerLoaded, setViewerLoaded] = useState(false);
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
              <button
                type="button"
                data-reveal="clip"
                style={{ "--reveal-delay": `${(i % 4) * 0.08}s` } as React.CSSProperties}
                onClick={() => {
                  setViewerLoaded(true);
                  setOpen(i);
                }}
                className="group relative block aspect-[4/5] w-full overflow-hidden rounded-sm bg-coal md:h-full"
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
              </button>
            </li>
          ))}
        </ul>
      </div>

      {viewerLoaded && <LightboxHost index={open} onChange={setOpen} />}
    </section>
  );
}
