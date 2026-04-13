import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const [templatesRes, rulesRes] = await Promise.all([
      supabaseAdmin.from('slot_templates').select('*').order('start_time'),
      supabaseAdmin.from('slot_template_rules').select('*'),
    ]);
    if (templatesRes.error || rulesRes.error) return NextResponse.json({ error: templatesRes.error?.message ?? rulesRes.error?.message }, { status: 500 });
    return NextResponse.json({ templates: templatesRes.data ?? [], rules: rulesRes.data ?? [] });
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
