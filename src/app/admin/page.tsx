import type { Metadata } from "next";
import Link from "next/link";
import AdminApp from "@/components/admin/AdminApp";
import { Logo } from "@/components/icons";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main id="main" className="container-x min-h-dvh py-8">
      <div className="mb-10 flex items-center justify-between">
        <Link href="/">
          <Logo />
        </Link>
        <span className="text-sm text-stone">Bookings</span>
      </div>
      <AdminApp />
    </main>
  );
}
