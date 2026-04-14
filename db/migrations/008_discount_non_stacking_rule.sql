create or replace function resolve_best_automatic_public_discount(
  p_flight_id uuid,
  p_people_count integer
)
returns table (rule_type text, amount_cents integer)
language sql
as $$
  with eligible as (
    select
      dr.rule_type,
      resolve_discount_from_people_map(dr.people_discount_map, p_people_count, true) as amount_cents
    from discount_rule_configs dr
    where dr.is_active = true
      and (array_length(dr.applicable_flight_ids, 1) is null or p_flight_id = any(dr.applicable_flight_ids))
  )
  select e.rule_type, e.amount_cents
  from eligible e
  where e.amount_cents > 0
  order by e.amount_cents desc, e.rule_type asc
  limit 1;
$$;

drop function if exists create_booking_safe(uuid, uuid, smallint, text, text, text, text, text, text, jsonb);

create function create_booking_safe(
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
returns table (
  booking_id uuid,
  booking_reference text,
  subtotal_cents integer,
  discount_amount_cents integer,
  total_cents integer,
  applied_public_discount_source text
)
language plpgsql
security definer
as $$
declare
  v_flight flights%rowtype;
  v_slot daily_slots%rowtype;
  v_code discount_codes%rowtype;
  v_auto_rule record;
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
  v_requires_manual_verification boolean := false;
  v_trimmed_code text := nullif(trim(coalesce(p_discount_code, '')), '');
begin
  if p_people_count < 1 or p_people_count > 3 then
    raise exception 'People count must be between 1 and 3';
  end if;

  select * into v_flight from flights where id = p_flight_id and is_active = true;
  if not found then
    raise exception 'Invalid or inactive flight';
  end if;

  select * into v_slot
  from daily_slots
  where id = p_daily_slot_id
    and flight_id = p_flight_id
  for update;

  if not found then
    raise exception 'Slot is not valid for selected flight';
  end if;

  if v_flight.booking_start_date is not null and v_flight.booking_end_date is not null and (v_slot.slot_date < v_flight.booking_start_date or v_slot.slot_date > v_flight.booking_end_date) then
    raise exception 'Flight is outside configured booking date range';
  end if;

  if p_people_count < v_flight.min_people or p_people_count > v_flight.max_people then
    raise exception 'People count not allowed for this flight';
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
    and b.status in ('pending', 'confirmed', 'rescheduled');

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

  select * into v_auto_rule from resolve_best_automatic_public_discount(p_flight_id, p_people_count);

  if v_trimmed_code is not null and coalesce(v_auto_rule.amount_cents, 0) > 0 then
    raise exception 'Public discounts cannot be combined. Remove the promo code to use the automatic discount for this booking.';
  end if;

  if v_trimmed_code is not null then
    select * into v_code
    from discount_codes dc
    where upper(dc.code) = upper(v_trimmed_code)
      and dc.is_active = true
      and (dc.valid_from is null or dc.valid_from <= now())
      and (dc.valid_until is null or dc.valid_until >= now())
      and (dc.max_uses is null or dc.used_count < dc.max_uses)
      and (dc.flight_id is null or dc.flight_id = p_flight_id)
    for update;

    if not found then
      raise exception 'Discount code is invalid for this booking';
    end if;

    if v_code.rule_type = 'family_code_rule' then
      v_discount := resolve_discount_from_people_map(v_code.people_discount_map, p_people_count, true);
      v_requires_manual_verification := coalesce(v_code.requires_manual_verification, false);
    else
      v_discount := case
        when v_code.discount_type = 'fixed_amount' then
          greatest(0, round(v_code.discount_value * case when v_code.applies_to_scope = 'per_person' then p_people_count else 1 end))::integer
        else
          greatest(0, round(v_subtotal * (v_code.discount_value / 100.0)))::integer
      end;
    end if;

    applied_public_discount_source := 'promo_code:' || v_code.code;
  elsif coalesce(v_auto_rule.amount_cents, 0) > 0 then
    v_discount := v_auto_rule.amount_cents;
    applied_public_discount_source := 'auto_rule:' || v_auto_rule.rule_type;
  else
    applied_public_discount_source := null;
  end if;

  v_discount := least(v_discount, v_subtotal);
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
    notes,
    requires_manual_verification
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
    p_notes,
    v_requires_manual_verification
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
  values (v_new_booking_id, 'created', 'customer', jsonb_build_object('discount_code', v_trimmed_code, 'people_count', p_people_count, 'applied_public_discount_source', applied_public_discount_source));

  booking_id := v_new_booking_id;
  booking_reference := v_ref;
  subtotal_cents := v_subtotal;
  discount_amount_cents := v_discount;
  total_cents := v_total;
  return next;
end;
$$;

drop function if exists admin_update_booking(uuid, uuid, uuid, smallint, text, text, text, text, text, jsonb, text);

create function admin_update_booking(
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
returns table (
  booking_id uuid,
  booking_reference text,
  subtotal_cents integer,
  discount_amount_cents integer,
  total_cents integer,
  applied_public_discount_source text
)
language plpgsql
security definer
as $$
declare
  v_existing bookings%rowtype;
  v_flight flights%rowtype;
  v_slot daily_slots%rowtype;
  v_code discount_codes%rowtype;
  v_auto_rule record;
  v_used integer;
  v_subtotal integer := 0;
  v_discount integer := 0;
  v_total integer;
  v_addon_row jsonb;
  v_addon addons%rowtype;
  v_qty integer;
  v_addon_total integer;
  v_requires_manual_verification boolean := false;
  v_trimmed_code text := nullif(trim(coalesce(p_discount_code, '')), '');
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

  if v_flight.booking_start_date is not null and v_flight.booking_end_date is not null and (v_slot.slot_date < v_flight.booking_start_date or v_slot.slot_date > v_flight.booking_end_date) then
    raise exception 'Flight is outside configured booking date range';
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

  perform 1 from daily_slots ds
   where ds.shared_capacity_key = v_slot.shared_capacity_key and ds.slot_start = v_slot.slot_start
   for update;

  select coalesce(sum(b.people_count),0) into v_used
  from bookings b
  join daily_slots ds on ds.id = b.daily_slot_id
  where ds.shared_capacity_key = v_slot.shared_capacity_key
    and ds.slot_start = v_slot.slot_start
    and b.status in ('pending','confirmed','rescheduled')
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

  select * into v_auto_rule from resolve_best_automatic_public_discount(p_flight_id, p_people_count);

  if v_trimmed_code is not null and coalesce(v_auto_rule.amount_cents, 0) > 0 then
    raise exception 'Public discounts cannot be combined. Remove the promo code to use the automatic discount for this booking.';
  end if;

  if v_trimmed_code is not null then
    select * into v_code
    from discount_codes dc
    where upper(dc.code) = upper(v_trimmed_code)
      and dc.is_active = true
      and (dc.valid_from is null or dc.valid_from <= now())
      and (dc.valid_until is null or dc.valid_until >= now())
      and (dc.max_uses is null or dc.used_count < dc.max_uses)
      and (dc.flight_id is null or dc.flight_id = p_flight_id)
    limit 1;

    if not found then
      raise exception 'Invalid discount code';
    end if;

    if v_code.rule_type = 'family_code_rule' then
      v_discount := resolve_discount_from_people_map(v_code.people_discount_map, p_people_count, true);
      v_requires_manual_verification := coalesce(v_code.requires_manual_verification, false);
    else
      v_discount := case
        when v_code.discount_type = 'fixed_amount' then
          greatest(0, round(v_code.discount_value * case when v_code.applies_to_scope = 'per_person' then p_people_count else 1 end))::integer
        else
          greatest(0, round(v_subtotal * (v_code.discount_value / 100.0)))::integer
      end;
    end if;

    applied_public_discount_source := 'promo_code:' || v_code.code;
  elsif coalesce(v_auto_rule.amount_cents, 0) > 0 then
    v_discount := v_auto_rule.amount_cents;
    applied_public_discount_source := 'auto_rule:' || v_auto_rule.rule_type;
  else
    applied_public_discount_source := null;
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
      total_cents = v_total,
      requires_manual_verification = v_requires_manual_verification
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
      'new_people_count', p_people_count,
      'applied_public_discount_source', applied_public_discount_source
    )
  );

  booking_id := p_booking_id;
  booking_reference := v_existing.booking_reference;
  subtotal_cents := v_subtotal;
  discount_amount_cents := v_discount;
  total_cents := v_total;
  return next;
end;
$$;
