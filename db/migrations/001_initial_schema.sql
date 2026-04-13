-- Enable helpers
create extension if not exists pgcrypto;

-- Shared timestamp update trigger
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Enums
create type booking_status as enum ('pending', 'confirmed', 'cancelled', 'rescheduled');
create type slot_state as enum ('open', 'closed', 'blocked');
create type discount_type as enum ('percentage', 'fixed_amount');

create table if not exists flights (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  base_price_cents integer not null check (base_price_cents >= 0),
  min_people smallint not null default 1 check (min_people between 1 and 3),
  max_people smallint not null default 3 check (max_people between 1 and 3 and max_people >= min_people),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists flight_translations (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights(id) on delete cascade,
  locale text not null,
  name text not null,
  short_description text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (flight_id, locale)
);

create table if not exists addons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists addon_translations (
  id uuid primary key default gen_random_uuid(),
  addon_id uuid not null references addons(id) on delete cascade,
  locale text not null,
  name text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (addon_id, locale)
);

create table if not exists discount_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type discount_type not null,
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_uses integer,
  used_count integer not null default 0 check (used_count >= 0),
  valid_from timestamptz,
  valid_until timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (valid_until is null or valid_from is null or valid_until >= valid_from)
);

create table if not exists flight_addons (
  id uuid primary key default gen_random_uuid(),
  flight_id uuid not null references flights(id) on delete cascade,
  addon_id uuid not null references addons(id) on delete cascade,
  is_required boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (flight_id, addon_id)
);

create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  start_date date not null,
  end_date date not null,
  is_active boolean not null default true,
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create table if not exists slot_templates (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null,
  start_time time not null,
  duration_minutes integer not null default 90 check (duration_minutes between 30 and 360),
  default_capacity integer not null default 6 check (default_capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Rules connect season + flight + weekday constraints to templates.
-- This is where flight-specific allowed slot rules are expressed.
create table if not exists slot_template_rules (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  flight_id uuid not null references flights(id) on delete cascade,
  slot_template_id uuid not null references slot_templates(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  is_bookable boolean not null default true,
  capacity_override integer check (capacity_override > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, flight_id, slot_template_id, day_of_week)
);

-- Daily slots represent concrete, bookable slots for a date.
-- shared_capacity_key enables multiple flights/products to consume the same real-world seat pool.
create table if not exists daily_slots (
  id uuid primary key default gen_random_uuid(),
  slot_date date not null,
  flight_id uuid not null references flights(id) on delete restrict,
  slot_template_id uuid references slot_templates(id) on delete set null,
  season_id uuid references seasons(id) on delete set null,
  slot_start timestamptz not null,
  slot_end timestamptz not null,
  state slot_state not null default 'open',
  is_bookable boolean not null default true,
  capacity integer not null check (capacity > 0),
  shared_capacity_key text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slot_end > slot_start),
  unique (flight_id, slot_start)
);

create index if not exists daily_slots_date_idx on daily_slots(slot_date);
create index if not exists daily_slots_shared_capacity_idx on daily_slots(shared_capacity_key, slot_start);
create index if not exists daily_slots_bookable_idx on daily_slots(slot_date, is_bookable, state);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  booking_reference text not null unique,
  status booking_status not null default 'pending',
  customer_first_name text not null,
  customer_last_name text not null,
  customer_email text not null,
  customer_phone text,
  flight_id uuid not null references flights(id) on delete restrict,
  daily_slot_id uuid not null references daily_slots(id) on delete restrict,
  people_count smallint not null check (people_count between 1 and 3),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  discount_code_id uuid references discount_codes(id) on delete set null,
  discount_amount_cents integer not null default 0 check (discount_amount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  notes text,
  cancelled_at timestamptz,
  rescheduled_from_booking_id uuid references bookings(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_slot_idx on bookings(daily_slot_id, status);
create index if not exists bookings_customer_email_idx on bookings(customer_email);

create table if not exists booking_addons (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  addon_id uuid not null references addons(id) on delete restrict,
  quantity integer not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  total_price_cents integer not null check (total_price_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, addon_id)
);

create table if not exists booking_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  action text not null,
  actor_type text not null,
  actor_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists booking_history_booking_idx on booking_history(booking_id, created_at desc);

create table if not exists secure_booking_tokens (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  token_hash text not null unique,
  purpose text not null, -- e.g. 'manage-booking', 'reschedule', 'cancel'
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

create index if not exists secure_booking_tokens_booking_idx on secure_booking_tokens(booking_id, expires_at);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  value jsonb not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Updated_at trigger attachment
create trigger flights_set_updated_at before update on flights for each row execute function set_updated_at();
create trigger flight_translations_set_updated_at before update on flight_translations for each row execute function set_updated_at();
create trigger addons_set_updated_at before update on addons for each row execute function set_updated_at();
create trigger addon_translations_set_updated_at before update on addon_translations for each row execute function set_updated_at();
create trigger discount_codes_set_updated_at before update on discount_codes for each row execute function set_updated_at();
create trigger flight_addons_set_updated_at before update on flight_addons for each row execute function set_updated_at();
create trigger seasons_set_updated_at before update on seasons for each row execute function set_updated_at();
create trigger slot_templates_set_updated_at before update on slot_templates for each row execute function set_updated_at();
create trigger slot_template_rules_set_updated_at before update on slot_template_rules for each row execute function set_updated_at();
create trigger daily_slots_set_updated_at before update on daily_slots for each row execute function set_updated_at();
create trigger bookings_set_updated_at before update on bookings for each row execute function set_updated_at();
create trigger booking_addons_set_updated_at before update on booking_addons for each row execute function set_updated_at();
create trigger app_settings_set_updated_at before update on app_settings for each row execute function set_updated_at();
