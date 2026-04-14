import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const { data, error } = await supabaseAdmin.from('discount_codes').select('*').order('code');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ codes: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const p = await request.json();
    const { error } = await supabaseAdmin.from('discount_codes').update({
      code: p.code,
      discount_value: p.discountValue,
      discount_type: p.discountType,
      applies_to_scope: p.appliesToScope,
      flight_id: p.flightId || null,
      rule_type: p.ruleType ?? 'standard_code',
      people_discount_map: p.peopleDiscountMap ?? {},
      requires_manual_verification: p.requiresManualVerification ?? false,
      valid_from: p.validFrom || null,
      valid_until: p.validUntil || null,
      is_active: p.isActive,
    }).eq('id', p.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}


export async function POST(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const pld = await request.json();
    const { data, error } = await supabaseAdmin.from('discount_codes').insert({
      code: pld.code,
      discount_type: pld.discountType ?? 'fixed_amount',
      discount_value: pld.discountValue ?? 0,
      applies_to_scope: pld.appliesToScope ?? 'per_booking',
      rule_type: pld.ruleType ?? 'standard_code',
      people_discount_map: pld.peopleDiscountMap ?? {},
      requires_manual_verification: pld.requiresManualVerification ?? false,
      flight_id: pld.flightId || null,
      is_active: pld.isActive ?? true,
      valid_from: pld.validFrom || null,
      valid_until: pld.validUntil || null,
    }).select('id').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ id: data.id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
