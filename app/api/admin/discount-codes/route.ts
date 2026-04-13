import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { data, error } = await supabaseAdmin.from('discount_codes').select('*').order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ codes: data ?? [] });
}

export async function PATCH(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const p = await request.json();
  const { error } = await supabaseAdmin.from('discount_codes').update({
    code: p.code,
    discount_value: p.discountValue,
    discount_type: p.discountType,
    applies_to_scope: p.appliesToScope,
    flight_id: p.flightId || null,
    valid_from: p.validFrom || null,
    valid_until: p.validUntil || null,
    is_active: p.isActive,
  }).eq('id', p.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
