"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "./icons";

const links = [
  { href: "/#services", label: "Prices" },
  { href: "/#work", label: "Work" },
  { href: "/#about", label: "Shlomo" },
  { href: "/#visit", label: "Visit" },
];

export default function Header({ solid = false }: { solid?: boolean }) {
  const [scrolled, setScrolled] = useState(solid);

  useEffect(() => {
    if (solid) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [solid]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter] duration-500 ${
        scrolled ? "border-b border-line/70 bg-ink/80 backdrop-blur-md" : "border-b border-transparent"
      }`}
    >
      <div className="container-x flex h-16 items-center justify-between md:h-[4.5rem]">
        <Link href="/" className="text-bone">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="relative text-[0.95rem] text-bone/80 transition-colors hover:text-bone after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-right after:scale-x-0 after:bg-brass after:transition-transform after:duration-500 hover:after:origin-left hover:after:scale-x-100"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/book" className="btn btn-primary min-h-10 px-5 text-[0.95rem]">
          Book now
        </Link>
      </div>
    </header>
  );
}
