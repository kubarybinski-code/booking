import type { SupportedLocale } from '@/types/booking';

export type EmailEvent = 'confirmation' | 'reminder' | 'cancellation' | 'reschedule';

export const EMAIL_SUBJECTS: Record<SupportedLocale, Record<EmailEvent, string>> = {
  en: {
    confirmation: 'Your paragliding booking is confirmed',
    reminder: 'Reminder: your tandem flight is coming up',
    cancellation: 'Your booking was cancelled',
    reschedule: 'Your booking was rescheduled',
  },
  de: {
    confirmation: 'Deine Paragliding-Buchung ist bestätigt',
    reminder: 'Erinnerung: Dein Tandemflug steht bevor',
    cancellation: 'Deine Buchung wurde storniert',
    reschedule: 'Deine Buchung wurde umgebucht',
  },
  pl: {
    confirmation: 'Twoja rezerwacja lotu została potwierdzona',
    reminder: 'Przypomnienie: Twój lot tandemowy zbliża się',
    cancellation: 'Twoja rezerwacja została anulowana',
    reschedule: 'Twoja rezerwacja została przełożona',
  },
  nl: {
    confirmation: 'Je boeking is bevestigd',
    reminder: 'Herinnering: je tandemvlucht komt eraan',
    cancellation: 'Je boeking is geannuleerd',
    reschedule: 'Je boeking is verplaatst',
  },
};

export const EMAIL_TEXT: Record<SupportedLocale, { greeting: string; reminderNote: string; supportLabel: string; cancelLabel: string; rescheduleLabel: string; summaryLabel: string }> = {
  en: { greeting: 'Hello', reminderNote: 'Please arrive 20 minutes early and bring weather-appropriate clothes.', supportLabel: 'Support', cancelLabel: 'Cancel booking', rescheduleLabel: 'Reschedule booking', summaryLabel: 'Booking summary' },
  de: { greeting: 'Hallo', reminderNote: 'Bitte sei 20 Minuten früher da und bring wetterfeste Kleidung mit.', supportLabel: 'Support', cancelLabel: 'Buchung stornieren', rescheduleLabel: 'Buchung umbuchen', summaryLabel: 'Buchungsübersicht' },
  pl: { greeting: 'Cześć', reminderNote: 'Przyjedź 20 minut wcześniej i zabierz ubranie odpowiednie do pogody.', supportLabel: 'Kontakt', cancelLabel: 'Anuluj rezerwację', rescheduleLabel: 'Przełóż rezerwację', summaryLabel: 'Podsumowanie rezerwacji' },
  nl: { greeting: 'Hallo', reminderNote: 'Kom 20 minuten eerder en neem kleding mee die past bij het weer.', supportLabel: 'Support', cancelLabel: 'Boeking annuleren', rescheduleLabel: 'Boeking verplaatsen', summaryLabel: 'Boekingsoverzicht' },
};
