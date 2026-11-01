import "server-only";
import webpush from "web-push";
import { site } from "@/config/site";
import { getSupabase } from "./supabase";
import { formatDateLong, formatTime, localDateKey } from "./time";

/**
 * Phone notifications to Shlomo's devices (turned on in /admin). Optional: needs the VAPID keys
 * and PUSH_SECRET (see README). Without them nothing is sent and booking still works.
 */
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const secret = process.env.PUSH_SECRET;

type Note = { name: string; serviceName: string; startsAt: string };

export const notifyNewBooking = (b: Note) => notify(b, `New booking: ${b.name}`);
export const notifyCancelled = (b: Note) => notify(b, `Cancelled: ${b.name}`, "The slot is free again. ");

async function notify(b: Note, title: string, prefix = "") {
  const db = getSupabase();
  if (!publicKey || !privateKey || !secret || !db) return;
  webpush.setVapidDetails(`${site.url}/admin`, publicKey, privateKey);

  const { data, error } = await db.rpc("get_push_subscriptions", { p_secret: secret });
  if (error) return console.error("get_push_subscriptions failed", error);

  const payload = JSON.stringify({
    title,
    body: `${prefix}${b.serviceName}, ${formatDateLong(b.startsAt)} at ${formatTime(b.startsAt)}`,
    url: `/admin?day=${localDateKey(new Date(b.startsAt))}`,
  });

  await Promise.allSettled(
    (data as { endpoint: string; p256dh: string; auth: string }[]).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 24 });
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        // 404/410: the phone unsubscribed or the app was removed. Forget that device.
        if (status === 404 || status === 410) await db.rpc("remove_push_subscription", { p_secret: secret, p_endpoint: s.endpoint });
        else console.error("Push failed", status, e);
      }
    }),
  );
}
