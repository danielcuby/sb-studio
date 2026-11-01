// Every photo on the site. To use Shlomo's own photos, drop them in /public/images and change the paths here.
// Credits for the current stock photos: /public/images/CREDITS.md

export type SiteImage = { src: string; alt: string; width: number; height: number };

const img = (src: string, alt: string, width: number, height: number): SiteImage => ({ src, alt, width, height });

export const images = {
  hero: img("/images/hero-chair.jpg", "A single leather barber chair under warm pendant lights", 2400, 1600),
  barber: img("/images/barber-razor.jpg", "Barber's tattooed hands lining up a fade with a straight razor", 1600, 2000),
  tools: img("/images/tools.jpg", "Clippers, scissors and a comb laid out on slate", 1600, 1067),
  cta: img("/images/clipper-closeup.jpg", "Close-up of clippers fading the side of a client's head", 1600, 1067),
  // Gallery order = display order.
  gallery: [
    img("/images/gallery-1.jpg", "Scissor-over-comb fade with a full beard", 1200, 1500),
    img("/images/gallery-2.jpg", "Skin fade being blended with clippers", 1200, 1500),
    img("/images/gallery-3.jpg", "Fade and beard line-up in profile", 1200, 1500),
    img("/images/gallery-4.jpg", "Client leaning back for a beard trim", 1200, 1500),
    img("/images/gallery-5.jpg", "Beard being shaped with clippers in a dark shop", 1200, 1500),
    img("/images/gallery-6.jpg", "Taper being cleaned up behind the ear", 1200, 1500),
    img("/images/gallery-7.jpg", "Hairline being lined up with a trimmer", 1200, 1500),
    img("/images/gallery-8.jpg", "Black and white shot of a beard trim with scissors", 1200, 1500),
  ],
};
