import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendBookingLifecycleEmail } from '@/lib/email/booking-email-service';

export async function GET(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    if (!date) return NextResponse.json({ error: 'date required' }, { status: 400 });

    const slotsRes = await supabaseAdmin.from('daily_slots').select('id, slot_date, slot_start, state, is_bookable, capacity, shared_capacity_key, flight_id, flights(slug)').eq('slot_date', date).order('slot_start');
    if (slotsRes.error) return NextResponse.json({ error: slotsRes.error.message }, { status: 500 });

    const slotIds = (slotsRes.data ?? []).map((s) => s.id);
    const usageRes = slotIds.length
      ? await supabaseAdmin.from('bookings').select('daily_slot_id, people_count').in('status', ['pending', 'confirmed']).in('daily_slot_id', slotIds)
      : { data: [], error: null };

    if (usageRes.error) return NextResponse.json({ error: usageRes.error.message }, { status: 500 });

    const usage = new Map<string, number>();
    for (const b of usageRes.data ?? []) usage.set(b.daily_slot_id, (usage.get(b.daily_slot_id) ?? 0) + b.people_count);

    const slots = (slotsRes.data ?? []).map((s) => ({ ...s, bookedSeats: usage.get(s.id) ?? 0, remainingSeats: Math.max(0, s.capacity - (usage.get(s.id) ?? 0)) }));
    return NextResponse.json({ slots });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const p = await request.json();
    const { error } = await supabaseAdmin.from('daily_slots').update({ state: p.state, is_bookable: p.isBookable, capacity: p.capacity, notes: p.notes ?? null }).eq('id', p.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function POST(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const p = await request.json();

    if (p.kind === 'late-slot') {
      const startIso = `${p.date}T${p.time}:00+01:00`;
      const end = new Date(new Date(startIso).getTime() + 90 * 60 * 1000).toISOString();
      const { error } = await supabaseAdmin.from('daily_slots').insert({
        slot_date: p.date,
        flight_id: p.flightId,
        slot_start: startIso,
        slot_end: end,
        state: 'open',
        is_bookable: p.isBookable ?? true,
        capacity: p.capacity ?? 6,
        shared_capacity_key: `${p.date}_${p.time.replace(':', '')}`,
        notes: 'Manual late slot',
      });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    if (p.kind === 'manual-booking') {
      const rpc = await supabaseAdmin.rpc('create_booking_safe', {
        p_flight_id: p.flightId,
        p_daily_slot_id: p.dailySlotId,
        p_people_count: p.peopleCount,
        p_customer_first_name: p.firstName,
        p_customer_last_name: p.lastName,
        p_customer_email: p.email,
        p_customer_phone: p.phone ?? null,
        p_notes: 'Manual admin booking',
        p_discount_code: null,
        p_addons: [],
      });
      if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 400 });
      const booking = rpc.data?.[0] ?? null;
      if (booking?.booking_id) {
        try { await sendBookingLifecycleEmail(booking.booking_id, 'confirmation'); } catch (error) { console.error('manual_confirmation_email_failed', error); }
      }
      return NextResponse.json({ booking });
    }

    return NextResponse.json({ error: 'Unsupported operation' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
