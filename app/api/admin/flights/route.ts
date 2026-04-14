import { NextResponse } from 'next/server';
import { requireAdminUser } from '@/lib/auth/admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

    const [flightsRes, seasonsRes, seasonFlightsRes] = await Promise.all([
      supabaseAdmin.from('flights').select('*, flight_translations(locale,name,description)').order('slug'),
      supabaseAdmin.from('seasons').select('id, code, name').order('priority'),
      supabaseAdmin.from('season_flights').select('season_id, flight_id, is_active'),
    ]);

    if (flightsRes.error || seasonsRes.error || seasonFlightsRes.error) {
      return NextResponse.json({ error: flightsRes.error?.message ?? seasonsRes.error?.message ?? seasonFlightsRes.error?.message }, { status: 500 });
    }

    return NextResponse.json({ flights: flightsRes.data ?? [], seasons: seasonsRes.data ?? [], seasonFlights: seasonFlightsRes.data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const payload = await request.json();
    const { error } = await supabaseAdmin.from('flights').update({
      base_price_cents: payload.basePriceCents,
      is_active: payload.isActive,
      slug: payload.slug,
      image_url: payload.imageUrl ?? null,
      booking_start_date: payload.bookingStartDate ?? null,
      booking_end_date: payload.bookingEndDate ?? null,
    }).eq('id', payload.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await supabaseAdmin.from('flight_translations').upsert({ flight_id: payload.id, locale: 'en', name: payload.name, description: payload.description }, { onConflict: 'flight_id,locale' });

    if (Array.isArray(payload.seasonAvailability)) {
      for (const item of payload.seasonAvailability) {
        await supabaseAdmin.from('season_flights').upsert({ season_id: item.seasonId, flight_id: payload.id, is_active: item.isActive }, { onConflict: 'season_id,flight_id' });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}


export async function POST(request: Request) {
  try {
    try { await requireAdminUser(); } catch { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }
    const payload = await request.json();
    const insert = await supabaseAdmin.from('flights').insert({
      slug: payload.slug,
      base_price_cents: payload.basePriceCents ?? 0,
      min_people: payload.minPeople ?? 1,
      max_people: payload.maxPeople ?? 3,
      is_active: payload.isActive ?? true,
      booking_start_date: payload.bookingStartDate ?? null,
      booking_end_date: payload.bookingEndDate ?? null,
      image_url: payload.imageUrl ?? null,
    }).select('id').single();
    if (insert.error) return NextResponse.json({ error: insert.error.message }, { status: 400 });

    await supabaseAdmin.from('flight_translations').upsert({
      flight_id: insert.data.id,
      locale: 'en',
      name: payload.name ?? payload.slug,
      description: payload.description ?? null,
    }, { onConflict: 'flight_id,locale' });

    return NextResponse.json({ id: insert.data.id });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
