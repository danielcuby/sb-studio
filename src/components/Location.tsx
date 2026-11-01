import { site, type WeeklyHours } from "@/config/site";
import HoursList from "./HoursList";
import OpenStatus from "./OpenStatus";
import Reveal from "./Reveal";
import { PhoneIcon, PinIcon, WhatsAppIcon } from "./icons";

export default function Location({ hours }: { hours: WeeklyHours }) {
  const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(site.mapQuery)}&z=16&output=embed`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(site.mapQuery)}`;
  const { street, city, postcode } = site.address;

  return (
    <section id="visit" className="border-t border-line bg-coal py-24 md:py-36" aria-labelledby="visit-title">
      <div className="container-x grid gap-12 md:grid-cols-[5fr_6fr] md:gap-16">
        <div>
          <Reveal>
            <h2 id="visit-title" className="text-[clamp(3.2rem,8vw,6.5rem)] uppercase">
              Find the studio
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <address className="mt-8 flex gap-3 not-italic text-lg text-bone/90">
              <PinIcon className="mt-1 size-5 shrink-0 text-brass" />
              <span>
                {street}
                <br />
                {city} {postcode}
                <br />
                <a href={directions} target="_blank" rel="noopener" className="text-base text-brass-bright underline decoration-brass/40 underline-offset-4 hover:decoration-brass">
                  Get directions
                </a>
              </span>
            </address>
          </Reveal>
          <Reveal delay={0.14}>
            <div className="mt-10">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-sans text-lg font-semibold">Opening hours</h3>
                <OpenStatus hours={hours} />
              </div>
              <HoursList hours={hours} />
            </div>
          </Reveal>
          <Reveal delay={0.2}>
            <div className="mt-10 flex flex-wrap gap-3">
              <a href={site.phoneHref} className="btn btn-ghost">
                <PhoneIcon className="size-5" />
                Call {site.phone}
              </a>
              <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-primary">
                <WhatsAppIcon className="size-5" />
                WhatsApp
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.1} className="min-h-[22rem] md:min-h-0">
          <div className="relative h-full min-h-[22rem] overflow-hidden rounded-sm border border-line">
            <iframe
              src={mapSrc}
              title={`Map showing ${site.name} in ${city}`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="absolute inset-0 h-full w-full [filter:grayscale(1)_invert(0.9)_contrast(0.85)_sepia(0.25)]"
            />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
