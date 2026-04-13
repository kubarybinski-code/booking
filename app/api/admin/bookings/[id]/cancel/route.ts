import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendBookingLifecycleEmail } from '@/lib/email/booking-email-service';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const { reason } = await request.json();

  const rpc = await supabaseAdmin.rpc('admin_cancel_booking', {
    p_booking_id: id,
    p_reason: reason ?? 'Cancelled by admin',
  });

  if (rpc.error) return NextResponse.json({ error: rpc.error.message }, { status: 400 });

  try {
    await sendBookingLifecycleEmail(id, 'cancellation');
  } catch (error) {
    console.error('cancellation_email_failed', error);
  }
  return NextResponse.json({ ok: true });
}
