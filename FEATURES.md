# CribNotes — Feature Implementation Plan

## Context & Pricing Positioning

CribNotes will be priced at **$15 lifetime** — one-time purchase, no subscription, no upsells, no feature paywalls. The competitive position against Huckleberry and other freemium baby trackers is:

> *"Pay once. Own your data. No 3am paywalls."*

This roadmap is deliberately scoped: we do **not** try to out-feature paid competitors. We close the gaps that make trackers get uninstalled, then stop.

Prioritization uses MoSCoW (**M**ust / **S**hould / **C**ould / **W**on't). Each item notes rationale, schema/file impact, and rough effort (S = days, M = ~1 week, L = multi-week).

---

## Current Baseline (already shipped)

- **LogTypes:** WAKE, SLEEP, FEED (breast/bottle/both, oz/ml), DIAPER (wet/dirty/both), NURSE (duration + side), PUMP (volume)
- **Multi-child** with per-child scoping
- **Multi-caregiver** invites (PARENT / CARETAKER / BABYSITTER roles, role-based permissions)
- **Notes system** with audience targeting and edit permissions
- **Web Push** notifications (cron-driven feed reminders)
- **JSON data export**
- **PWA** install + service worker + offline shell
- **Analytics** — day/week/month line and bar charts

---

## MUST — Block Paid Launch

These are the changes required before charging anyone $15. Without them, refunds outpace conversions.

### M1. Live in-progress timers
Persistent timers for nursing, sleep, and pumping sessions that survive app close / phone lock.
- **Why:** #1 cause of tracker abandonment. Parents tap "start," put the phone down, and forget. Timer must be visible and resumable.
- **Schema:** add `startedAt` / `endedAt` (nullable) to `NurseLog`, `SleepLog`, `PumpLog`. Active session = `endedAt IS NULL`.
- **Files:** `prisma/schema.prisma`, `src/components/` (new `<ActiveTimerBanner />`), relevant log API routes
- **Effort:** M

### M2. Solid foods tracking
- **Why:** Table stakes. Every competitor has it. Its absence reads as "incomplete."
- **Schema:** extend `FeedType` enum with `SOLID`; add `foodName: String?` and reuse existing amount field
- **Files:** `prisma/schema.prisma`, feed log form components, analytics aggregation
- **Effort:** S

### M3. Real-time multi-caregiver sync
Replace REST polling with push-based updates so two parents don't double-log a feed at 3am.
- **Why:** Duplicate entries from concurrent caregivers = rage quit. The biggest functional win we can ship.
- **Approach:** Server-Sent Events (lightest infra fit for self-hosted Next.js) or WebSocket via a thin layer; broadcast log-create/update/delete events to other active sessions for the same child
- **Files:** new `src/app/api/events/route.ts` (SSE), client subscription hook, invalidate TanStack Query caches on event
- **Effort:** M

### M4. Pump side tracking
- **Why:** Schema parity with `NurseLog`. Currently inconsistent.
- **Schema:** add `side: NurseSide?` to `PumpLog` (LEFT / RIGHT / BOTH)
- **Files:** `prisma/schema.prisma`, pump log form
- **Effort:** S

### M5. Stripe one-time checkout — $15 lifetime license
- **Why:** This is what makes it "paid." Use Stripe Checkout in one-time payment mode (not subscriptions).
- **Schema:** `User` gets `licenseStatus: LicenseStatus` (FREE / LIFETIME), `purchasedAt: DateTime?`, `stripeCustomerId: String?`, `stripeChargeId: String?`
- **Files:** `prisma/schema.prisma`, `src/app/api/checkout/route.ts`, `src/app/api/webhooks/stripe/route.ts`, gating middleware, `.env` (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`)
- **Gating:** all logging features remain free for trial/limited use; paid features (TBD scope, likely "unlimited children + analytics + export") gated by `licenseStatus = LIFETIME`
- **Effort:** M

### M6. Data export guarantee
Back the "own your data" pitch.
- **Why:** Strongest counter-message to subscription competitors. Must be one-click and complete.
- **Approach:** extend existing JSON export with CSV format; add a "download everything" zip endpoint bundling JSON + CSV per log type
- **Files:** `src/app/api/export/route.ts` (extend), new zip route
- **Effort:** S

---

## SHOULD — v1.1 Fast-Follows (~3 months post-launch)

Close the obvious gaps once paying users start asking for them.

| # | Feature | Notes | Effort |
|---|---|---|---|
| S1 | **Growth tracking** | Weight, height, head circumference + simple line charts. No percentile curves. | M |
| S2 | **Medications log** | Name, dose, time. New `MedicationLog` model. | S |
| S3 | **Doctor visits** | Date, provider, visit notes. New `AppointmentLog` model. | S |
| S4 | **Tummy time / bath / mood** | Extend `LogType` enum; thin forms. | S |
| S5 | **Milestones** | Preset list (first smile, rollover, sit, crawl, walk) + custom; date only. | S |
| S6 | **Smart reminders** | Replace fixed 120-min interval with rolling-average gap from last N feeds per child. | M |
| S7 | **Quick-log shortcuts** | Home-screen "log feed like last one" buttons. | S |
| S8 | **Undo for misclicks** | Toast with 10-second undo on any log create/delete. Critical at 3am. | S |

---

## COULD — Post-PMF, Only If Cheap

Don't build until paying-user signal demands it.

| # | Feature | Notes | Effort |
|---|---|---|---|
| C1 | **Statistical predictions** | "Avg gap is 2.5h, last feed was 2h ago." Pure aggregate, no ML. | S |
| C2 | **Static age-based reference ranges** | Lookup table ("at 3 months, typical is X feeds/day"). No percentile curves, no medical claims. | S |
| C3 | **i18n — Spanish first** | next-intl or similar; covers a large parent demographic. | M |
| C4 | **PWABuilder Play / Microsoft Store wrapper** | $25 one-time on Google. Distribution discoverability without 30% IAP cut (payments stay on web). | S |
| C5 | **Referral codes** | "Give $5 off, get $5 off." Lifetime-friendly variant: "give a free month of access" gift codes. | M |
| C6 | **Family shared-journal timeline** | Combined chronological view across log types for casual reading. | S |

---

## WON'T — Explicit Non-Goals

These protect focus and the lifetime-pricing pitch. Saying no is the plan.

- **SweetSpot-style ML nap predictions** — high maintenance, not our edge
- **Sleep coaching content / articles** — content treadmill, not a software product
- **1:1 sleep consultation services** — services business, wrong model
- **Native iOS / Android apps, Apple Watch, Siri shortcuts** — PWA strategy is intentional
- **Any subscription tier or feature paywall after the $15** — kills the entire pitch
- **In-app ads**
- **"Pro" tier upsells** — $15 buys everything, period

---

## Sequencing Suggestion

1. **Pre-launch sprint (MUST):** M2 → M4 → M6 → M1 → M3 → M5 (smallest schema changes first, Stripe last so the gated feature set is settled)
2. **Soft launch:** free tier only, gather usage data, validate which features matter
3. **Paid launch:** flip M5, announce $15 lifetime, start Reddit/Product Hunt/influencer push
4. **First 90 days:** ship SHOULD items based on actual user feedback, not assumed priority
5. **COULD items:** revisit only after revenue justifies it

## Success Metrics

- **Pre-launch:** zero duplicate-log reports from caregiver pairs in week-long beta
- **Launch week:** conversion rate on Stripe checkout > 3%
- **30 days post-launch:** refund rate < 5%
- **90 days:** weekly active retention > 40% among paid users
