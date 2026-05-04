# CribNotes Implementation Plan & Status

## Completed Milestones

### M1: Live Timers ✅
- Prisma schema: `startedAt`, `endedAt`, `pumpSide` on Log model
- API: `GET /api/logs/timers`, timer start/stop in POST/PATCH logs
- Zustand store: `activeTimers` state with localStorage persistence
- `useActiveTimers` hook: server sync for timer state
- `ActiveTimersBar`, `QuickLogGrid` with timer start buttons
- `NurseDetailsSheet` and `PumpDetailsSheet` timer mode
- `DailyStats` and `RecentActivity` LIVE badges
- Auto-create WAKE log when stopping SLEEP timer
- One timer per type per child (starting new auto-stops old)

### M2: Solid Foods ✅
- `foodName` field on Log model, `SOLID` FeedType
- Added by remote commit (merged)

### M3: Real-Time Sync (SSE) ✅
- `src/lib/broadcast.ts`: in-process EventEmitter for per-child fan-out
- `src/app/api/events/route.ts`: GET SSE endpoint with auth + heartbeat
- `src/lib/useSSE.ts`: client EventSource hook with reconnect + attribution toasts
- `src/lib/providers.tsx`: SSEConnector component
- Broadcast calls in POST/PATCH/DELETE log routes
- Event types: `log-create`, `log-update`, `log-delete`, `log-restore`, `timer-start`, `timer-stop`
- Nginx/Tailscale SSE proxy config (disabled nginx, Tailscale proxies directly)

### M4: Pump Side ✅
- `pumpSide` field (NurseSide enum) on Log model
- UI in PumpDetailsSheet and EditLogModal

### M5: Stripe Payment ($15 lifetime) ✅
- **Prisma**: `trialStartsAt`, `trialEndsAt`, `paidAt`, `stripeCustomerId`, `stripeSessionId` on User model
- **Migration**: Applied to production DB. Existing users get `trialEndsAt = now + 30 days`
- **Auth**: JWT/session extended with `paidAt` and `trialEndsAt`
- **Signup**: `trialEndsAt` set to `now + 30 days` on user creation
- **Middleware**: Hard paywall — if `paidAt` is null AND `trialEndsAt` is past, redirect to `/billing`
- **`/billing` page**: Shows trial status (days remaining or expired), pricing card, "Pay $15" button
- **`/api/stripe/checkout`**: Creates Stripe Checkout Session (one-time payment mode)
- **`/api/stripe/webhook`**: Handles `checkout.session.completed` → sets `paidAt`
- **Settings**: Billing section showing "Lifetime Access ✓" (paid) or trial countdown + pay button
- **`src/lib/stripe.ts`**: Lazy-initialized Stripe client, `getOrCreateCustomerId()`
- **`src/lib/stripe-client.ts`**: Client-side flag (`STRIPE_CONFIGURED`) for conditional UI
- **Graceful degradation**: When `STRIPE_SECRET_KEY` is empty, no paywall enforcement, no billing UI
- **`scripts/setup-stripe.ts`**: One-time script to create Stripe Product + Price

### M6: Data Export ✅
- **API**: Added `startedAt`/`endedAt`/`durationMinutes` to sleeps, `foodName` to feeds, `pumpSide` to pumps; improved summary (sleep hours, avg durations, date range label)
- **XLSX**: Added Sleep Duration, Food Name, Pump Side columns; styled headers (bold + blue fill); expanded summary metrics
- **CSV**: New format option — single combined CSV with Type column
- **Custom date range**: "Custom" preset with From/To date pickers in export modal

## Still Needed (Post-Deploy)

### Stripe Setup (Blocking — Requires Your Action)
1. **Create a Stripe account** at https://stripe.com
2. **Get API keys** from Stripe Dashboard → Developers → API keys
3. **Add to production `.env`**:
   ```
   STRIPE_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRICE_ID=price_...
   ```
4. **Run product setup** (with test or live keys):
   ```bash
   cd scripts && STRIPE_SECRET_KEY=sk_test_... npx ts-node setup-stripe.ts
   ```
   This creates a Product "CribNotes Lifetime" + $15 one-time Price and prints the `STRIPE_PRICE_ID`
5. **Configure webhook** in Stripe Dashboard → Webhooks:
   - URL: `https://nightwatch-app.tail2644a1.ts.net/api/stripe/webhook`
   - Events: `checkout.session.completed`
   - Copy the signing secret to `STRIPE_WEBHOOK_SECRET`
6. **Restart PM2** after adding env vars: `pm2 restart cribnotes`
7. **Test**: Sign up → use app for trial → go to `/billing` → complete test payment

### Future Improvements
- Wire up SSE broadcast for notes endpoints (`/api/notes`)
- Scale SSE to Redis pub/sub if multi-instance
- M5: Consider adding Stripe Customer Portal for invoice receipt access
- M5: Consider adding email receipt via Resend after payment
- M6: PDF summary export for pediatrician visits
- M6: Notes sheet in export

## Key Architecture Decisions
- **SSE over WebSocket**: Server-to-client only, works in Next.js API routes, auto-reconnect
- **In-process EventEmitter** for SSE (not Redis): single-instance on Proxmox, swap in Redis later if scaling
- **Stripe one-time payment** (not subscription): $15 lifetime, no recurring billing
- **Hard paywall after 30-day trial**: middleware redirects to `/billing` if expired and unpaid
- **Lazy Stripe init**: `getStripe()` avoids build-time errors when keys are missing
- **Graceful degradation**: Without `STRIPE_SECRET_KEY`, app works fully with no paywall

## Relevant Files
- `src/lib/stripe.ts` — Lazy Stripe client, `getOrCreateCustomerId()`, `STRIPE_CONFIGURED`
- `src/lib/stripe-client.ts` — Client-side `STRIPE_CONFIGURED` flag
- `src/lib/auth.ts` — JWT/session includes `paidAt`, `trialEndsAt`
- `src/middleware.ts` — Paywall redirect logic
- `src/app/(auth)/billing/page.tsx` — Paywall/billing page
- `src/app/api/stripe/checkout/route.ts` — Creates Checkout Session
- `src/app/api/stripe/webhook/route.ts` — Handles payment completion webhook
- `src/app/api/auth/signup/route.ts` — Sets `trialEndsAt` on signup
- `src/app/(app)/settings/page.tsx` — Billing section in settings
- `scripts/setup-stripe.ts` — One-time Stripe product/price creation
- `prisma/schema.prisma` — `trialStartsAt`, `trialEndsAt`, `paidAt`, `stripeCustomerId`, `stripeSessionId`