import Image from "next/image";
import Link from "next/link";
import { images } from "@/config/images";
import { site } from "@/config/site";
import Reveal from "./Reveal";
import { WhatsAppIcon } from "./icons";

export default function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden py-28 md:py-44" aria-labelledby="cta-title">
      <Image src={images.cta.src} alt="" fill sizes="100vw" className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-ink/75" />
      <div className="container-x">
        <Reveal>
          <h2 id="cta-title" className="max-w-[12ch] text-[clamp(3.6rem,11vw,9rem)] uppercase">
            Your slot is waiting.
          </h2>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mt-6 max-w-md text-lg text-bone/85">
            Pick a time that suits you in under a minute. {site.payment}
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/book" className="btn btn-primary">
              Book now
            </Link>
            <a href={site.whatsapp} target="_blank" rel="noopener" className="btn btn-ghost">
              <WhatsAppIcon className="size-5" />
              WhatsApp us
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
