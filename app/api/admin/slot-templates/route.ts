import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const [templatesRes, rulesRes, flightsRes, seasonsRes] = await Promise.all([
      supabaseAdmin.from('slot_templates').select('*').order('start_time'),
      supabaseAdmin.from('slot_template_rules').select('*'),
      supabaseAdmin.from('flights').select('id, slug').eq('is_active', true),
      supabaseAdmin.from('seasons').select('id, code').eq('is_active', true),
    ]);
    if (templatesRes.error || rulesRes.error || flightsRes.error || seasonsRes.error) return NextResponse.json({ error: templatesRes.error?.message ?? rulesRes.error?.message ?? flightsRes.error?.message ?? seasonsRes.error?.message }, { status: 500 });
    return NextResponse.json({ templates: templatesRes.data ?? [], rules: rulesRes.data ?? [], flights: flightsRes.data ?? [], seasons: seasonsRes.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const p = await request.json();
    if (p.ruleId) {
      const { error } = await supabaseAdmin.from('slot_template_rules').update({ is_bookable: p.isBookable, capacity_override: p.capacityOverride ?? null }).eq('id', p.ruleId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ ok: true });
    }

    const { error } = await supabaseAdmin.from('slot_templates').update({
      label: p.label,
      start_time: p.startTime,
      duration_minutes: p.durationMinutes,
      default_capacity: p.defaultCapacity,
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
    const p = await request.json();
    if (p.kind === 'template') {
      const { data, error } = await supabaseAdmin.from('slot_templates').insert({
        code: p.code,
        label: p.label,
        start_time: p.startTime,
        duration_minutes: p.durationMinutes ?? 90,
        default_capacity: p.defaultCapacity ?? 6,
        is_active: true,
      }).select('id').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ id: data.id });
    }

    if (p.kind === 'rule') {
      const { data, error } = await supabaseAdmin.from('slot_template_rules').insert({
        season_id: p.seasonId,
        flight_id: p.flightId,
        slot_template_id: p.slotTemplateId,
        day_of_week: p.dayOfWeek,
        is_bookable: p.isBookable ?? true,
        capacity_override: p.capacityOverride ?? null,
      }).select('id').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      return NextResponse.json({ id: data.id });
    }

    return NextResponse.json({ error: 'Unsupported create operation' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
