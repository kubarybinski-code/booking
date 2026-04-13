import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { hasEnoughCapacity } from '@/lib/booking/capacity';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const flightId = searchParams.get('flightId');
  const date = searchParams.get('date');
  const people = Number(searchParams.get('people') ?? '1');

  if (!flightId || !date || ![1, 2, 3].includes(people)) {
    return NextResponse.json({ error: 'Invalid query parameters.' }, { status: 400 });
  }

  const slotsRes = await supabaseAdmin
    .from('daily_slots')
    .select('id, slot_start, slot_end, capacity, shared_capacity_key, state, is_bookable, season_id, slot_template_id')
    .eq('flight_id', flightId)
    .eq('slot_date', date)
    .eq('state', 'open')
    .eq('is_bookable', true)
    .order('slot_start', { ascending: true });

  if (slotsRes.error) {
    return NextResponse.json({ error: slotsRes.error.message }, { status: 500 });
  }

  const slots = slotsRes.data ?? [];
  if (!slots.length) return NextResponse.json({ slots: [] });

  const starts = slots.map((s) => s.slot_start);
  const keys = [...new Set(slots.map((s) => s.shared_capacity_key))];

  const usageRes = await supabaseAdmin
    .from('bookings')
    .select('people_count, status, daily_slots!inner(shared_capacity_key, slot_start)')
    .in('status', ['pending', 'confirmed'])
    .in('daily_slots.shared_capacity_key', keys)
    .in('daily_slots.slot_start', starts);

  if (usageRes.error) {
    return NextResponse.json({ error: usageRes.error.message }, { status: 500 });
  }

  const usageMap = new Map<string, number>();
  for (const booking of usageRes.data ?? []) {
    const slot = Array.isArray(booking.daily_slots) ? booking.daily_slots[0] : booking.daily_slots;
    const groupKey = `${slot.shared_capacity_key}_${slot.slot_start}`;
    usageMap.set(groupKey, (usageMap.get(groupKey) ?? 0) + booking.people_count);
  }

  const filtered = slots
    .map((slot) => {
      const groupKey = `${slot.shared_capacity_key}_${slot.slot_start}`;
      const used = usageMap.get(groupKey) ?? 0;
      const remainingSeats = Math.max(0, slot.capacity - used);
      return {
        id: slot.id,
        slotStartIso: slot.slot_start,
        slotEndIso: slot.slot_end,
        capacity: slot.capacity,
        remainingSeats,
      };
    })
    .filter((slot) => hasEnoughCapacity(slot.capacity, slot.capacity - slot.remainingSeats, people));

  return NextResponse.json({ slots: filtered });
}
