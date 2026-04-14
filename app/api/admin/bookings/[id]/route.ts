import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendBookingLifecycleEmail } from '@/lib/email/booking-email-service';
import { assertPublicDiscountNonStacking } from '@/lib/booking/public-discount';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { id } = await params;
    const [bookingRes, addonsRes, historyRes] = await Promise.all([
      supabaseAdmin.from('bookings').select('*, discount_codes(code)').eq('id', id).single(),
      supabaseAdmin.from('booking_addons').select('*').eq('booking_id', id),
      supabaseAdmin.from('booking_history').select('*').eq('booking_id', id).order('created_at', { ascending: false }),
    ]);

    if (bookingRes.error) return NextResponse.json({ error: bookingRes.error.message }, { status: 404 });

    const booking = { ...bookingRes.data, discount_code: bookingRes.data.discount_codes?.code ?? '' };
    return NextResponse.json({ booking, addons: addonsRes.data ?? [], history: historyRes.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const { id } = await params;
    const payload = await request.json();

    const { data: beforeBooking } = await supabaseAdmin.from('bookings').select('daily_slot_id, flight_id').eq('id', id).single();

    const flightId = payload.flightId ?? payload.flight_id;
    const peopleCount = payload.peopleCount ?? payload.people_count;
    const discountCode = payload.discountCode ?? payload.discount_code ?? null;

    try {
      await assertPublicDiscountNonStacking({
        flightId,
        peopleCount,
        discountCode,
      });
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    const rpc = await supabaseAdmin.rpc('admin_update_booking', {
      p_booking_id: id,
      p_flight_id: flightId,
      p_daily_slot_id: payload.dailySlotId ?? payload.daily_slot_id,
      p_people_count: peopleCount,
      p_customer_first_name: payload.customerFirstName ?? payload.customer_first_name,
      p_customer_last_name: payload.customerLastName ?? payload.customer_last_name,
      p_customer_email: payload.customerEmail ?? payload.customer_email,
      p_customer_phone: payload.customerPhone ?? payload.customer_phone ?? null,
      p_discount_code: discountCode,
      p_addons: payload.addons ?? payload.booking_addons ?? [],
      p_actor: 'admin',
    });

    if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 400 });

    const { data: afterBooking } = await supabaseAdmin.from('bookings').select('daily_slot_id, flight_id').eq('id', id).single();

    if (beforeBooking && afterBooking && (beforeBooking.daily_slot_id !== afterBooking.daily_slot_id || beforeBooking.flight_id !== afterBooking.flight_id)) {
      try { await sendBookingLifecycleEmail(id, 'reschedule'); } catch (error) { console.error('reschedule_email_failed', error); }
    }

    return NextResponse.json({ booking: rpc.data?.[0] ?? null });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
