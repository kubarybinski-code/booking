alter table flights
  add column if not exists booking_start_date date,
  add column if not exists booking_end_date date;

alter table discount_codes
  add column if not exists rule_type text not null default 'standard_code',
  add column if not exists people_discount_map jsonb not null default '{}'::jsonb,
  add column if not exists requires_manual_verification boolean not null default false;

alter table bookings
  add column if not exists requires_manual_verification boolean not null default false;

create table if not exists discount_rule_configs (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null check (rule_type in ('group_discount', 'premium_bonus')),
  name text not null,
  is_active boolean not null default true,
  people_discount_map jsonb not null default '{}'::jsonb,
  applicable_flight_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger discount_rule_configs_set_updated_at before update on discount_rule_configs for each row execute function set_updated_at();

create or replace function resolve_discount_from_people_map(
  p_people_map jsonb,
  p_people_count integer,
  p_per_person boolean
)
returns integer
language plpgsql
as $$
declare
  v_result integer := 0;
  v_key text;
  v_value integer;
begin
  for v_key, v_value in
    select key, (value::text)::integer
    from jsonb_each_text(coalesce(p_people_map, '{}'::jsonb))
  loop
    if p_people_count >= v_key::integer then
      v_result := greatest(v_result, case when p_per_person then v_value * p_people_count else v_value end);
    end if;
  end loop;

  return greatest(v_result, 0);
end;
$$;
