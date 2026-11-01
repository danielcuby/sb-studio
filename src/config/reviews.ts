// Customer reviews. The six below are SAMPLES (placeholder: true).
// - In development they show with a small "Sample" tag.
// - In production the reviews section is hidden until at least one review has placeholder: false.
// To go live: add real reviews with placeholder: false, and delete the samples.

export type Review = {
  name: string;
  text: string;
  rating: 1 | 2 | 3 | 4 | 5;
  // Optional, e.g. "Google" or "WhatsApp"
  source?: string;
  placeholder: boolean;
};

export const reviews: Review[] = [
  {
    name: "Daniel R.",
    text: "Best skin fade I've had in Gibraltar. Shlomo takes his time and the blend is perfect every time.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "Marcus T.",
    text: "Booked online in a minute, walked in at my time and sat straight down. No waiting around.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "Aaron L.",
    text: "Got the haircut and beard. The beard line-up is razor sharp. Paid with Revolut, easy.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "James P.",
    text: "Brought my son for a student cut. Shlomo was patient with him and he loves it. We'll be back.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "Kieran M.",
    text: "Proper barber. Listens to what you want and gives honest advice on what will suit you.",
    rating: 5,
    placeholder: true,
  },
  {
    name: "Luis G.",
    text: "Clean studio, good chat, sharp taper. Fair prices for the quality you get.",
    rating: 5,
    placeholder: true,
  },
];

/** Reviews to show on the page, or an empty list to hide the section. */
export function visibleReviews(isProduction = process.env.NODE_ENV === "production") {
  if (!isProduction) return reviews;
  return reviews.filter((r) => !r.placeholder);
}
