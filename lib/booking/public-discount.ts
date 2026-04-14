import { supabaseAdmin } from '@/lib/supabase/admin';

export const NON_STACKING_ERROR = 'Public discounts cannot be combined. Remove the promo code to use the automatic discount for this booking.';

export async function getEligibleAutomaticPublicDiscount(
  flightId: string,
  peopleCount: number,
): Promise<{ ruleType: string; amountCents: number } | null> {
  const { data, error } = await supabaseAdmin
    .from('discount_rule_configs')
    .select('rule_type, people_discount_map, applicable_flight_ids, is_active')
    .eq('is_active', true);

  if (error) throw new Error(error.message);

  let best: { ruleType: string; amountCents: number } | null = null;

  for (const rule of data ?? []) {
    const ids = rule.applicable_flight_ids ?? [];
    if (Array.isArray(ids) && ids.length > 0 && !ids.includes(flightId)) continue;

    const map = (rule.people_discount_map ?? {}) as Record<string, number | string>;
    let discount = 0;
    for (const [minPeopleRaw, valueRaw] of Object.entries(map)) {
      const minPeople = Number(minPeopleRaw);
      const value = Number(valueRaw);
      if (!Number.isFinite(minPeople) || !Number.isFinite(value)) continue;
      if (peopleCount >= minPeople) {
        discount = Math.max(discount, value * peopleCount);
      }
    }

    if (discount > 0 && (!best || discount > best.amountCents)) {
      best = { ruleType: rule.rule_type, amountCents: discount };
    }
  }

  return best;
}

export async function assertPublicDiscountNonStacking(params: {
  flightId: string;
  peopleCount: number;
  discountCode?: string | null;
}) {
  const code = params.discountCode?.trim();
  if (!code) return;

  const auto = await getEligibleAutomaticPublicDiscount(params.flightId, params.peopleCount);
  if (auto) {
    throw new Error(NON_STACKING_ERROR);
  }
}
