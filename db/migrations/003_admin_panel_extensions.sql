alter table flights
  add column if not exists image_url text;

create table if not exists season_flights (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references seasons(id) on delete cascade,
  flight_id uuid not null references flights(id) on delete cascade,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, flight_id)
);

create trigger season_flights_set_updated_at before update on season_flights for each row execute function set_updated_at();

create or replace function admin_cancel_booking(
  p_booking_id uuid,
  p_reason text default 'Cancelled by admin'
)
returns void
language plpgsql
security definer
as $$
begin
  update bookings
  set status = 'cancelled',
      cancelled_at = now()
  where id = p_booking_id
    and status <> 'cancelled';

  if not found then
    raise exception 'Booking not found or already cancelled';
  end if;

  insert into booking_history (booking_id, action, actor_type, payload)
  values (p_booking_id, 'cancelled', 'admin', jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function admin_update_booking(
  p_booking_id uuid,
  p_flight_id uuid,
  p_daily_slot_id uuid,
  p_people_count smallint,
  p_customer_first_name text,
  p_customer_last_name text,
  p_customer_email text,
  p_customer_phone text,
  p_discount_code text,
  p_addons jsonb,
  p_actor text default 'admin'
)
returns table (booking_id uuid, booking_reference text, total_cents integer)
language plpgsql
security definer
as $$
declare
  v_existing bookings%rowtype;
  v_flight flights%rowtype;
  v_slot daily_slots%rowtype;
  v_code discount_codes%rowtype;
  v_used integer;
  v_subtotal integer;
  v_discount integer := 0;
  v_total integer;
  v_addon_row jsonb;
  v_addon addons%rowtype;
  v_qty integer;
  v_addon_total integer;
begin
  select * into v_existing from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_existing.status = 'cancelled' then raise exception 'Cancelled bookings cannot be edited'; end if;

  select * into v_flight from flights where id = p_flight_id and is_active = true;
  if not found then raise exception 'Invalid flight'; end if;

  if p_people_count < v_flight.min_people or p_people_count > v_flight.max_people then
    raise exception 'People count not allowed for flight';
  end if;

  select * into v_slot from daily_slots where id = p_daily_slot_id and flight_id = p_flight_id for update;
  if not found then raise exception 'Invalid slot for selected flight'; end if;
  if v_slot.state <> 'open' or v_slot.is_bookable = false then raise exception 'Slot unavailable'; end if;

  perform 1 from daily_slots ds
   where ds.shared_capacity_key = v_slot.shared_capacity_key and ds.slot_start = v_slot.slot_start
   for update;

  select coalesce(sum(b.people_count),0) into v_used
  from bookings b
  join daily_slots ds on ds.id = b.daily_slot_id
  where ds.shared_capacity_key = v_slot.shared_capacity_key
    and ds.slot_start = v_slot.slot_start
    and b.status in ('pending','confirmed')
    and b.id <> p_booking_id;

  if v_used + p_people_count > v_slot.capacity then
    raise exception 'Not enough remaining capacity';
  end if;

  v_subtotal := v_flight.base_price_cents * p_people_count;

  delete from booking_addons where booking_id = p_booking_id;

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

    insert into booking_addons (booking_id, addon_id, quantity, unit_price_cents, total_price_cents)
    values (p_booking_id, v_addon.id, v_qty, v_addon.price_cents, v_addon_total);

    v_subtotal := v_subtotal + v_addon_total;
  end loop;

  if p_discount_code is not null and length(trim(p_discount_code)) > 0 then
    select * into v_code
    from discount_codes dc
    where upper(dc.code) = upper(trim(p_discount_code))
      and dc.is_active = true
      and (dc.valid_from is null or dc.valid_from <= now())
      and (dc.valid_until is null or dc.valid_until >= now())
      and (dc.flight_id is null or dc.flight_id = p_flight_id)
    limit 1;

    if not found then
      raise exception 'Invalid discount code';
    end if;

    v_discount := case
      when v_code.discount_type = 'fixed_amount' then
        greatest(0, round(v_code.discount_value * case when v_code.applies_to_scope = 'per_person' then p_people_count else 1 end))::integer
      else
        greatest(0, round(v_subtotal * (v_code.discount_value / 100.0)))::integer
    end;
  end if;

  v_discount := least(v_discount, v_subtotal);
  v_total := v_subtotal - v_discount;

  update bookings
  set flight_id = p_flight_id,
      daily_slot_id = p_daily_slot_id,
      people_count = p_people_count,
      customer_first_name = trim(p_customer_first_name),
      customer_last_name = trim(p_customer_last_name),
      customer_email = lower(trim(p_customer_email)),
      customer_phone = nullif(trim(p_customer_phone), ''),
      subtotal_cents = v_subtotal,
      discount_code_id = v_code.id,
      discount_amount_cents = v_discount,
      total_cents = v_total
  where id = p_booking_id;

  insert into booking_history (booking_id, action, actor_type, payload)
  values (
    p_booking_id,
    'updated',
    p_actor,
    jsonb_build_object(
      'old_flight_id', v_existing.flight_id,
      'new_flight_id', p_flight_id,
      'old_daily_slot_id', v_existing.daily_slot_id,
      'new_daily_slot_id', p_daily_slot_id,
      'old_people_count', v_existing.people_count,
      'new_people_count', p_people_count
    )
  );

  booking_id := p_booking_id;
  booking_reference := v_existing.booking_reference;
  total_cents := v_total;
  return next;
end;
$$;
