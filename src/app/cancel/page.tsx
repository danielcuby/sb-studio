import type { Metadata } from "next";
import { Suspense } from "react";
import Header from "@/components/Header";
import CancelBooking from "@/components/booking/CancelBooking";

export const metadata: Metadata = {
  title: "Cancel your booking",
  robots: { index: false, follow: false },
};

export default function CancelPage() {
  return (
    <>
      <Header solid />
      <main id="main" className="container-x min-h-dvh pb-24 pt-28 md:pt-36">
        <Suspense fallback={<div className="h-[40vh]" />}>
          <CancelBooking />
        </Suspense>
      </main>
    </>
  );
}
