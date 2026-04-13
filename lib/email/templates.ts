import { EMAIL_TEXT } from '@/lib/email/i18n';
import type { BookingEmailContext } from '@/lib/email/types';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function renderBookingEmailHtml(context: BookingEmailContext, intro: string) {
  const text = EMAIL_TEXT[context.locale];
  const addonLine = context.addons.length ? context.addons.map((a) => `${a.name} x${a.quantity}`).join(', ') : '—';

  return `
  <div style="font-family:Arial,sans-serif;line-height:1.5;color:#0f172a;max-width:640px;margin:0 auto;">
    <h2>${intro}</h2>
    <p>${text.greeting} ${context.customerFirstName},</p>
    <p><strong>${text.summaryLabel}</strong></p>
    <ul>
      <li>Reference: ${context.bookingReference}</li>
      <li>Flight: ${context.flightName}</li>
      <li>Date: ${formatDate(context.slotStartIso)}</li>
      <li>Time: ${formatTime(context.slotStartIso)}</li>
      <li>People: ${context.peopleCount}</li>
      <li>Add-ons: ${addonLine}</li>
      <li>Contact: ${context.customerEmail}${context.customerPhone ? ` / ${context.customerPhone}` : ''}</li>
    </ul>
    <p><a href="${context.cancelUrl}">${text.cancelLabel}</a> · <a href="${context.rescheduleUrl}">${text.rescheduleLabel}</a></p>
    <p>${text.supportLabel}: ${context.supportContact}</p>
  </div>`;
}

export function renderReminderEmailHtml(context: BookingEmailContext) {
  const text = EMAIL_TEXT[context.locale];
  return `${renderBookingEmailHtml(context, text.summaryLabel)}<p>${text.reminderNote}</p>`;
}
