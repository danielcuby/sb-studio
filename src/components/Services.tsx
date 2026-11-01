import Link from "next/link";
import { services, formatPrice } from "@/config/services";
import { site } from "@/config/site";
import Reveal from "./Reveal";
import { CashIcon, ClockIcon } from "./icons";

export default function Services() {
  return (
    <section id="services" className="relative py-24 md:py-36" aria-labelledby="services-title">
      <div className="container-x">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <Reveal>
            <h2 id="services-title" className="text-[clamp(3.2rem,8vw,6.5rem)] uppercase">
              The price list
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="max-w-sm text-stone">
              Three services, fixed prices, no extras added at the chair. Pick one to see Shlomo&apos;s free slots.
            </p>
          </Reveal>
        </div>

        <ul className="mt-14 grid gap-4 md:mt-20 md:grid-cols-3 md:gap-5">
          {services.map((s, i) => (
            <li key={s.id}>
              <Reveal delay={i * 0.08} className="h-full">
                <article className="group relative flex h-full flex-col overflow-hidden rounded-sm border border-line bg-coal p-7 transition-[transform,border-color,background-color] duration-500 ease-[var(--ease-out-expo)] hover:-translate-y-1.5 hover:border-brass/60 hover:bg-ash md:p-9">
                  {/* Brass rule that draws across on hover */}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[3px] origin-left scale-x-0 bg-brass transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:scale-x-100"
                  />
                  <h3 className="font-sans text-xl font-semibold leading-tight">{s.name}</h3>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-stone">
                    <ClockIcon className="size-4" />
                    {s.durationMinutes} min
                  </p>
                  <p className="mt-10 font-display text-[6.5rem] font-extrabold leading-[0.8] text-brass-bright transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover:-translate-y-1 md:text-[7.5rem]">
                    {formatPrice(s.price)}
                  </p>
                  <p className="mt-6 flex-1 text-[0.98rem] text-bone/75">{s.description}</p>
                  <Link
                    href={`/book?service=${s.id}`}
                    className="btn btn-ghost mt-8 w-full"
                    aria-label={`Book a ${s.name.toLowerCase()}`}
                  >
                    Book this
                  </Link>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal>
          <p className="mt-8 flex items-center gap-3 border-l-2 border-brass pl-4 text-bone">
            <CashIcon className="size-6 shrink-0 text-brass" />
            <span>
              <strong className="font-semibold">{site.payment}</strong>{" "}
              <span className="text-stone">Nothing to pay online when you book.</span>
            </span>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
