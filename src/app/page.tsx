import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import Gallery from "@/components/Gallery";
import About from "@/components/About";
import Reviews from "@/components/Reviews";
import Location from "@/components/Location";
import FinalCta from "@/components/FinalCta";
import Footer from "@/components/Footer";
import ContactBars from "@/components/ContactBars";
import { visibleReviews } from "@/config/reviews";
import { getHours } from "@/lib/hours";

export default async function Home() {
  const reviews = visibleReviews();
  const hours = await getHours();
  return (
    <>
      <Header />
      <main id="main">
        <Hero hours={hours} />
        <Services />
        <Gallery />
        <About />
        {reviews.length > 0 && <Reviews reviews={reviews} />}
        <Location hours={hours} />
        <FinalCta />
      </main>
      <Footer />
      <ContactBars />
    </>
  );
}
