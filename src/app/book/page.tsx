import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import BookingFlow from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Pick a service, day and time with Shlomo at SB Studio, Gibraltar. Pay in person, cash or Revolut.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return (
    <>
      <Header solid />
      <main id="main" className="container-x min-h-dvh pb-24 pt-28 md:pt-36">
        <Suspense fallback={<div className="h-[60vh]" />}>
          <BookingFlow />
        </Suspense>
      </main>
    </>
  );
}
