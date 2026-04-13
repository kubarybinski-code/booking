import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    await requireAdminUser();
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10);
  const [bookingsRes, slotsRes] = await Promise.all([
    supabaseAdmin.from('bookings').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('daily_slots').select('id', { count: 'exact', head: true }).eq('slot_date', today),
  ]);

  return NextResponse.json({
    bookingsCount: bookingsRes.count ?? 0,
    todaySlotsCount: slotsRes.count ?? 0,
  });
}
