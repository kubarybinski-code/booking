import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCutoffHours, hasCutoffPassed, markSelfServiceTokenUsed, validateSelfServiceToken } from '@/lib/booking/self-service';
import { sendBookingLifecycleEmail } from '@/lib/email/booking-email-service';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validation = await validateSelfServiceToken(payload.reference, payload.token, 'reschedule');
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const cutoffHours = await getCutoffHours('booking.reschedule_cutoff_hours');
    if (hasCutoffPassed(validation.booking.daily_slots.slot_start, cutoffHours)) {
      return NextResponse.json({ error: 'Reschedule cutoff has passed. Please contact support.' }, { status: 400 });
    }

    const rpc = await supabaseAdmin.rpc('customer_reschedule_booking', { p_booking_id: validation.booking.id, p_new_daily_slot_id: payload.dailySlotId });
    if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 400 });

    await markSelfServiceTokenUsed(validation.tokenRow.id);
    try { await sendBookingLifecycleEmail(validation.booking.id, 'reschedule'); } catch (error) { console.error(error); }

    return NextResponse.json({ ok: true, booking: rpc.data?.[0] ?? null });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
