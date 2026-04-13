import type { SupportedLocale } from '@/types/booking';

export const SUPPORTED_LOCALES: SupportedLocale[] = ['en', 'de', 'pl', 'nl'];

export const bookingDictionary: Record<SupportedLocale, Record<string, string>> = {
  en: {
    title: 'Book your tandem flight',
    flight: 'Flight type',
    people: 'People',
    date: 'Date',
    slot: 'Available slots',
    firstName: 'First name',
    lastName: 'Last name',
    email: 'Email',
    phone: 'Phone',
    discount: 'Discount code',
    addons: 'Add-ons',
    submit: 'Confirm booking',
    success: 'Booking confirmed',
    noSlots: 'No slots available for this selection.',
    language: 'Language',
  },
  de: {
    title: 'Buche deinen Tandemflug', flight: 'Flugtyp', people: 'Personen', date: 'Datum', slot: 'Verfügbare Slots',
    firstName: 'Vorname', lastName: 'Nachname', email: 'E-Mail', phone: 'Telefon', discount: 'Rabattcode',
    addons: 'Zusatzleistungen', submit: 'Buchung bestätigen', success: 'Buchung bestätigt',
    noSlots: 'Keine verfügbaren Slots für diese Auswahl.', language: 'Sprache',
  },
  pl: {
    title: 'Zarezerwuj lot tandemowy', flight: 'Typ lotu', people: 'Liczba osób', date: 'Data', slot: 'Dostępne terminy',
    firstName: 'Imię', lastName: 'Nazwisko', email: 'E-mail', phone: 'Telefon', discount: 'Kod rabatowy',
    addons: 'Dodatki', submit: 'Potwierdź rezerwację', success: 'Rezerwacja potwierdzona',
    noSlots: 'Brak dostępnych terminów dla wybranego wariantu.', language: 'Język',
  },
  nl: {
    title: 'Boek je tandemvlucht', flight: 'Vluchttype', people: 'Personen', date: 'Datum', slot: 'Beschikbare slots',
    firstName: 'Voornaam', lastName: 'Achternaam', email: 'E-mail', phone: 'Telefoon', discount: 'Kortingscode',
    addons: 'Extra opties', submit: 'Boeking bevestigen', success: 'Boeking bevestigd',
    noSlots: 'Geen beschikbare slots voor deze keuze.', language: 'Taal',
  },
};

export function resolveLocale(raw: string | null | undefined): SupportedLocale {
  if (!raw) return 'en';
  const normalized = raw.toLowerCase().slice(0, 2);
  return (SUPPORTED_LOCALES.includes(normalized as SupportedLocale) ? normalized : 'en') as SupportedLocale;
}
