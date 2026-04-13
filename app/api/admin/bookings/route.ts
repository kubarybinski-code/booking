import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const flightId = searchParams.get('flightId');
    const status = searchParams.get('status');

    let query = supabaseAdmin
      .from('bookings')
      .select('id, booking_reference, status, people_count, customer_first_name, customer_last_name, customer_email, created_at, flight_id, daily_slot_id, daily_slots(slot_start, slot_date), flights(slug)')
      .order('created_at', { ascending: false })
      .limit(200);

    if (status) query = query.eq('status', status);
    if (flightId) query = query.eq('flight_id', flightId);
    if (date) query = query.eq('daily_slots.slot_date', date);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bookings: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
