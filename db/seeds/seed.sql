-- Demo flights
insert into flights (slug, base_price_cents, min_people, max_people)
values
  ('skyline', 12900, 1, 3),
  ('extended', 16900, 1, 3),
  ('glory', 21900, 1, 2),
  ('custom-air-adventure', 29900, 1, 3)
on conflict (slug) do update set
  base_price_cents = excluded.base_price_cents,
  min_people = excluded.min_people,
  max_people = excluded.max_people,
  is_active = true;

insert into flight_translations (flight_id, locale, name, short_description, description)
select f.id, lang.locale,
  case f.slug
    when 'skyline' then case lang.locale when 'de' then 'Skyline' when 'pl' then 'Skyline' when 'nl' then 'Skyline' else 'Skyline' end
    when 'extended' then case lang.locale when 'de' then 'Extended' when 'pl' then 'Extended' when 'nl' then 'Extended' else 'Extended' end
    when 'glory' then case lang.locale when 'de' then 'Glory' when 'pl' then 'Glory' when 'nl' then 'Glory' else 'Glory' end
    else case lang.locale when 'de' then 'Custom Air Adventure' when 'pl' then 'Custom Air Adventure' when 'nl' then 'Custom Air Adventure' else 'Custom Air Adventure' end
  end,
  'Demo translation',
  'Placeholder text for customer-facing multilingual content.'
from flights f
cross join (values ('en'), ('de'), ('pl'), ('nl')) as lang(locale)
on conflict (flight_id, locale) do update set
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description;

insert into addons (code, price_cents, pricing_scope)
values
  ('MEDIA_PACKAGE', 3500, 'per_booking'),
  ('THERMAL_UPGRADE', 2200, 'per_person')
on conflict (code) do update set
  price_cents = excluded.price_cents,
  pricing_scope = excluded.pricing_scope,
  is_active = true;

insert into addon_translations (addon_id, locale, name, description)
select a.id, lang.locale,
  case a.code
    when 'MEDIA_PACKAGE' then case lang.locale when 'de' then 'Medienpaket' when 'pl' then 'Pakiet multimedialny' when 'nl' then 'Mediapakket' else 'Media Package' end
    else case lang.locale when 'de' then 'Thermik-Upgrade' when 'pl' then 'Ulepszenie termiczne' when 'nl' then 'Thermiek-upgrade' else 'Thermal Upgrade' end
  end,
  'Optional add-on.'
from addons a
cross join (values ('en'), ('de'), ('pl'), ('nl')) as lang(locale)
on conflict (addon_id, locale) do update set
  name = excluded.name,
  description = excluded.description;

insert into flight_addons (flight_id, addon_id, is_required)
select f.id, a.id, false
from flights f
join addons a on (
  a.code = 'MEDIA_PACKAGE'
  or (a.code = 'THERMAL_UPGRADE' and f.slug in ('skyline', 'extended'))
)
on conflict (flight_id, addon_id) do nothing;

insert into discount_codes (
  code,
  discount_type,
  discount_value,
  applies_to_scope,
  flight_id,
  max_uses,
  valid_from,
  valid_until
)
values
  ('KIDS', 'fixed_amount', 1200, 'per_person', null, 300, now(), now() + interval '1 year'),
  ('FAMILY', 'fixed_amount', 2000, 'per_booking', null, 200, now(), now() + interval '1 year'),
  ('GROUP', 'fixed_amount', 1500, 'per_person', (select id from flights where slug = 'skyline'), 250, now(), now() + interval '1 year')
on conflict (code) do update set
  discount_type = excluded.discount_type,
  discount_value = excluded.discount_value,
  applies_to_scope = excluded.applies_to_scope,
  flight_id = excluded.flight_id,
  max_uses = excluded.max_uses,
  valid_from = excluded.valid_from,
  valid_until = excluded.valid_until,
  is_active = true;

insert into seasons (code, name, start_date, end_date, priority)
values
  ('SUMMER', 'Summer Season', '2026-05-01', '2026-10-31', 10),
  ('WINTER', 'Winter Season', '2026-11-01', '2027-04-30', 20)
on conflict (code) do update set
  name = excluded.name,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  priority = excluded.priority,
  is_active = true;

insert into slot_templates (code, label, start_time, duration_minutes, default_capacity)
values
  ('S0845', '08:45', '08:45', 90, 6),
  ('S1015', '10:15', '10:15', 90, 6),
  ('S1130', '11:30', '11:30', 90, 6),
  ('S1245', '12:45', '12:45', 90, 6),
  ('S1415', '14:15', '14:15', 90, 6),
  ('S1530', '15:30', '15:30', 90, 6)
on conflict (code) do update set
  label = excluded.label,
  start_time = excluded.start_time,
  duration_minutes = excluded.duration_minutes,
  default_capacity = excluded.default_capacity,
  is_active = true;

