create type pricing_scope as enum ('per_booking', 'per_person');

alter table addons
  add column if not exists pricing_scope pricing_scope not null default 'per_booking';

alter table discount_codes
  add column if not exists applies_to_scope pricing_scope not null default 'per_booking',
  add column if not exists flight_id uuid references flights(id) on delete set null;

create index if not exists discount_codes_flight_idx on discount_codes(flight_id, is_active);

create or replace function create_booking_safe(
  p_flight_id uuid,
  p_daily_slot_id uuid,
  p_people_count smallint,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_email text,
  p_customer_phone text,
  p_notes text default null,
  p_discount_code text default null,
  p_addons jsonb default '[]'::jsonb
)
returns table (booking_id uuid, booking_reference text, total_cents integer)
language plpgsql
security definer
as $$
declare
  v_flight flights%rowtype;
  v_slot daily_slots%rowtype;
  v_code discount_codes%rowtype;
  v_used_seats integer;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer := 0;
  v_ref text;
  v_new_booking_id uuid;
  v_addon_row jsonb;
  v_addon addons%rowtype;
  v_qty integer;
  v_addon_total integer;
begin
  if p_people_count < 1 or p_people_count > 3 then
    raise exception 'People count must be between 1 and 3';
  end if;

  select * into v_flight from flights where id = p_flight_id and is_active = true;
  if not found then
    raise exception 'Invalid or inactive flight';
  end if;

  if p_people_count < v_flight.min_people or p_people_count > v_flight.max_people then
    raise exception 'People count not allowed for this flight';
  end if;

  select * into v_slot
  from daily_slots
  where id = p_daily_slot_id
    and flight_id = p_flight_id
  for update;

  if not found then
    raise exception 'Slot is not valid for selected flight';
  end if;

  if v_slot.state <> 'open' or v_slot.is_bookable = false then
    raise exception 'Slot is closed for online booking';
  end if;

  if v_slot.slot_date < current_date then
    raise exception 'Cannot book slots in the past';
  end if;

  if not exists (
    select 1
    from slot_template_rules str
    where str.flight_id = p_flight_id
      and str.slot_template_id = v_slot.slot_template_id
      and str.season_id = v_slot.season_id
      and str.day_of_week = extract(dow from v_slot.slot_date)::smallint
      and str.is_bookable = true
  ) then
    raise exception 'Slot does not match active flight rule';
  end if;

  -- Lock every slot sharing the same real-world capacity pool.
  perform 1
  from daily_slots ds
  where ds.shared_capacity_key = v_slot.shared_capacity_key
    and ds.slot_start = v_slot.slot_start
  for update;

  select coalesce(sum(b.people_count), 0)
  into v_used_seats
  from bookings b
  join daily_slots ds on ds.id = b.daily_slot_id
  where ds.shared_capacity_key = v_slot.shared_capacity_key
    and ds.slot_start = v_slot.slot_start
    and b.status in ('pending', 'confirmed');

  if (v_used_seats + p_people_count) > v_slot.capacity then
    raise exception 'Not enough shared capacity for this slot';
  end if;

  v_subtotal := v_flight.base_price_cents * p_people_count;

  for v_addon_row in select * from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb))
  loop
    v_qty := greatest(1, coalesce((v_addon_row->>'quantity')::integer, 1));

    select a.* into v_addon
    from addons a
    join flight_addons fa on fa.addon_id = a.id and fa.flight_id = p_flight_id
    where a.id = (v_addon_row->>'addon_id')::uuid
      and a.is_active = true;

    if not found then
      raise exception 'Invalid add-on for this flight';
    end if;

    v_addon_total := case
      when v_addon.pricing_scope = 'per_person' then v_addon.price_cents * p_people_count * v_qty
      else v_addon.price_cents * v_qty
    end;

    v_subtotal := v_subtotal + v_addon_total;
  end loop;

  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select * into v_code
    from discount_codes dc
    where upper(dc.code) = upper(trim(p_discount_code))
      and dc.is_active = true
      and (dc.valid_from is null or dc.valid_from <= now())
      and (dc.valid_until is null or dc.valid_until >= now())
      and (dc.max_uses is null or dc.used_count < dc.max_uses)
      and (dc.flight_id is null or dc.flight_id = p_flight_id)
    for update;

    if not found then
      raise exception 'Discount code is invalid for this booking';
    end if;

    v_discount := case
      when v_code.discount_type = 'fixed_amount' then
        greatest(0, round(v_code.discount_value * case when v_code.applies_to_scope = 'per_person' then p_people_count else 1 end))::integer
      else
        greatest(0, round(v_subtotal * (v_code.discount_value / 100.0)))::integer
    end;

    v_discount := least(v_discount, v_subtotal);
  end if;

  v_total := v_subtotal - v_discount;
  v_ref := 'BK-' || to_char(now(), 'YYYYMMDD') || '-' || upper(replace(substring(gen_random_uuid()::text, 1, 8), '-', ''));

  insert into bookings (
    booking_reference,
    status,
    customer_first_name,
    customer_last_name,
    customer_email,
    customer_phone,
    flight_id,
    daily_slot_id,
    people_count,
    subtotal_cents,
    discount_code_id,
    discount_amount_cents,
    total_cents,
    notes
  )
  values (
    v_ref,
    'confirmed',
    trim(p_customer_first_name),
    trim(p_customer_last_name),
    lower(trim(p_customer_email)),
    nullif(trim(p_customer_phone), ''),
    p_flight_id,
    p_daily_slot_id,
    p_people_count,
    v_subtotal,
    v_code.id,
    v_discount,
    v_total,
    p_notes
  )
  returning id into v_new_booking_id;

  for v_addon_row in select * from jsonb_array_elements(coalesce(p_addons, '[]'::jsonb))
  loop
    v_qty := greatest(1, coalesce((v_addon_row->>'quantity')::integer, 1));

    select a.* into v_addon
    from addons a
    join flight_addons fa on fa.addon_id = a.id and fa.flight_id = p_flight_id
    where a.id = (v_addon_row->>'addon_id')::uuid
      and a.is_active = true;

    if found then
      v_addon_total := case
        when v_addon.pricing_scope = 'per_person' then v_addon.price_cents * p_people_count * v_qty
        else v_addon.price_cents * v_qty
      end;

      insert into booking_addons (booking_id, addon_id, quantity, unit_price_cents, total_price_cents)
      values (v_new_booking_id, v_addon.id, v_qty, v_addon.price_cents, v_addon_total)
      on conflict (booking_id, addon_id) do update set
        quantity = excluded.quantity,
        unit_price_cents = excluded.unit_price_cents,
        total_price_cents = excluded.total_price_cents;
    end if;
  end loop;

  if v_code.id is not null then
    update discount_codes set used_count = used_count + 1 where id = v_code.id;
  end if;

  insert into booking_history (booking_id, action, actor_type, payload)
  values (
    v_new_booking_id,
    'created',
    'customer',
    jsonb_build_object('discount_code', p_discount_code, 'people_count', p_people_count)
  );

  booking_id := v_new_booking_id;
  booking_reference := v_ref;
  total_cents := v_total;
  return next;
end;
$$;
