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

export default function Home() {
  const reviews = visibleReviews();
  return (
    <>
      <Header />
      <main id="main">
        <Hero />
        <Services />
        <Gallery />
        <About />
        {reviews.length > 0 && <Reviews reviews={reviews} />}
        <Location />
        <FinalCta />
      </main>
      <Footer />
      <ContactBars />
    </>
  );
}
