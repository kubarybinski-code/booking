import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const { data, error } = await supabaseAdmin.from('addons').select('*, addon_translations(locale,name,description), flight_addons(flight_id)').order('code');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ addons: data ?? [] });
}

export async function PATCH(request: Request) {
  try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
  const payload = await request.json();
  const { error } = await supabaseAdmin.from('addons').update({
    code: payload.code,
    price_cents: payload.priceCents,
    pricing_scope: payload.pricingScope,
    is_active: payload.isActive,
  }).eq('id', payload.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await supabaseAdmin.from('addon_translations').upsert({
    addon_id: payload.id,
    locale: 'en',
    name: payload.name,
    description: payload.description,
  }, { onConflict: 'addon_id,locale' });

  await supabaseAdmin.from('flight_addons').delete().eq('addon_id', payload.id);
  if ((payload.allowedFlightIds ?? []).length > 0) {
    await supabaseAdmin.from('flight_addons').insert(
      payload.allowedFlightIds.map((flightId: string) => ({ addon_id: payload.id, flight_id: flightId, is_required: false })),
    );
  }

  return NextResponse.json({ ok: true });
}