with matrix as (
  select * from (values
    ('skyline', 'S0845'), ('skyline', 'S1015'), ('skyline', 'S1130'), ('skyline', 'S1245'), ('skyline', 'S1415'), ('skyline', 'S1530'),
    ('extended', 'S1130'), ('extended', 'S1245'), ('extended', 'S1415'), ('extended', 'S1530'),
    ('glory', 'S1415'), ('glory', 'S1530'),
    ('custom-air-adventure', 'S1415'), ('custom-air-adventure', 'S1530')
  ) as t(flight_slug, slot_code)
),
days as (
  select * from (values (0),(1),(2),(3),(4),(5),(6)) as x(day_of_week)
)
insert into slot_template_rules (season_id, flight_id, slot_template_id, day_of_week, is_bookable, capacity_override)
select s.id, f.id, st.id, d.day_of_week, true,
  case when s.code = 'WINTER' then 4 else null end
from matrix m
join flights f on f.slug = m.flight_slug
join slot_templates st on st.code = m.slot_code
join seasons s on s.code in ('SUMMER', 'WINTER')
join days d on true
on conflict (season_id, flight_id, slot_template_id, day_of_week) do update set
  is_bookable = excluded.is_bookable,
  capacity_override = excluded.capacity_override;

-- Generate 14 days of daily slots from template rules using shared capacity per real slot.
with target_dates as (
  select generate_series(current_date, current_date + interval '13 day', interval '1 day')::date as slot_date
),
active_seasons as (
  select td.slot_date, s.id as season_id
  from target_dates td
  join seasons s on td.slot_date between s.start_date and s.end_date and s.is_active = true
),
rule_instances as (
  select
    asn.slot_date,
    str.flight_id,
    str.slot_template_id,
    asn.season_id,
    coalesce(str.capacity_override, st.default_capacity) as capacity,
    st.start_time,
    st.duration_minutes
  from active_seasons asn
  join slot_template_rules str on str.season_id = asn.season_id
    and str.day_of_week = extract(dow from asn.slot_date)::smallint
    and str.is_bookable = true
  join slot_templates st on st.id = str.slot_template_id and st.is_active = true
)
insert into daily_slots (
  slot_date,
  flight_id,
  slot_template_id,
  season_id,
  slot_start,
  slot_end,
  state,
  is_bookable,
  capacity,
  shared_capacity_key,
  notes
)
select
  ri.slot_date,
  ri.flight_id,
  ri.slot_template_id,
  ri.season_id,
  (ri.slot_date::timestamp + ri.start_time) at time zone 'Europe/Vienna',
  (ri.slot_date::timestamp + ri.start_time + make_interval(mins => ri.duration_minutes)) at time zone 'Europe/Vienna',
  'open'::slot_state,
  true,
  ri.capacity,
  to_char(ri.slot_date, 'YYYYMMDD') || '_' || to_char(ri.start_time, 'HH24MI'),
  'Generated from rule seed'
from rule_instances ri
on conflict (flight_id, slot_start) do update set
  state = excluded.state,
  is_bookable = excluded.is_bookable,
  capacity = excluded.capacity,
  shared_capacity_key = excluded.shared_capacity_key,
  slot_end = excluded.slot_end,
  notes = excluded.notes;

insert into app_settings (key, value, description)
values
  ('booking.window_days', '60'::jsonb, 'How many days in advance customers can book.'),
  ('booking.default_token_ttl_hours', '48'::jsonb, 'TTL for secure self-service booking tokens.'),
  ('booking.reminder_lead_hours', '24'::jsonb, 'Hours before slot_start when reminder emails should be sent.'),
  ('booking.cancellation_cutoff_hours', '24'::jsonb, 'Hours before slot start where self-cancel is still allowed.'),
  ('booking.reschedule_cutoff_hours', '24'::jsonb, 'Hours before slot start where self-reschedule is still allowed.'),
  ('email.sender', '"Paragliding Ops <no-reply@example.com>"'::jsonb, 'Default sender identity for transactional emails.'),
  ('support.contact', '"support@example.com"'::jsonb, 'Support contact shown in customer emails.'),
  ('business.timezone', '"Europe/Vienna"'::jsonb, 'Primary operation timezone for slot generation.')
on conflict (key) do update set
  value = excluded.value,
  description = excluded.description;


update flights
set image_url = case slug
  when 'skyline' then '/images/flights/skyline.jpg'
  when 'extended' then '/images/flights/extended.jpg'
  when 'glory' then '/images/flights/glory.jpg'
  else '/images/flights/custom-air-adventure.jpg'
end;

insert into season_flights (season_id, flight_id, is_active)
select s.id, f.id, true
from seasons s
cross join flights f
on conflict (season_id, flight_id) do update set is_active = excluded.is_active;
