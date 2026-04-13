import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { serverEnv } from '@/lib/config/env';
import { EMAIL_SUBJECTS } from '@/lib/email/i18n';
import { renderBookingEmailHtml, renderReminderEmailHtml } from '@/lib/email/templates';
import { sendTransactionalEmail } from '@/lib/email/resend';
import type { BookingEmailContext } from '@/lib/email/types';
import type { SupportedLocale } from '@/types/booking';

function normalizeLocale(value: string | null | undefined): SupportedLocale {
  const code = (value ?? 'en').slice(0, 2).toLowerCase();
  return (['en', 'de', 'pl', 'nl'].includes(code) ? code : 'en') as SupportedLocale;
}

async function getSetting(key: string, fallback: string) {
  const { data } = await supabaseAdmin.from('app_settings').select('value').eq('key', key).maybeSingle();
  if (!data?.value) return fallback;
  return typeof data.value === 'string' ? data.value : JSON.stringify(data.value).replace(/^"|"$/g, '');
}

async function createActionToken(bookingId: string, purpose: string) {
  const raw = crypto.randomBytes(24).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(raw).digest('hex');
  const ttlHours = Number(await getSetting('booking.default_token_ttl_hours', '48'));
  const expiresAt = new Date(Date.now() + ttlHours * 3600 * 1000).toISOString();

  await supabaseAdmin.from('secure_booking_tokens').insert({
    booking_id: bookingId,
    token_hash: tokenHash,
    purpose,
    expires_at: expiresAt,
  });

  return raw;
}

export async function getBookingEmailContext(bookingId: string): Promise<BookingEmailContext | null> {
  const [bookingRes, addonsRes] = await Promise.all([
    supabaseAdmin
      .from('bookings')
      .select('id, booking_reference, language, customer_first_name, customer_last_name, customer_email, customer_phone, people_count, daily_slots!inner(slot_start), flights!inner(slug, flight_translations(name, locale))')
      .eq('id', bookingId)
      .single(),
    supabaseAdmin
      .from('booking_addons')
      .select('quantity, addons!inner(code, addon_translations(name, locale))')
      .eq('booking_id', bookingId),
  ]);

  if (bookingRes.error || !bookingRes.data) return null;

  const booking = bookingRes.data;
  const locale = normalizeLocale(booking.language);
  const flightName = booking.flights.flight_translations.find((t: any) => t.locale === locale)?.name
    ?? booking.flights.flight_translations.find((t: any) => t.locale === 'en')?.name
    ?? booking.flights.slug;

  const addons = (addonsRes.data ?? []).map((item: any) => ({
    name: item.addons.addon_translations.find((t: any) => t.locale === locale)?.name
      ?? item.addons.addon_translations.find((t: any) => t.locale === 'en')?.name
      ?? item.addons.code,
    quantity: item.quantity,
  }));

  const supportContact = await getSetting('support.contact', 'support@example.com');
  const cancelToken = await createActionToken(booking.id, 'cancel');
  const rescheduleToken = await createActionToken(booking.id, 'reschedule');

  return {
    bookingId: booking.id,
    bookingReference: booking.booking_reference,
    locale,
    customerFirstName: booking.customer_first_name,
    customerLastName: booking.customer_last_name,
    customerEmail: booking.customer_email,
    customerPhone: booking.customer_phone,
    flightName,
    slotStartIso: booking.daily_slots.slot_start,
    peopleCount: booking.people_count,
    addons,
    supportContact,
    cancelUrl: `${serverEnv.APP_BASE_URL}/booking/manage/${booking.booking_reference}?action=cancel&token=${cancelToken}`,
    rescheduleUrl: `${serverEnv.APP_BASE_URL}/booking/manage/${booking.booking_reference}?action=reschedule&token=${rescheduleToken}`,
  };
}

export async function sendBookingLifecycleEmail(bookingId: string, event: 'confirmation' | 'reminder' | 'cancellation' | 'reschedule') {
  const context = await getBookingEmailContext(bookingId);
  if (!context) return;

  const sender = await getSetting('email.sender', 'Paragliding Ops <no-reply@example.com>');
  const subject = EMAIL_SUBJECTS[context.locale][event];
  const html = event === 'reminder'
    ? renderReminderEmailHtml(context)
    : renderBookingEmailHtml(context, subject);

  await sendTransactionalEmail({
    to: context.customerEmail,
    from: sender,
    subject,
    html,
  });
}

export async function sendBookingReminders() {
  const leadHours = Number(await getSetting('booking.reminder_lead_hours', '24'));
  const from = new Date(Date.now() + (leadHours - 1) * 3600 * 1000).toISOString();
  const to = new Date(Date.now() + (leadHours + 1) * 3600 * 1000).toISOString();

  const { data } = await supabaseAdmin
    .from('bookings')
    .select('id, daily_slots!inner(slot_start)')
    .eq('status', 'confirmed')
    .is('reminder_sent_at', null)
    .gte('daily_slots.slot_start', from)
    .lte('daily_slots.slot_start', to)
    .limit(100);

  for (const booking of data ?? []) {
    await sendBookingLifecycleEmail(booking.id, 'reminder');
    await supabaseAdmin.from('bookings').update({ reminder_sent_at: new Date().toISOString() }).eq('id', booking.id);
  }
}
