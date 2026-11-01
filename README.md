# SB Studio

Website and online booking for SB Studio, Shlomo's barber studio in Gibraltar.
Next.js (App Router) + TypeScript + Tailwind, Supabase (database + admin login), hosted on Vercel.
The original brief is in [PROJECT_BRIEF.md](PROJECT_BRIEF.md).

## Change the content (no coding needed beyond editing text)

| What | File |
| --- | --- |
| Opening hours | Shlomo sets them himself in the admin app (Settings → Your usual week, or one date in the calendar) |
| Address, phone, WhatsApp, booking rules (notice, cancel window), Shlomo's bio, default hours | `src/config/site.ts` |
| Services, prices, durations | `src/config/services.ts` |
| Reviews | `src/config/reviews.ts` |
| Photos (paths and alt text) | `src/config/images.ts` (files in `public/images/`, credits in `public/images/CREDITS.md`) |

**Address:** `site.address` and `site.mapQuery` are placeholders. Fill them in to fix the footer, map, emails and Google listing data.

**Reviews:** the six reviews are samples (`placeholder: true`). They show with a "Sample" tag when running locally and are **hidden on the live site**. Add real ones with `placeholder: false` (and delete the samples) and the section appears automatically.

**Photos:** to use Shlomo's own photos, put them in `public/images/` and point `src/config/images.ts` at them. Keep the stated width/height roughly right (the site crops to fit).

## Run it locally

```bash
npm install
npm run dev          # http://localhost:3000
```

Needs `.env.local` (copy `.env.example`). Without Supabase keys the site still works; the booking page then asks people to book on WhatsApp.

## Checks

```bash
npm run typecheck
npm run lint
npm test             # Playwright: builds the site, runs on desktop + mobile. Booking calls are mocked, nothing is written to the database.
npm run build
```

## How booking works

- The customer picks a service, a day and a free time, then gives name + WhatsApp number (email and a note are optional). Nothing is paid online.
- Free times come from Shlomo's hours (set in the admin app), minus existing bookings and blocked time. A day can have several blocks (e.g. 10:00–12:00, 15:00–16:00, 20:00–00:00) and an appointment must fit inside one block. Times are offered every 15 minutes, at least 3 hours ahead, up to 30 days ahead (all configurable in `site.booking`; the database also refuses bookings less than 3 hours away).
- **Cancelling:** after booking, the customer gets a private cancel link (on the confirmation screen, in the calendar file and in the email if they gave one). It works until 24 hours before the appointment; after that the page tells them to WhatsApp. Shlomo gets a notification when someone cancels.
- **One chair:** the database refuses two overlapping bookings (an exclusion constraint), so two people can't grab the same slot even at the same second.
- The public can't read bookings. The site only calls two database functions: "which times are busy" (times only, no names) and "create a booking".

### Shlomo's admin app: https://sb-studio-mu.vercel.app/admin

Works without a custom domain. It installs as its own app ("SB Bookings") on his phone: open the link, then **iPhone:** Share → Add to Home Screen, **Android (Chrome):** menu → Install app. He stays signed in.

- **Notifications:** tap "Turn on notifications" in the app. Every new booking pings that device; tapping it opens that day. (iPhone needs iOS 16.4+ and the app opened from the home screen.)
- **Calendar:** a month view with the number of bookings on each day. Tap a day to see its bookings, change that date's hours only ("Change this day", or "Day off"), and add bookings taken by phone. Mark done / no-show, or cancel (frees the slot).
- **Next 7 days:** every upcoming booking, day by day.
- **Settings → Your usual week:** the hours for each weekday, with as many blocks per day as he likes. An end time of 00:00 means midnight. Customers can only book inside them, and the website's opening hours update straight away.
- **Settings → Holidays and time off:** block several days or a few hours.

Create an admin login (run on your computer, needs `SUPABASE_SECRET_KEY` in `.env.local`). It asks for the email and password (hidden):

```bash
npm run admin:add
```

Or in one go: `npm run admin:add -- shlomo@example.com "a-long-password"`.

Running it again for an existing email makes them an admin, and changes their password if you give one.

### Emails (optional, Resend)

Set `RESEND_API_KEY` to send a confirmation to customers who give an email, and `BOOKING_NOTIFY_EMAIL` to get a "new booking" email. `RESEND_FROM` must be on a domain verified in Resend. Leave `RESEND_API_KEY` empty and no emails are sent; booking still works.

## Supabase (database)

Project **sb-studio** (ref `gqahnujcguiwyscupkmt`, London) in its own **SB Studio** organisation, separate from other apps.

- Keys go in `.env.local` (never committed). Dashboard → Project Settings → API Keys.
- One-time per computer: `npx supabase login`, then `npx supabase link --project-ref gqahnujcguiwyscupkmt`.
- Database changes are SQL files in `supabase/migrations/`. Never change tables by hand in the dashboard.

```bash
npx supabase migration new <name>   # new empty migration file
npm run db:push                     # apply new migrations
```

## Hosting (Vercel)

GitHub repo connected to the Vercel project **sb-studio**. Pushing to `main` deploys the live site; every other branch / pull request gets its own preview link.

Environment variables (Vercel → Project → Settings → Environment Variables): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL`, and optionally the three Resend ones. **Never add `SUPABASE_SECRET_KEY` there.**

When you add a custom domain, update `NEXT_PUBLIC_SITE_URL` to it and redeploy.

## Design

Smoky charcoal and bone with one brushed-brass accent. Headings in Big Shoulders (condensed, like shop-window signage), body in Schibsted Grotesk. The hero headline reveals line by line in CSS on first paint; scroll reveals use one shared observer; GSAP (parallax) and Lenis (smooth scrolling) load after the page is idle. All motion is off for people who set "reduce motion".
