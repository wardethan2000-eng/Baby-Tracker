# 🍼 NightWatch — Baby Tracker PWA
## Complete Build Prompt & Architecture Roadmap for AI Coder

---

## Project Overview

Build **NightWatch**, a Progressive Web App (PWA) for parents to track nighttime infant activity — feedings, diaper changes, wake events, and more. The core problem: parents wake up in the morning with no reliable memory of what happened overnight. NightWatch gives them a shared, timestamped log accessible from any phone without a native app install.

The app must be opinionated about speed and simplicity. Every primary action must be reachable in one tap from the home screen.

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Infrastructure & Deployment](#infrastructure--deployment)
3. [Architecture Overview](#architecture-overview)
4. [Database Schema](#database-schema)
5. [Authentication & Accounts](#authentication--accounts)
6. [PWA Requirements](#pwa-requirements)
7. [Onboarding Flow](#onboarding-flow)
8. [UI & Design System](#ui--design-system)
9. [Feature: Dashboard (Home Screen)](#feature-dashboard-home-screen)
10. [Feature: Quick Log Buttons & Secondary Screens](#feature-quick-log-buttons--secondary-screens)
11. [Feature: History & Log Management](#feature-history--log-management)
12. [Feature: Analytics Tab](#feature-analytics-tab)
13. [Feature: Multi-Child Support](#feature-multi-child-support)
14. [Feature: Account Sharing & Invites](#feature-account-sharing--invites)
15. [Feature: Data Export (Excel)](#feature-data-export-excel)
16. [Email Integration via Resend](#email-integration-via-resend)
17. [API Routes Reference](#api-routes-reference)
18. [Security Considerations](#security-considerations)
19. [Build Roadmap & Milestones](#build-roadmap--milestones)

---

## Tech Stack

### Frontend
| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js 14+ (App Router)** | SSR, file-based routing, PWA-ready, API routes |
| Language | **TypeScript** | Type safety across frontend and backend |
| Styling | **Tailwind CSS** | Utility-first, fast iteration, mobile-first |
| State Management | **Zustand** | Lightweight, simple, no boilerplate |
| Data Fetching | **TanStack Query (React Query)** | Caching, optimistic updates, background sync |
| Charts/Analytics | **Recharts** | Composable, React-native chart library |
| Forms | **React Hook Form + Zod** | Fast, validated forms with minimal re-renders |
| Export | **SheetJS (xlsx)** | Client-side Excel generation with styling |
| PWA | **next-pwa** | Service worker, offline caching, installability |
| Icons | **Lucide React** | Clean, consistent icon set |
| Date Handling | **date-fns** | Lightweight, tree-shakeable |

### Backend
| Layer | Choice |
|---|---|
| API | **Next.js API Routes (App Router route handlers)** |
| ORM | **Prisma** |
| Database | **PostgreSQL** (self-hosted on Proxmox, migrate to cloud-managed Postgres later) |
| Auth | **NextAuth.js v5 (Auth.js)** with Credentials + Email providers |
| Email | **Resend** (via official Resend Node SDK) |
| File/Export | Handled client-side with SheetJS |

### Infrastructure (Proxmox Phase)
- **VM 1**: Ubuntu 22.04 LTS — runs the Next.js app via **PM2** or **Docker**
- **VM 2**: Ubuntu 22.04 LTS — runs **PostgreSQL 15+**
- Reverse proxy: **Nginx** with SSL via **Let's Encrypt (Certbot)**
- Environment variables managed via `.env.local` (not committed to repo)
- Docker Compose file provided for easy future migration to cloud

---

## Infrastructure & Deployment

### Proxmox Setup (Development/Self-Hosted Phase)

```
[Client Browser / Phone]
        |
    [Nginx Reverse Proxy — SSL Termination]
        |
  [Next.js App — Node.js / PM2 — Port 3000]
        |
  [PostgreSQL — Internal Network — Port 5432]
```

### Docker Compose (Provided for portability)

Provide a `docker-compose.yml` at the root of the project that defines:
- `app` service: builds from Dockerfile, exposes port 3000, reads from `.env`
- `db` service: `postgres:15-alpine`, with a named volume for persistence
- A `healthcheck` on the db service so the app waits before starting

### Nginx Config

Provide an `nginx.conf` template in `/infra/nginx.conf` that:
- Listens on 443 with SSL
- Proxies to `localhost:3000`
- Sets headers for PWA: `Cache-Control`, `X-Frame-Options`, `X-Content-Type-Options`
- Handles WebSocket upgrades (for potential future use)

### Environment Variables (`.env.example`)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/nightwatch"

# Auth
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="https://yourdomain.com"

# Resend
RESEND_API_KEY="re_xxxxxxxxxxxxxxxx"
RESEND_FROM_EMAIL="noreply@yourdomain.com"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
NEXT_PUBLIC_APP_NAME="NightWatch"
```

---

## Architecture Overview

```
/app
  /(auth)
    /login
    /signup
    /forgot-password
    /reset-password
    /invite/[token]
  /(app)                        ← Protected routes
    /layout.tsx                 ← Shell with bottom nav + child selector
    /page.tsx                   ← Dashboard / Quick Log (Home)
    /history/page.tsx           ← Log History
    /analytics/page.tsx         ← Analytics
    /settings/page.tsx          ← Account, children, sharing
  /api
    /auth/[...nextauth]/route.ts
    /children/route.ts
    /children/[id]/route.ts
    /logs/route.ts
    /logs/[id]/route.ts
    /invite/route.ts
    /invite/[token]/route.ts
    /export/[childId]/route.ts
    /user/route.ts

/components
  /ui                           ← Reusable primitives (Button, Modal, etc.)
  /dashboard                    ← Quick-log button grid, recent activity
  /history                      ← Log list, edit/undo modals
  /analytics                    ← Chart components
  /onboarding                   ← Multi-step onboarding flow
  /shared                       ← Child selector, bottom nav, header

/lib
  /prisma.ts                    ← Prisma client singleton
  /auth.ts                      ← NextAuth config
  /resend.ts                    ← Resend client + email templates
  /utils.ts                     ← General helpers
  /validations.ts               ← Zod schemas

/prisma
  /schema.prisma
  /migrations/

/public
  /icons/                       ← PWA icons (all sizes)
  /manifest.json
```

---

## Database Schema

Design all tables with `created_at` and `updated_at` timestamps. Use UUIDs for all primary keys.

### Users
```prisma
model User {
  id             String   @id @default(uuid())
  email          String   @unique
  name           String?
  passwordHash   String?
  emailVerified  DateTime?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  ownedChildren  Child[]           @relation("ChildOwner")
  sharedAccess   ChildShare[]
  logs           Log[]
  sessions       Session[]
  accounts       Account[]
}
```

### Children
```prisma
model Child {
  id          String   @id @default(uuid())
  name        String
  birthDate   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  ownerId     String
  owner       User     @relation("ChildOwner", fields: [ownerId], references: [id])

  sharedWith  ChildShare[]
  logs        Log[]
}
```

### Child Shares (for shared accounts)
```prisma
model ChildShare {
  id          String   @id @default(uuid())
  childId     String
  userId      String?                         // null until invite accepted
  email       String                          // invited email
  role        ShareRole @default(CAREGIVER)   // CAREGIVER | VIEWER
  token       String    @unique               // invite token
  accepted    Boolean   @default(false)
  expiresAt   DateTime
  createdAt   DateTime  @default(now())

  child       Child    @relation(fields: [childId], references: [id])
  user        User?    @relation(fields: [userId], references: [id])
}

enum ShareRole {
  CAREGIVER   // Can log events
  VIEWER      // Read-only
}
```

### Logs (all events)
```prisma
model Log {
  id          String    @id @default(uuid())
  childId     String
  userId      String
  type        LogType
  occurredAt  DateTime  @default(now())     // editable timestamp
  notes       String?

  // Type-specific data stored as structured fields (nullable)
  feedAmount  Float?     // oz or ml
  feedUnit    FeedUnit?  // OZ | ML
  feedType    FeedType?  // BREAST | BOTTLE | BOTH

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deletedAt   DateTime?                     // soft delete for undo

  child       Child     @relation(fields: [childId], references: [id])
  user        User      @relation(fields: [userId], references: [id])
}

enum LogType {
  WAKE
  FEED
  DIAPER
}

enum FeedUnit {
  OZ
  ML
}

enum FeedType {
  BREAST
  BOTTLE
  BOTH
}
```

### NextAuth tables
Include the standard NextAuth `Account`, `Session`, and `VerificationToken` models per the Prisma adapter docs.

---

## Authentication & Accounts

### Strategy
Use **NextAuth.js v5** with:
- **Credentials provider** (email + password, bcrypt hashed)
- **Email provider** (magic link / password reset via Resend)
- **Prisma adapter** for session persistence

### Flows
- **Sign Up**: Email + name + password → send verification email via Resend → verify → onboarding
- **Log In**: Email + password → session cookie (7-day expiry)
- **Forgot Password**: Enter email → Resend sends reset link with time-limited token → reset form
- **Invite Accept**: Clicking invite link → if account exists, auto-links → if not, shows signup form pre-filled with email → after auth, share is accepted

### Session
Use database sessions (not JWT) for shared-account security. Session token is an HTTP-only cookie.

### Middleware
Create `middleware.ts` at the project root that redirects unauthenticated users from `/(app)` routes to `/login`. Redirect authenticated users away from `/(auth)` routes.

---

## PWA Requirements

### `manifest.json`
```json
{
  "name": "NightWatch",
  "short_name": "NightWatch",
  "description": "Track your baby's night activity",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#0f172a",
  "theme_color": "#0f172a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Service Worker (via next-pwa)
- Cache all static assets, fonts, and the app shell
- Cache API responses for the last 7 days of logs (for offline viewing)
- Queue failed log POST requests and replay when back online (background sync)
- Show custom offline page if no cache is available

### iOS Specific
Add to `<head>` in root layout:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="NightWatch" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Install Prompt
On first visit (after 1 use), show a subtle bottom banner: *"Add NightWatch to your home screen for the best experience."* with an **Add** button. Track dismissal in `localStorage` and don't show again if dismissed.

---

## Onboarding Flow

Triggered immediately after email verification on first login. This is a multi-step modal/page flow:

### Step 1 — Welcome
- App logo + name
- Brief one-sentence value prop
- "Let's set up your first child →"

### Step 2 — Add Your Child
- **Child's name** (text input, required)
- **Date of birth** (date picker, required)
- "Add Child →"

### Step 3 — Invite a Co-Parent (Optional)
- "Share access with a partner or caregiver"
- Email input + role selector (Caregiver / Viewer)
- "Send Invite" or "Skip for now"

### Step 4 — Done
- "You're all set, [User Name]!"
- Show child's name and age in weeks
- "Start Tracking →" → navigates to Dashboard

**Note**: Users can add more children and more invites any time from Settings. Onboarding only runs once per account.

---

## UI & Design System

### Visual Direction
**Aesthetic**: Calm, dark-mode-first, clinical precision. This app is used at 2am with one hand and half-open eyes. Every pixel must serve legibility and speed.

- **Color Palette (CSS variables)**:
  ```css
  --bg-base: #0b1120;          /* near-black navy */
  --bg-surface: #161f33;       /* card backgrounds */
  --bg-elevated: #1e2d47;      /* modals, popovers */
  --accent-primary: #38bdf8;   /* sky blue — primary actions */
  --accent-secondary: #818cf8; /* indigo — secondary actions */
  --accent-success: #34d399;   /* green — fed/diaper done */
  --accent-warning: #fbbf24;   /* amber — wake events */
  --text-primary: #f0f6ff;
  --text-secondary: #94a3b8;
  --text-muted: #475569;
  --border: #1e3a5f;
  ```

- **Typography**:
  - Display/Heading: **DM Sans** (Google Fonts) — friendly but sharp
  - Body/UI: **IBM Plex Sans** — technical clarity
  - Monospace (timestamps, data): **IBM Plex Mono**

- **Spacing**: Base unit = 4px. Use Tailwind spacing scale consistently.

- **Border Radius**: `rounded-2xl` for cards, `rounded-full` for pills/badges, `rounded-3xl` for primary action buttons.

- **Shadows**: Use color-tinted shadows matching button accent colors for depth on primary action buttons (e.g., `box-shadow: 0 4px 24px rgba(56, 189, 248, 0.25)`).

### Component Primitives to Build

**Button variants**:
- `primary`: large, full-width, accent-colored with glow shadow
- `secondary`: ghost/outline style
- `ghost`: text-only
- `danger`: red-tinted for destructive actions

**Quick Log Button** (hero component):
- Minimum size: `120px × 120px` on mobile, `140px × 140px` on tablet
- Icon (large, ~40px) above label
- Color-coded per event type
- Haptic feedback: use `navigator.vibrate(50)` on tap where supported
- Tap animation: scale down slightly (`scale-95`) then back on release

**Bottom Navigation**:
- 4 items: Home (dashboard), History, Analytics, Settings
- Active state: accent color icon + small dot indicator
- Safe area padding for iOS home indicator (`pb-safe`)

**Child Selector** (top of screen, inside protected layout):
- Horizontal pill-style tab bar if multiple children
- Tap to switch active child — all data updates to that child
- "+" button at end to add a child

**Modal / Bottom Sheet**:
- Full-screen bottom sheet on mobile (slides up)
- Backdrop blur overlay
- Drag handle at top
- Smooth spring animation (CSS or Framer Motion)

### Responsive Breakpoints
- **Mobile (default)**: `< 640px` — primary target
- **Tablet**: `640px–1024px` — comfortable 2-column layout for some screens
- **Desktop**: `> 1024px` — centered max-width container (for web use)

---

## Feature: Dashboard (Home Screen)

This is the **entire reason the app exists**. It must feel instant.

### Layout
```
┌──────────────────────────────────┐
│  NightWatch    [Child Selector]  │
├──────────────────────────────────┤
│                                  │
│   ┌────────┐  ┌────────┐         │
│   │  🌙    │  │  🍼    │         │
│   │ Woke   │  │  Fed   │         │
│   │  Up    │  │        │         │
│   └────────┘  └────────┘         │
│                                  │
│         ┌────────┐               │
│         │  💧    │               │
│         │ Diaper │               │
│         │        │               │
│         └────────┘               │
│                                  │
├──────────────────────────────────┤
│  Recent Activity                 │
│  2:14 AM — Fed (3.5 oz)  [undo]  │
│  1:48 AM — Woke Up       [undo]  │
│  ...                             │
├──────────────────────────────────┤
│  [ Home ]  [ History ]  [ ... ]  │
└──────────────────────────────────┘
```

### Recent Activity Strip
- Shows last 5 events for the selected child
- Each row: time, event type badge, detail summary, and **Undo** button
- Undo performs a soft delete (sets `deletedAt`) and shows a brief toast confirmation
- Timestamps shown in local time, formatted as relative time if under 12 hours (e.g., "2h ago") and absolute time otherwise

### Empty State
If no logs today: show a gentle message like *"No activity logged for [Child Name] yet today."* with the current date.

---

## Feature: Quick Log Buttons & Secondary Screens

### Button: Woke Up 🌙
- **Color**: Amber (`--accent-warning`)
- **Action on tap**: Immediately POST `{ type: "WAKE", occurredAt: now(), childId }` to `/api/logs`
- **No secondary screen** — this is a binary yes/it-happened event with no extra data needed
- Show success toast: *"Logged: [Child Name] woke up at 2:14 AM"*

### Button: Fed 🍼
- **Color**: Sky blue (`--accent-primary`)
- **Action on tap**: POST log immediately with `type: "FEED"` and `occurredAt: now()`, then **slide up** the Feed Details bottom sheet
- **Secondary Screen — Feed Details**:
  - Heading: *"Add feeding details (optional)"*
  - **Amount**: Numeric input with stepper (+ / −) in 0.5 increments. Unit toggle: **oz / ml**
  - **Feed Type**: Three pill-toggle buttons: `Breast` | `Bottle` | `Both`
  - **Notes**: Small optional text area (1–2 lines)
  - Buttons: `Save Details` (PATCH the log with extra fields) and `Skip` (dismiss sheet, log already saved)
  - Pre-fill unit preference from last feed log for that child

### Button: Diaper 💧
- **Color**: Indigo (`--accent-secondary`)
- **Action on tap**: Immediately POST `{ type: "DIAPER", occurredAt: now(), childId }` to `/api/logs`
- **No secondary screen** — binary event
- Show success toast

### Optimistic Updates
All three buttons should use **optimistic updates** via TanStack Query. The log appears in the Recent Activity list instantly before the server confirms, then reconciles. This makes the UI feel instantaneous even on slow connections.

### Toast Notifications
Use a custom toast component (or a lightweight library like `sonner`) anchored to the top of the screen (below the header). Auto-dismiss after 3 seconds. Include an **Undo** action in the toast for 5 seconds post-log.

---

## Feature: History & Log Management

### History Page Layout
- Header with date range filter: **Today | Last 7 Days | This Month | Custom**
- Grouped by day (most recent first)
- Each day section: date heading + list of log entries

### Log Entry Row
```
[Event Icon]  [Event Type]  [Time]         [Details]     [⋮ menu]
   🍼          Fed           2:14 AM         3.5 oz        ···
```

The `⋮` three-dot menu reveals:
- **Edit** → opens Edit Log modal
- **Delete** → confirmation then soft delete

### Edit Log Modal
- Allow editing: `occurredAt` (date + time picker), amount, feed type, notes
- Cannot change the log type (can only delete and re-log)
- Save button calls PATCH `/api/logs/[id]`

### Undo / Delete
- Soft delete: sets `deletedAt` timestamp, excludes from all queries
- All API queries must filter `deletedAt: null` by default
- A "Deleted" toast with an **Undo** button appears for 8 seconds; if tapped, it calls DELETE `/api/logs/[id]/restore` which clears `deletedAt`

### Filtering
- By event type: show toggle chips for WAKE / FEED / DIAPER
- Chips are additive (multi-select)

---

## Feature: Analytics Tab

Analytics are always scoped to the **selected child**.

### Time Range Selector
Tabs at top: **Day | Week | Month**. Default to "Week".

### Metrics Cards (shown at top of analytics for selected range)
Display as a 2×2 grid of summary cards:
- **Total Feeds**: count + avg per day
- **Total Oz / ml**: sum of feed amounts (with unit toggle)
- **Diaper Changes**: count
- **Wake Events**: count

### Charts

#### Feed Amount Over Time (Line Chart)
- X axis: time (hours for Day, days for Week/Month)
- Y axis: oz or ml
- Shows a data point per feed
- If Day view: shows a 24-hour timeline

#### Feeds Per Day (Bar Chart)
- X axis: days of the week / month
- Y axis: number of feeds
- Color: `--accent-primary`

#### Wake Events by Hour (Heatmap or Bar Chart)
- Shows which hours of the night had the most wake events
- Useful for identifying patterns

#### Diaper Changes Per Day (Bar Chart)
- Same structure as feeds per day
- Color: `--accent-secondary`

### Chart Behavior
- All charts should be responsive (fill container width)
- Tooltips on hover/tap showing exact values
- Smooth entrance animations on mount
- Empty state: if no data for the range, show a gentle illustration and *"No data yet for this period."*

---

## Feature: Multi-Child Support

### Child Selector Component
- Rendered at the top of the protected layout, always visible
- If only 1 child: shows child's name as a static label (no selector needed)
- If 2+ children: renders horizontal scrollable pill tabs (child name + age in weeks/months)
- Selected child stored in Zustand global state, persisted to `localStorage`
- All API calls include `childId` from this selected state

### Adding a Child
- In Settings → "My Children" section → "Add Child" button
- Opens a modal: child name + birth date
- POSTs to `/api/children`
- Child selector updates immediately

### Child Age Display
- Show age as: "X weeks" if under 3 months, "X months" if under 2 years, "X years" otherwise
- Calculated from `birthDate` using `date-fns`

---

## Feature: Account Sharing & Invites

### Settings → Sharing

For each child, show a list of people who have access (owner + any accepted/pending shares).

Each row:
- Name or email
- Role badge (Caregiver / Viewer)
- Status (Active / Pending)
- Revoke button (owner only)

### Invite Flow
1. Owner clicks "Invite Someone" on a child's share settings
2. Modal: enter email, choose role (Caregiver or Viewer)
3. POST to `/api/invite` → creates a `ChildShare` record with a UUID token and 72-hour expiry → triggers Resend invite email
4. Invite email contains a magic link: `https://yourdomain.com/invite/[token]`
5. Recipient clicks link:
   - If already logged in: show confirmation screen *"Accept access to [Child Name]?"* → on confirm, PATCH share as accepted, link `userId`
   - If not logged in: redirect to `/invite/[token]` which shows a login/signup form (email pre-filled from share record) → after auth, auto-accepts share
6. Owner sees pending invites until accepted

### Role Permissions
| Action | Owner | Caregiver | Viewer |
|---|---|---|---|
| Log events | ✅ | ✅ | ❌ |
| Edit logs | ✅ | ✅ | ❌ |
| Delete logs | ✅ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ |
| Export data | ✅ | ✅ | ❌ |
| Invite others | ✅ | ❌ | ❌ |
| Remove child | ✅ | ❌ | ❌ |

Enforce role checks server-side in every API route handler.

---

## Feature: Data Export (Excel)

### Export Entry Point
- In **History** page: "Export" button in the top-right
- Also accessible in Settings → child → "Export Data"

### Export Scope Options (modal before export)
- All time / This month / Last 30 days / Custom date range

### Excel File Structure (generated client-side with SheetJS)
The exported `.xlsx` file should be **aesthetically designed**, not a raw data dump.

**Sheet 1 — Summary**
- App logo text header: "NightWatch — [Child Name] Export"
- Generated on date + date range covered
- Summary table: total feeds, total oz consumed, avg feeds/day, total diaper changes, total wake events

**Sheet 2 — Feed Log**
Columns: `Date | Time | Amount (oz) | Amount (ml) | Feed Type | Notes | Logged By`

**Sheet 3 — Diaper Log**
Columns: `Date | Time | Notes | Logged By`

**Sheet 4 — Wake Events**
Columns: `Date | Time | Notes | Logged By`

**Styling**:
- Header row: dark blue background (`#0b1120`), white text, bold
- Alternating row colors: white / very light blue
- Column widths auto-fitted
- Freeze top row on each sheet
- Date and time cells formatted as proper Excel date/time types (not strings)
- File name: `nightwatch-[childname]-[daterange].xlsx`

---

## Email Integration via Resend

All transactional emails sent via the **Resend Node SDK**. Create a `/lib/resend.ts` module with a typed `sendEmail` function and individual email template functions.

### Email Templates (React Email or HTML templates)

All emails share a consistent branded layout:
- Dark header with "NightWatch" logo text
- Body in clean off-white
- Footer with unsubscribe/help link

#### 1. Welcome / Email Verification
- **Trigger**: After signup
- **Subject**: `Verify your NightWatch account`
- **Content**: Greeting, brief value prop, large CTA button "Verify Email"
- **Link**: `/api/auth/verify-email?token=[token]`

#### 2. Password Reset
- **Trigger**: Forgot password form submission
- **Subject**: `Reset your NightWatch password`
- **Content**: "We received a request to reset your password." CTA button "Reset Password"
- **Link**: `/reset-password?token=[token]`
- **Expiry**: Token valid for 1 hour — mention this in the email

#### 3. Caregiver Invite
- **Trigger**: Owner invites someone to a child
- **Subject**: `[Owner Name] shared [Child Name]'s tracker with you`
- **Content**: "[Owner Name] has invited you to track [Child Name]'s activity on NightWatch." CTA "Accept Invite"
- **Link**: `/invite/[token]`
- **Note**: Include expiry — "This invite expires in 72 hours."

#### 4. Invite Accepted Notification
- **Trigger**: Invitee accepts share
- **Subject**: `[Invitee Name] accepted your invite`
- **Content**: Brief notification to the owner that their invite was accepted
- **Send to**: Child owner

---

## API Routes Reference

All routes require authentication unless noted. Return JSON. Use standard HTTP status codes.

### Auth
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Create account, send verification email |
| GET | `/api/auth/verify-email` | Verify email token |
| POST | `/api/auth/forgot-password` | Send reset email |
| POST | `/api/auth/reset-password` | Reset password with token |

### Children
| Method | Route | Description |
|---|---|---|
| GET | `/api/children` | List all children accessible to user |
| POST | `/api/children` | Create a new child (owner) |
| GET | `/api/children/[id]` | Get child details |
| PATCH | `/api/children/[id]` | Update child name/DOB (owner only) |
| DELETE | `/api/children/[id]` | Soft delete child (owner only) |

### Logs
| Method | Route | Description |
|---|---|---|
| GET | `/api/logs?childId=&from=&to=&type=` | Paginated log list |
| POST | `/api/logs` | Create a new log entry |
| PATCH | `/api/logs/[id]` | Edit a log entry |
| DELETE | `/api/logs/[id]` | Soft delete a log |
| POST | `/api/logs/[id]/restore` | Undo soft delete |

### Invites / Sharing
| Method | Route | Description |
|---|---|---|
| GET | `/api/children/[id]/shares` | List shares for a child |
| POST | `/api/invite` | Create invite + send email |
| GET | `/api/invite/[token]` | Get invite details (public) |
| POST | `/api/invite/[token]/accept` | Accept an invite |
| DELETE | `/api/children/[id]/shares/[shareId]` | Revoke access |

### Export
| Method | Route | Description |
|---|---|---|
| GET | `/api/export/[childId]?from=&to=` | Return raw JSON for client-side xlsx generation |

### User
| Method | Route | Description |
|---|---|---|
| GET | `/api/user/me` | Get current user profile |
| PATCH | `/api/user/me` | Update name, email, password |
| DELETE | `/api/user/me` | Delete account |

---

## Security Considerations

- **Passwords**: bcrypt with cost factor ≥ 12
- **Tokens** (invite, reset, verification): `crypto.randomBytes(32).toString('hex')`, stored hashed in DB
- **Authorization**: Every API route must verify that the authenticated user has access to the requested `childId` — never trust client-supplied IDs alone
- **Rate Limiting**: Apply rate limits on auth endpoints (signup, login, forgot-password) — use `upstash/ratelimit` or a simple in-memory store for self-hosted
- **CORS**: Restrict to app's own origin
- **Input Validation**: All API inputs validated with **Zod** before touching the database
- **SQL Injection**: Prisma ORM prevents this by default — never use raw queries with user input
- **HTTPS**: Enforced via Nginx — HTTP requests should redirect to HTTPS
- **Environment Variables**: Never expose server-side secrets to the client; use `NEXT_PUBLIC_` prefix only for truly public config

---

## Build Roadmap & Milestones

### Phase 0 — Project Scaffold (Day 1–2)
- [ ] Init Next.js 14 project with TypeScript + Tailwind
- [ ] Set up Prisma with PostgreSQL connection
- [ ] Configure NextAuth.js with Credentials provider + Prisma adapter
- [ ] Set up Resend SDK and basic email sending test
- [ ] Configure `next-pwa`, `manifest.json`, icons
- [ ] Set up Docker Compose for local dev (app + postgres)
- [ ] Create `.env.example` and document all variables

### Phase 1 — Auth & Onboarding (Day 3–5)
- [ ] Signup page (email + name + password)
- [ ] Email verification flow + Resend template
- [ ] Login page
- [ ] Forgot password + reset password flow
- [ ] Route middleware (protect `/app` routes)
- [ ] Onboarding multi-step flow (child name + DOB + optional invite)
- [ ] Settings: user profile edit

### Phase 2 — Core Tracking (Day 6–10)
- [ ] Child selector component in layout
- [ ] Dashboard with 3 quick-log buttons
- [ ] POST log endpoints (Wake, Feed, Diaper)
- [ ] Feed Details bottom sheet (amount, type, notes)
- [ ] Optimistic updates with TanStack Query
- [ ] Toast notifications + undo from toast
- [ ] Recent Activity strip on dashboard

### Phase 3 — History & Management (Day 11–14)
- [ ] History page with date filtering
- [ ] Log entry rows with type-specific details
- [ ] Edit log modal
- [ ] Soft delete + restore (undo)
- [ ] Type filter chips

### Phase 4 — Analytics (Day 15–18)
- [ ] Analytics page layout + time range selector
- [ ] Summary metric cards
- [ ] Feed amount over time (line chart)
- [ ] Feeds per day (bar chart)
- [ ] Wake events by hour (bar chart)
- [ ] Diaper changes per day (bar chart)
- [ ] Empty states for all charts

### Phase 5 — Sharing & Invites (Day 19–22)
- [ ] Share settings in Settings page (per child)
- [ ] Invite modal + POST invite + Resend invite email
- [ ] Invite acceptance flow (logged in + not logged in)
- [ ] Owner notification email on accept
- [ ] Role-based permission enforcement in all API routes
- [ ] Revoke access

### Phase 6 — Multi-Child & Export (Day 23–26)
- [ ] Add child flow in Settings
- [ ] Child selector updates for 2+ children
- [ ] Export scope modal
- [ ] `/api/export` route
- [ ] Client-side SheetJS Excel generation with styling
- [ ] Download trigger

### Phase 7 — Polish & PWA Hardening (Day 27–30)
- [ ] Offline support + background sync queue
- [ ] PWA install banner
- [ ] iOS `apple-touch-icon` and status bar meta tags
- [ ] Accessibility pass (ARIA labels, focus states, color contrast)
- [ ] Performance audit (Lighthouse)
- [ ] Error boundaries on all major sections
- [ ] Loading skeletons for all data-dependent views
- [ ] Final Nginx config + SSL setup for Proxmox deployment

### Phase 8 — Cloud Migration Prep (Future)
- [ ] Migrate PostgreSQL to managed cloud provider (Railway, Supabase, Neon, or RDS)
- [ ] Deploy Next.js to Vercel or a VPS (Fly.io, Railway, Render)
- [ ] Update `NEXTAUTH_URL` and DNS
- [ ] Enable Vercel Analytics or PostHog for usage tracking
- [ ] Set up automated DB backups

---

## Notes for the AI Coder

- **Start every new feature from the API layer up**: schema → route → frontend component. This avoids UI work that has no backing data.
- **The dashboard is the product**. Spend disproportionate time making those three buttons feel perfect — fast, satisfying, and readable at 2am.
- **Never block the user**: Log immediately on button tap, ask for details after. The log should never fail to be created just because the user didn't fill in oz count.
- **Test on real phones**: Use `ngrok` or Proxmox LAN access to test on actual iOS/Android during development. The PWA install flow, haptic feedback, and safe area insets all need real device validation.
- **Keep bundle small**: Avoid heavy libraries. SheetJS is large — lazy-load it only when the user triggers an export.
- **Timezone handling**: Always store `occurredAt` in UTC in the database. Display in the user's local timezone using `date-fns-tz`. When creating a log, send the local ISO string and convert to UTC on the server.
- **Dark mode only**: This app is used in the dark. No light mode needed. Ensure no harsh whites or yellows that would blind a tired parent.

---

*Generated as a build prompt for NightWatch — a baby activity tracking PWA.*
*Designed for self-hosted deployment on Proxmox with a path to cloud migration.*
