import type { Metadata, Viewport } from "next";
import Link from "next/link";
import AdminApp from "@/components/admin/AdminApp";
import { Logo } from "@/components/icons";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
  // Its own installable app ("SB Bookings") so Shlomo can add it to his home screen and get notifications.
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "SB Bookings", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#141210" };

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
