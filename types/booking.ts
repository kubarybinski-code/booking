export type SupportedLocale = 'en' | 'de' | 'pl' | 'nl';

export interface FlightOption {
  id: string;
  slug: string;
  name: string;
  basePriceCents: number;
  minPeople: number;
  maxPeople: number;
}

export interface AddonOption {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  pricingScope: 'per_booking' | 'per_person';
}

export interface SlotOption {
  id: string;
  slotStartIso: string;
  slotEndIso: string;
  capacity: number;
  remainingSeats: number;
}

export interface BookingRequestPayload {
  flightId: string;
  dailySlotId: string;
  peopleCount: number;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone?: string;
  discountCode?: string;
  addons: Array<{ addonId: string; quantity: number }>;
  language?: SupportedLocale;
}
