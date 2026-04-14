import { NextResponse } from 'next/server';
import { sendBookingReminders } from '@/lib/email/booking-email-service';
import { serverEnv } from '@/lib/config/env';

export async function POST(request: Request) {
  if (serverEnv.CRON_SECRET && request.headers.get('x-cron-secret') !== serverEnv.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await sendBookingReminders();
  return NextResponse.json({ ok: true });
}
