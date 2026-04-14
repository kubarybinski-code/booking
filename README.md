# Tandem Paragliding Booking MVP

Production-oriented booking + operations system for tandem paragliding.

## Stack
- Next.js App Router + TypeScript
- Supabase (Postgres + Auth)
- Resend (transactional emails)
- Tailwind CSS

## Current modules
- Public customer booking (`/`, `/book`)
- Customer self-service via secure token links (`/booking/manage/[reference]`)
- Admin panel (`/admin`)
- Booking/admin APIs under `app/api/*`

---

## 1) Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

### Local env variables
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
RESEND_API_KEY=re_xxx
APP_BASE_URL=http://localhost:3000
ADMIN_EMAILS=ops@example.com
CRON_SECRET=change-me
ALLOWED_IFRAME_ORIGINS='self' https://www.sky-mania.com
```

---

## 2) Database setup (Supabase)
Apply migrations in order:
```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_booking_flow_extensions.sql
psql "$DATABASE_URL" -f db/migrations/003_admin_panel_extensions.sql
psql "$DATABASE_URL" -f db/migrations/004_email_extensions.sql
psql "$DATABASE_URL" -f db/migrations/005_self_service_management.sql
psql "$DATABASE_URL" -f db/migrations/006_admin_pricing_and_availability.sql
psql "$DATABASE_URL" -f db/migrations/007_enhance_booking_pricing_logic.sql
```

Seed demo data:
```bash
psql "$DATABASE_URL" -f db/seeds/seed.sql
```

Key app settings to verify in `app_settings`:
- `booking.window_days`
- `booking.default_token_ttl_hours`
- `booking.reminder_lead_hours`
- `booking.cancellation_cutoff_hours`
- `booking.reschedule_cutoff_hours`
- `email.sender`
- `support.contact`
- `business.timezone`

---

## 3) Deployment (Vercel + Supabase + Resend)

### Vercel
1. Import repo in Vercel.
2. Framework: Next.js.
3. Set all env vars from `.env.example` in Project Settings.
4. Deploy.

### Supabase
1. Create project.
2. Run migrations + seed.
3. Create admin user(s) in Supabase Auth.
4. Set `ADMIN_EMAILS` to those addresses.

### Resend
1. Create Resend account and API key.
2. Verify sending domain (recommended) or sender address.
3. Set `RESEND_API_KEY`.
4. Set `app_settings.email.sender` and `app_settings.support.contact`.

### Custom subdomain (`book.sky-mania.com`)
1. In Vercel Domains, add `book.sky-mania.com`.
2. Configure DNS as instructed by Vercel.
3. Set `APP_BASE_URL=https://book.sky-mania.com`.

---

## 4) Embedding support (iframe)
Customer routes (`/`, `/book`, `/booking/manage/*`) are iframe-ready via CSP `frame-ancestors` from `ALLOWED_IFRAME_ORIGINS`.

### Example embed
```html
<iframe
  src="https://book.sky-mania.com/book"
  title="Sky Mania Booking"
  style="width:100%;min-height:900px;border:0;"
  loading="lazy"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

### Notes
- Browsers do not auto-resize iframe height across domains.
- Use a generous fixed/min height or implement postMessage-based resizing on both host and embedded app later.
- Admin routes are not intended for embedding and are restricted with `X-Frame-Options: SAMEORIGIN`.

---

## 5) Operational endpoints
- Customer booking: `/book`
- Self-service: `/booking/manage/{reference}?action=cancel|reschedule&token=...`
- Admin: `/admin`
- Reminder cron: `POST /api/jobs/send-reminders` with header `x-cron-secret: <CRON_SECRET>`

---

## 6) Final testing checklist

### Local/system
- [ ] `npm run dev` starts cleanly
- [ ] Root `/` and `/book` render without runtime errors
- [ ] `/admin` redirects/login behavior works as expected

### Booking creation
- [ ] Create booking from `/book`
- [ ] Confirmation email is sent
- [ ] Booking exists in DB and admin bookings list

### Shared capacity
- [ ] Create bookings across products sharing same real slot
- [ ] Verify remaining seat calculations block overbooking

### Daily slot overrides
- [ ] Change slot state/open-bookable/capacity in admin
- [ ] Verify booking UI reflects override immediately

### Admin edit/reschedule
- [ ] Edit booking in admin
- [ ] Reschedule to another valid slot
- [ ] Booking history contains update/reschedule actions
- [ ] Reschedule confirmation email is sent

### Email lifecycle
- [ ] Confirmation, cancellation, reschedule emails deliver
- [ ] Reminder endpoint sends reminders at configured lead time

### Self-service
- [ ] Email links open self-service page with valid token
- [ ] Invalid/expired token is rejected safely
- [ ] Cutoff rules block late cancel/reschedule with polite message
- [ ] Valid cancel updates booking status and history
- [ ] Valid reschedule updates existing booking (no new record) and history


## Admin CRUD coverage
- Flights: create/edit/enable-disable including booking date range fields and seasonal toggles.
- Add-ons: create/edit/enable-disable with pricing mode and flight assignments.
- Discount codes: create/edit rules including `family_code_rule`, people-based maps, and manual verification flags.
- Slot templates/rules: create/edit templates and season-flight-day rules.
- Bookings: filter, edit, cancel, and manual create.
- Daily slots/settings: operational updates with persistence.
