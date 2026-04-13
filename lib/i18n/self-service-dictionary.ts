import type { SupportedLocale } from '@/types/booking';

export const selfServiceDictionary: Record<SupportedLocale, Record<string, string>> = {
  en: {
    title: 'Manage your booking',
    invalid: 'This link is invalid or expired.',
    cancel: 'Cancel booking',
    reschedule: 'Reschedule booking',
    chooseDate: 'Choose new date',
    chooseSlot: 'Choose new slot',
    submitReschedule: 'Confirm reschedule',
    successCancel: 'Your booking has been cancelled.',
    successReschedule: 'Your booking has been rescheduled.',
    cutoff: 'Online action deadline has passed. Please contact support.',
  },
  de: {
    title: 'Buchung verwalten', invalid: 'Dieser Link ist ungültig oder abgelaufen.', cancel: 'Buchung stornieren',
    reschedule: 'Buchung umbuchen', chooseDate: 'Neues Datum wählen', chooseSlot: 'Neuen Slot wählen',
    submitReschedule: 'Umbuchung bestätigen', successCancel: 'Deine Buchung wurde storniert.',
    successReschedule: 'Deine Buchung wurde umgebucht.', cutoff: 'Die Frist für diese Aktion ist abgelaufen. Bitte kontaktiere den Support.',
  },
  pl: {
    title: 'Zarządzaj rezerwacją', invalid: 'Link jest nieprawidłowy lub wygasł.', cancel: 'Anuluj rezerwację',
    reschedule: 'Przełóż rezerwację', chooseDate: 'Wybierz nową datę', chooseSlot: 'Wybierz nowy termin',
    submitReschedule: 'Potwierdź zmianę', successCancel: 'Twoja rezerwacja została anulowana.',
    successReschedule: 'Twoja rezerwacja została przełożona.', cutoff: 'Termin na tę akcję minął. Skontaktuj się z obsługą.',
  },
  nl: {
    title: 'Beheer je boeking', invalid: 'Deze link is ongeldig of verlopen.', cancel: 'Boeking annuleren',
    reschedule: 'Boeking verplaatsen', chooseDate: 'Kies nieuwe datum', chooseSlot: 'Kies nieuw tijdslot',
    submitReschedule: 'Verplaatsing bevestigen', successCancel: 'Je boeking is geannuleerd.',
    successReschedule: 'Je boeking is verplaatst.', cutoff: 'De deadline voor deze actie is verstreken. Neem contact op met support.',
  },
};
