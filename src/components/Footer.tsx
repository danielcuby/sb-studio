import Link from "next/link";
import { site } from "@/config/site";
import { Logo } from "./icons";

export default function Footer() {
  return (
    <footer className="border-t border-line pb-28 pt-14 md:pb-14">
      <div className="container-x grid gap-10 text-sm text-stone md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Logo className="text-bone" />
          <p className="mt-4 max-w-xs">One chair, one barber, in {site.address.city}. Pay in person, cash or Revolut.</p>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold text-bone">Visit</h2>
          <p>
            {site.address.street}
            <br />
            {site.address.city} {site.address.postcode}
          </p>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold text-bone">Contact</h2>
          <ul className="space-y-1.5">
            <li>
              <a href={site.phoneHref} className="hover:text-bone">
                {site.phone}
              </a>
            </li>
            <li>
              <a href={site.whatsapp} target="_blank" rel="noopener" className="hover:text-bone">
                WhatsApp
              </a>
            </li>
            {site.instagram && (
              <li>
                <a href={site.instagram} target="_blank" rel="noopener" className="hover:text-bone">
                  Instagram
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <h2 className="mb-3 font-sans text-sm font-semibold text-bone">Book</h2>
          <ul className="space-y-1.5">
            <li>
              <Link href="/book" className="hover:text-bone">
                Book online
              </Link>
            </li>
            <li>
              <Link href="/#services" className="hover:text-bone">
                Prices
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="container-x mt-12 flex flex-wrap justify-between gap-3 text-xs text-stone/70">
        <p>© {site.name}, Gibraltar</p>
        <p>
          Photos from{" "}
          <a href="https://unsplash.com" target="_blank" rel="noopener" className="underline underline-offset-2 hover:text-bone">
            Unsplash
          </a>
        </p>
      </div>
    </footer>
  );
}
