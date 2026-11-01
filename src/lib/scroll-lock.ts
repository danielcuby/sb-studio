import type Lenis from "lenis";

let lenis: Lenis | null = null;

export const setLenis = (l: Lenis | null) => {
  lenis = l;
};

/** Stop page scrolling while a dialog is open (works with and without Lenis). */
export function lockScroll() {
  lenis?.stop();
  document.documentElement.style.overflow = "hidden";
  return () => {
    lenis?.start();
    document.documentElement.style.overflow = "";
  };
}
