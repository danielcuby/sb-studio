// Business details. Edit this file to change contact info, address, hours and booking rules.

export const site = {
  name: "SB Studio",
  barber: "Shlomo",
  // Used for canonical URLs, sitemap and Open Graph. Set NEXT_PUBLIC_SITE_URL in Vercel once you have a domain.
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://sb-studio.vercel.app",
  description:
    "Fades, tapers and beard work by Shlomo in Gibraltar. One chair, one barber: book your slot online and pay in person, cash or Revolut.",

  phone: "+350 5400 8727",
  phoneHref: "tel:+35054008727",
  whatsapp: "https://wa.me/35054008727",
  // Optional, leave empty to hide.
  email: "",
  instagram: "",

  // PLACEHOLDER: fill in the real address. `mapQuery` is what Google Maps searches for in the embed.
  address: {
    street: "Main Street (address to follow)",
    city: "Gibraltar",
    postcode: "GX11 1AA",
    country: "GI",
  },
  mapQuery: "Main Street, Gibraltar",
  // Optional, improves the LocalBusiness schema. Leave null until you know them.
  geo: null as { lat: number; lng: number } | null,

  timezone: "Europe/Gibraltar",

  // Opening hours per weekday (0 = Sunday). `null` = closed. Times are 24h "HH:mm", local Gibraltar time.
  hours: {
    0: null,
    1: { open: "10:00", close: "19:00" },
    2: { open: "10:00", close: "19:00" },
    3: { open: "10:00", close: "19:00" },
    4: { open: "10:00", close: "19:00" },
    5: { open: "10:00", close: "19:00" },
    6: { open: "10:00", close: "19:00" },
  } as Record<number, { open: string; close: string } | null>,

  booking: {
    // Start times are offered every N minutes.
    slotIntervalMinutes: 15,
    // Earliest a customer can book, counted from now.
    minNoticeMinutes: 60,
    // How far ahead the calendar goes.
    maxDaysAhead: 30,
  },

  payment: "Pay in person. Cash or Revolut.",

  about: {
    heading: "Meet Shlomo",
    // PLACEHOLDER copy, rewrite in Shlomo's own words.
    paragraphs: [
      "SB Studio is Shlomo's own space: one chair, no queue, no rush. Every appointment is his and yours alone, from the consultation to the last line-up.",
      "He specialises in clean skin fades, tapers and sharp beard work, and takes the time to get them right. Tell him how you wear your hair, and he'll cut it to grow out well, not just look good on the day.",
    ],
  },
} as const;

export const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
