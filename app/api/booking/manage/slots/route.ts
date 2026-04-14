import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateSelfServiceToken } from '@/lib/booking/self-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference') ?? '';
    const token = searchParams.get('token') ?? '';
    const date = searchParams.get('date') ?? '';

    if (!reference || !token || !date) {
      return NextResponse.json({ error: 'Missing query parameters.' }, { status: 400 });
    }

    const validation = await validateSelfServiceToken(reference, token, 'reschedule');
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const booking = validation.booking;

    const slotsRes = await supabaseAdmin
      .from('daily_slots')
      .select('id, slot_start, slot_end, capacity, shared_capacity_key, state, is_bookable')
      .eq('flight_id', booking.flight_id)
      .eq('slot_date', date)
      .eq('state', 'open')
      .eq('is_bookable', true)
      .order('slot_start', { ascending: true });

    if (slotsRes.error) return NextResponse.json({ error: slotsRes.error.message }, { status: 500 });

    const slots = slotsRes.data ?? [];
    const starts = slots.map((s) => s.slot_start);
    const keys = [...new Set(slots.map((s) => s.shared_capacity_key))];

    const usageRes = await supabaseAdmin
      .from('bookings')
      .select('id, people_count, daily_slots!inner(shared_capacity_key, slot_start)')
      .in('status', ['pending', 'confirmed', 'rescheduled'])
      .in('daily_slots.shared_capacity_key', keys)
      .in('daily_slots.slot_start', starts);

    if (usageRes.error) return NextResponse.json({ error: usageRes.error.message }, { status: 500 });

    const usageMap = new Map<string, number>();
    for (const row of usageRes.data ?? []) {
      const slot = Array.isArray(row.daily_slots) ? row.daily_slots[0] : row.daily_slots;
      const key = `${slot.shared_capacity_key}_${slot.slot_start}`;
      const seats = row.id === booking.id ? 0 : row.people_count;
      usageMap.set(key, (usageMap.get(key) ?? 0) + seats);
    }

    const availableSlots = slots
      .map((slot) => {
        const key = `${slot.shared_capacity_key}_${slot.slot_start}`;
        const used = usageMap.get(key) ?? 0;
        const remainingSeats = Math.max(0, slot.capacity - used);
        return {
          id: slot.id,
          slotStartIso: slot.slot_start,
          slotEndIso: slot.slot_end,
          remainingSeats,
          capacity: slot.capacity,
        };
      })
      .filter((slot) => slot.remainingSeats >= booking.people_count);

    return NextResponse.json({ slots: availableSlots });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
