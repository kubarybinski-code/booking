# Tandem Paragliding Booking MVP

Production-oriented booking and operations platform for a tandem paragliding business.

## Stack
- Next.js App Router + TypeScript
- Tailwind CSS
- Supabase (Postgres + Auth)
- Resend (transactional emails)

## Implemented
- Customer booking flow (`/book`) with multilingual UI (EN/DE/PL/NL)
- Shared-capacity slot availability and backend-safe booking creation
- Admin authentication with Supabase Auth and route protection
- Admin operations pages for bookings, flights, add-ons, discount codes, templates/rules, daily slots, settings
- Transactional emails:
  - booking confirmation
  - booking reminder
  - cancellation confirmation
  - reschedule confirmation
- Reminder scheduler endpoint with configurable lead time and cron secret

## Not implemented yet
- Transactional attachments
- Customer self-service attachments or identity verification beyond secure token links

## Setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
APP_BASE_URL=https://your-domain.com
ADMIN_EMAILS=ops@example.com
CRON_SECRET=change-me
```

## Database
Apply migrations in order:
```bash
psql "$DATABASE_URL" -f db/migrations/001_initial_schema.sql
psql "$DATABASE_URL" -f db/migrations/002_booking_flow_extensions.sql
psql "$DATABASE_URL" -f db/migrations/003_admin_panel_extensions.sql
psql "$DATABASE_URL" -f db/migrations/004_email_extensions.sql
psql "$DATABASE_URL" -f db/migrations/005_self_service_management.sql
```

Apply demo seed:
```bash
psql "$DATABASE_URL" -f db/seeds/seed.sql
```

## Resend notes
- Sender identity is read from `app_settings.email.sender`.
- Support contact in templates is read from `app_settings.support.contact`.
- Reminder lead time is read from `app_settings.booking.reminder_lead_hours`.
- Trigger reminders by POSTing to `/api/jobs/send-reminders` with header `x-cron-secret: <CRON_SECRET>`.

## Key routes
- `/book`
- `/admin/login`
- `/admin`
- `POST /api/jobs/send-reminders`

## Self-service management
- Links from emails open `/booking/manage/{reference}?action=cancel|reschedule&token=...`.
- Deadline settings: `booking.cancellation_cutoff_hours` and `booking.reschedule_cutoff_hours`.
