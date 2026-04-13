create or replace function customer_cancel_booking(
  p_booking_id uuid,
  p_reason text default 'Cancelled by customer self-service'
)
returns void
language plpgsql
security definer
as $$
declare
  v_booking bookings%rowtype;
  v_slot daily_slots%rowtype;
  v_cutoff_hours integer := 24;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status = 'cancelled' then raise exception 'Booking already cancelled'; end if;

  select * into v_slot from daily_slots where id = v_booking.daily_slot_id;

  select coalesce((value #>> '{}')::integer, 24)
    into v_cutoff_hours
  from app_settings
  where key = 'booking.cancellation_cutoff_hours';

  if now() > (v_slot.slot_start - make_interval(hours => v_cutoff_hours)) then
    raise exception 'Cancellation cutoff has passed';
  end if;

  update bookings
  set status = 'cancelled',
      cancelled_at = now()
  where id = p_booking_id;

  insert into booking_history (booking_id, action, actor_type, payload)
  values (p_booking_id, 'cancelled', 'customer', jsonb_build_object('reason', p_reason));
end;
$$;

create or replace function customer_reschedule_booking(
  p_booking_id uuid,
  p_new_daily_slot_id uuid
)
returns table (booking_id uuid, booking_reference text)
language plpgsql
security definer
as $$
declare
  v_booking bookings%rowtype;
  v_old_slot daily_slots%rowtype;
  v_new_slot daily_slots%rowtype;
  v_cutoff_hours integer := 24;
  v_used integer;
begin
  select * into v_booking from bookings where id = p_booking_id for update;
  if not found then raise exception 'Booking not found'; end if;
  if v_booking.status = 'cancelled' then raise exception 'Cancelled booking cannot be rescheduled'; end if;

  select * into v_old_slot from daily_slots where id = v_booking.daily_slot_id;
  select * into v_new_slot from daily_slots where id = p_new_daily_slot_id and flight_id = v_booking.flight_id for update;

  if not found then raise exception 'Invalid target slot'; end if;

  select coalesce((value #>> '{}')::integer, 24)
    into v_cutoff_hours
  from app_settings
  where key = 'booking.reschedule_cutoff_hours';

  if now() > (v_old_slot.slot_start - make_interval(hours => v_cutoff_hours)) then
    raise exception 'Reschedule cutoff has passed';
  end if;

  if v_new_slot.state <> 'open' or v_new_slot.is_bookable = false then
    raise exception 'Target slot is unavailable';
  end if;

  if v_new_slot.slot_start <= now() then
    raise exception 'Target slot must be in the future';
  end if;

  if not exists (
    select 1
    from slot_template_rules str
    where str.flight_id = v_booking.flight_id
      and str.slot_template_id = v_new_slot.slot_template_id
      and str.season_id = v_new_slot.season_id
      and str.day_of_week = extract(dow from v_new_slot.slot_date)::smallint
      and str.is_bookable = true
  ) then
    raise exception 'Target slot does not match allowed flight rules';
  end if;

  perform 1 from daily_slots ds
   where ds.shared_capacity_key = v_new_slot.shared_capacity_key and ds.slot_start = v_new_slot.slot_start
   for update;

  select coalesce(sum(b.people_count), 0)
    into v_used
  from bookings b
  join daily_slots ds on ds.id = b.daily_slot_id
  where ds.shared_capacity_key = v_new_slot.shared_capacity_key
    and ds.slot_start = v_new_slot.slot_start
    and b.status in ('pending', 'confirmed', 'rescheduled')
    and b.id <> p_booking_id;

  if v_used + v_booking.people_count > v_new_slot.capacity then
    raise exception 'Not enough capacity in target slot';
  end if;

  update bookings
  set daily_slot_id = p_new_daily_slot_id,
      status = 'rescheduled'
  where id = p_booking_id;

  insert into booking_history (booking_id, action, actor_type, payload)
  values (
    p_booking_id,
    'rescheduled',
    'customer',
    jsonb_build_object('old_daily_slot_id', v_old_slot.id, 'new_daily_slot_id', v_new_slot.id)
  );

  booking_id := p_booking_id;
  booking_reference := v_booking.booking_reference;
  return next;
end;
$$;
