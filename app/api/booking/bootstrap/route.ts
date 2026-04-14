import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { resolveLocale } from '@/lib/i18n/booking-dictionary';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = resolveLocale(searchParams.get('locale'));

    const [flightsRes, addonsRes, publicRulesRes] = await Promise.all([
      supabaseAdmin
        .from('flights')
        .select('id, slug, base_price_cents, min_people, max_people, flight_translations!inner(name, locale)')
        .eq('is_active', true)
        .eq('flight_translations.locale', locale)
        .order('base_price_cents', { ascending: true }),
      supabaseAdmin
        .from('addons')
        .select('id, code, price_cents, pricing_scope, addon_translations!inner(name, description, locale), flight_addons!inner(flight_id)')
        .eq('is_active', true)
        .eq('addon_translations.locale', locale),
      supabaseAdmin
        .from('discount_rule_configs')
        .select('rule_type, applicable_flight_ids, people_discount_map')
        .eq('is_active', true),
    ]);

    if (flightsRes.error || addonsRes.error || publicRulesRes.error) {
      return NextResponse.json({ error: flightsRes.error?.message ?? addonsRes.error?.message ?? publicRulesRes.error?.message }, { status: 500 });
    }

    const flights = (flightsRes.data ?? []).map((f) => ({
      id: f.id,
      slug: f.slug,
      basePriceCents: f.base_price_cents,
      minPeople: f.min_people,
      maxPeople: f.max_people,
      name: f.flight_translations[0]?.name ?? f.slug,
    }));

    const addons = (addonsRes.data ?? []).map((a) => ({
      id: a.id,
      code: a.code,
      priceCents: a.price_cents,
      pricingScope: a.pricing_scope,
      name: a.addon_translations[0]?.name ?? a.code,
      description: a.addon_translations[0]?.description ?? null,
      allowedFlightIds: a.flight_addons.map((fa) => fa.flight_id),
    }));

    const publicDiscountRules = (publicRulesRes.data ?? []).map((r) => ({
      ruleType: r.rule_type,
      applicableFlightIds: r.applicable_flight_ids ?? [],
      peopleDiscountMap: r.people_discount_map ?? {},
    }));

    return NextResponse.json({ flights, addons, publicDiscountRules });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 503 });
  }
}
