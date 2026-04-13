import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export function hashBookingToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function validateSelfServiceToken(reference: string, token: string, purpose?: 'cancel' | 'reschedule') {
  const { data: booking } = await supabaseAdmin
    .from('bookings')
    .select('id, booking_reference, language, status, people_count, flight_id, daily_slot_id, customer_first_name, customer_last_name, customer_email, daily_slots!inner(slot_start, slot_date), flights!inner(slug, flight_translations(name, locale))')
    .eq('booking_reference', reference)
    .maybeSingle();

  if (!booking) return { ok: false as const, error: 'Booking not found.' };

  const tokenHash = hashBookingToken(token);
  let tokenQuery = supabaseAdmin
    .from('secure_booking_tokens')
    .select('id, purpose, expires_at, used_at')
    .eq('booking_id', booking.id)
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);

  if (purpose) tokenQuery = tokenQuery.eq('purpose', purpose);

  const { data: tokenRow } = await tokenQuery.maybeSingle();

  if (!tokenRow) return { ok: false as const, error: 'Invalid or expired link.' };

  const locale = ['en', 'de', 'pl', 'nl'].includes((booking.language ?? 'en').slice(0, 2))
    ? (booking.language.slice(0, 2) as 'en' | 'de' | 'pl' | 'nl')
    : 'en';

  return {
    ok: true as const,
    booking,
    tokenRow,
    locale,
  };
}

export async function markSelfServiceTokenUsed(tokenId: string) {
  await supabaseAdmin.from('secure_booking_tokens').update({ used_at: new Date().toISOString() }).eq('id', tokenId);
}

export async function getCutoffHours(key: 'booking.cancellation_cutoff_hours' | 'booking.reschedule_cutoff_hours', fallback = 24) {
  const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (!data?.value) return fallback;
  if (typeof data.value === 'number') return data.value;
  const parsed = Number(typeof data.value === 'string' ? data.value : data.value?.toString());
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function hasCutoffPassed(slotStartIso: string, cutoffHours: number) {
  const cutoffMs = new Date(slotStartIso).getTime() - cutoffHours * 60 * 60 * 1000;
  return Date.now() > cutoffMs;
}
