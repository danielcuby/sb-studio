# Project brief: SB Studio

> Saved verbatim from the original request (1 November 2026). The original message was cut off
> partway through the "Booking system" section; see "Assumptions for the missing part" at the end.

Build a complete, production-ready website for SB Studio, a barber studio in Gibraltar. Work fast and autonomously: don't stop for my approval between stages. Only ask me something if you're truly blocked (e.g. a login I need to do myself). I want it to look like a premium, award-winning site: modern, high-converting, with smooth animations.

## Step 0: Setup (do this first, yourself)
1. Install these plugins by running these commands in the shell:
   claude plugin install frontend-design@claude-plugins-official
   claude plugin install playwright@claude-plugins-official
   claude plugin install context7@claude-plugins-official
   If they don't activate in this session, tell me to run /reload-plugins, then carry on. Use the frontend-design skill for all visual decisions, Context7 for up-to-date library docs, and Playwright to test.
2. Create a new folder at ~/Desktop/GitHub/sb-studio and build everything in there. Run git init, commit as you go with clear messages, create a new GitHub repo called sb-studio (use the gh CLI) and push to it.
3. Save this entire brief as PROJECT_BRIEF.md in the root of the repo.
4. I already have Supabase and Vercel accounts. Look in ~/Desktop/GitHub for my other projects (FlickFinder and my debate app) to see how I've set up Supabase and Vercel there: which CLIs I use, how env variables are structured, how deployment is wired. Copy the same approach. Rules:
   - Read only. Do not change, migrate or redeploy anything in those other projects.
   - Create a NEW Supabase project and a NEW Vercel project for SB Studio. Never reuse or touch the databases of my other apps.
   - Don't copy their secret keys into this repo. Use the Supabase and Vercel CLIs (I should already be logged in; if not, tell me the exact login command to run).

## Business details
- Name: SB Studio
- Barber: Shlomo (only barber, one chair, so one booking per time slot)
- Location: Gibraltar (put the address in a config file as a placeholder I'll fill in)
- Opening hours: use Mon–Sat 10:00–19:00, closed Sunday, as a default in a config file so I can change it
- Contact / WhatsApp: +350 5400 8727 (WhatsApp link: https://wa.me/35054008727)
- Payment: cash or Revolut only, paid in person at the appointment. No online payment anywhere on the site. Make this clear on the services section, booking flow and confirmation.

## Services and prices
- Student haircut (under 18): £8, 30 min
- Adult haircut: £10, 30 min
- Haircut & beard: £14, 45 min
Keep services, prices and durations in one config file.

## Tech stack
- Next.js (App Router) + TypeScript + Tailwind CSS
- Animations: Framer Motion and/or GSAP with ScrollTrigger, plus Lenis smooth scrolling
- Database + admin auth: Supabase (Postgres + Supabase Auth)
- Booking emails: Resend, optional, behind an env variable so the site works without it
- Hosting: Vercel
- Secrets in .env.local (gitignored), plus a .env.example

## Photos
Find the photos yourself. Download high-quality, free-to-use photos from Unsplash or Pexels: barbershop interiors, fades, tapers, skin fades, beard trims, clippers, a barber at work. Pick ones that are dark and moody and look consistent together. Save them in /public/images, optimise them, and keep a credits list in /public/images/CREDITS.md. Keep all image paths in one config file so I can swap in Shlomo's real photos later. Don't use photos of recognisable celebrities.

## Public site (one long landing page + booking page)
1. Hero: full-screen, cinematic. Big bold headline, short tagline, dark moody background photo with subtle parallax/zoom. Two buttons: "Book now" (primary) and "WhatsApp us". Animated text reveal on load.
2. Services & prices: three cards with hover effects, price, duration, and a "Book this" button that opens the booking flow with that service preselected. Note: "Pay in person. Cash or Revolut."
3. Gallery: grid of haircut photos with scroll-reveal and a lightbox.
4. Meet Shlomo: short bio section with a photo placeholder.
5. Reviews: testimonial carousel. Write 6 sample reviews in a reviews config file, each with `placeholder: true`. In development, show them with a small "Sample" tag. In production, hide the reviews section entirely while all reviews are placeholders. It appears automatically once I add real reviews with `placeholder: false`.
6. Location & hours: embedded Google Map, address, opening hours, tap-to-call and WhatsApp buttons.
7. Final CTA banner + footer.
8. Sticky mobile bar at the bottom with "Book" and "WhatsApp" buttons. Floating WhatsApp button on desktop.

Conversion details: fast load (next/image, aim for 90+ Lighthouse), mobile-first, clear CTAs above the fold and repeated down the page, SEO meta tags, Open Graph image, LocalBusiness schema markup, favicon.

Design direction: dark, premium barbershop feel. Black/charcoal with one strong accent colour (gold or brass), a distinctive display font for headings and a clean body font. No generic AI-looking gradients or default fonts. Micro-interactions on buttons and cards, scroll-triggered reveals, smooth transitions. Respect prefers-reduced-motion.

## Booking system
- Flow: choose service → pick a date (calendar) → pick an available time slot → name, phone (WhatsApp), optional

---

## Assumptions for the missing part

The brief stopped at "name, phone (WhatsApp), optional". These were filled in as sensible defaults and can be changed:

- Optional fields: email (for a confirmation email) and a note for Shlomo.
- Then a review step and a confirmation screen (with "Pay in person. Cash or Revolut.", add-to-calendar and a WhatsApp link).
- One booking per slot, enforced in the database (not only in the browser).
- Admin dashboard at `/admin` (Supabase Auth, admins only): see upcoming bookings, mark done / no-show, cancel, add bookings taken by phone, and block off time (holidays, breaks).
- Resend emails (optional): confirmation to the customer if they gave an email, and a "new booking" email to the shop.
