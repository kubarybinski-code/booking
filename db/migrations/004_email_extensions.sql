alter table bookings
  add column if not exists language text not null default 'en',
  add column if not exists reminder_sent_at timestamptz;

create index if not exists bookings_language_idx on bookings(language);
create index if not exists bookings_reminder_idx on bookings(status, reminder_sent_at, daily_slot_id);
