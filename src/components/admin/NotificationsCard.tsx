"use client";

import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

type State = "checking" | "unsupported" | "needs-install" | "off" | "on" | "blocked" | "not-configured";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

/** Turns on phone/computer notifications for new bookings on this device. */
export default function NotificationsCard({ userId }: { userId: string }) {
  const db = getSupabase()!;
  const [state, setState] = useState<State>("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!vapidKey) return setState("not-configured");
      const isIos = /iPhone|iPad|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState(isIos && !standalone ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setState("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })().catch(() => setState("unsupported"));
  }, []);

  async function turnOn() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setState(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey!) });
      const json = sub.toJSON();
      const { error } = await db
        .from("push_subscriptions")
        .upsert({ endpoint: sub.endpoint, p256dh: json.keys!.p256dh, auth: json.keys!.auth, user_id: userId });
      setState(error ? "off" : "on");
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
    setState("off");
    setBusy(false);
  }

  const text: Record<State, string> = {
    checking: "Checking…",
    unsupported: "This browser can't show notifications. Try Chrome on Android, or Safari on iPhone after adding this page to your home screen.",
    "needs-install": "On iPhone: tap Share, then “Add to Home Screen”. Open SB Bookings from your home screen and turn notifications on there.",
    off: "Get a notification on this device the moment someone books.",
    on: "On. This device gets a notification for every new booking.",
    blocked: "Notifications are blocked for this site. Allow them in your browser or phone settings, then reload.",
    "not-configured": "Notifications aren't set up on the server yet (missing VAPID keys).",
  };

  return (
    <section className="rounded-sm border border-line bg-coal p-5">
      <h2 className="flex items-center justify-between font-semibold">
        Booking notifications
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${state === "on" ? "bg-ok/20 text-ok" : "bg-ash text-stone"}`}>{state === "on" ? "On" : "Off"}</span>
      </h2>
      <p className="mt-2 text-sm text-bone/80">{text[state]}</p>
      {state === "off" && (
        <button onClick={turnOn} disabled={busy} className="btn btn-primary mt-4 min-h-11 w-full">
          Turn on notifications
        </button>
      )}
      {state === "on" && (
        <button onClick={turnOff} disabled={busy} className="mt-3 text-xs text-stone underline underline-offset-4 hover:text-bone">
          Turn off on this device
        </button>
      )}
    </section>
  );
}
