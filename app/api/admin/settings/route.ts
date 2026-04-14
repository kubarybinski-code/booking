import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const { data, error } = await supabaseAdmin.from('app_settings').select('*').order('key');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ settings: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const p = await request.json();
    const { error } = await supabaseAdmin.from('app_settings').update({ value: p.value, description: p.description ?? null }).eq('id', p.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
