import { NextResponse } from 'next/server';
import { getCutoffHours, hasCutoffPassed, validateSelfServiceToken } from '@/lib/booking/self-service';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reference = searchParams.get('reference') ?? '';
    const token = searchParams.get('token') ?? '';
    const action = (searchParams.get('action') as 'cancel' | 'reschedule' | null) ?? null;

    if (!reference || !token || !action) {
      return NextResponse.json({ error: 'Missing required query params.' }, { status: 400 });
    }

    const validation = await validateSelfServiceToken(reference, token, action);
    if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

    const slotStartIso = validation.booking.daily_slots.slot_start;
    const cancellationCutoff = await getCutoffHours('booking.cancellation_cutoff_hours');
    const rescheduleCutoff = await getCutoffHours('booking.reschedule_cutoff_hours');

    return NextResponse.json({
      locale: validation.locale,
      booking: validation.booking,
      action,
      canCancel: !hasCutoffPassed(slotStartIso, cancellationCutoff),
      canReschedule: !hasCutoffPassed(slotStartIso, rescheduleCutoff),
      slotStartIso,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
