import { site, weekdayNames } from "@/config/site";
import { services, currency } from "@/config/services";
import { images } from "@/config/images";

/** schema.org BarberShop (a LocalBusiness) for search engines. */
export function localBusinessSchema() {
  const prices = services.map((s) => s.price);
  const hours = Object.entries(site.hours)
    .filter(([, h]) => h)
    .map(([day, h]) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: `https://schema.org/${weekdayNames[Number(day)]}`,
      opens: h!.open,
      closes: h!.close,
    }));

  return {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    "@id": `${site.url}/#business`,
    name: site.name,
    description: site.description,
    url: site.url,
    image: `${site.url}${images.hero.src}`,
    telephone: site.phone,
    priceRange: `£${Math.min(...prices)}–£${Math.max(...prices)}`,
    currenciesAccepted: currency,
    paymentAccepted: "Cash, Revolut",
    address: {
      "@type": "PostalAddress",
      streetAddress: site.address.street,
      addressLocality: site.address.city,
      postalCode: site.address.postcode,
      addressCountry: site.address.country,
    },
    ...(site.geo ? { geo: { "@type": "GeoCoordinates", latitude: site.geo.lat, longitude: site.geo.lng } } : {}),
    openingHoursSpecification: hours,
    employee: { "@type": "Person", name: site.barber, jobTitle: "Barber" },
    sameAs: [site.instagram].filter(Boolean),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({
        "@type": "Offer",
        price: s.price,
        priceCurrency: currency,
        itemOffered: { "@type": "Service", name: s.name, description: s.description },
      })),
    },
  };
}
