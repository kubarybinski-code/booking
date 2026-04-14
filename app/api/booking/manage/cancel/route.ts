import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getCutoffHours, hasCutoffPassed, markSelfServiceTokenUsed, validateSelfServiceToken } from '@/lib/booking/self-service';
import { sendBookingLifecycleEmail } from '@/lib/email/booking-email-service';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const validation = await validateSelfServiceToken(payload.reference, payload.token, 'cancel');
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const cutoffHours = await getCutoffHours('booking.cancellation_cutoff_hours');
    if (hasCutoffPassed(validation.booking.daily_slots.slot_start, cutoffHours)) {
      return NextResponse.json({ error: 'Cancellation cutoff has passed. Please contact support.' }, { status: 400 });
    }

    const rpc = await supabaseAdmin.rpc('customer_cancel_booking', { p_booking_id: validation.booking.id, p_reason: 'Cancelled by customer self-service' });
    if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 400 });

    await markSelfServiceTokenUsed(validation.tokenRow.id);
    try { await sendBookingLifecycleEmail(validation.booking.id, 'cancellation'); } catch (error) { console.error(error); }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
