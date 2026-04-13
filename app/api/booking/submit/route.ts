import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateBookingPayload } from '@/lib/booking/validators';
import { sendBookingLifecycleEmail } from '@/lib/email/booking-email-service';
import type { BookingRequestPayload } from '@/types/booking';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as BookingRequestPayload;

    try {
      validateBookingPayload(payload);
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
    }

    const rpcRes = await supabaseAdmin.rpc('create_booking_safe', {
      p_flight_id: payload.flightId,
      p_daily_slot_id: payload.dailySlotId,
      p_people_count: payload.peopleCount,
      p_customer_first_name: payload.customerFirstName,
      p_customer_last_name: payload.customerLastName,
      p_customer_email: payload.customerEmail,
      p_customer_phone: payload.customerPhone ?? null,
      p_notes: null,
      p_discount_code: payload.discountCode?.trim() || null,
      p_addons: payload.addons.map((addon) => ({ addon_id: addon.addonId, quantity: addon.quantity })),
    });

    if (rpcRes.error) {
      return NextResponse.json({ error: rpcRes.error.message }, { status: 400 });
    }

    const booking = rpcRes.data?.[0] ?? null;

    if (booking?.booking_id) {
      await supabaseAdmin.from('bookings').update({ language: payload.language ?? 'en' }).eq('id', booking.booking_id);
      try {
        await sendBookingLifecycleEmail(booking.booking_id, 'confirmation');
      } catch (error) {
        console.error('confirmation_email_failed', error);
      }
    }

    return NextResponse.json({ booking });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
