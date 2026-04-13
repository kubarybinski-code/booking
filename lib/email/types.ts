import type { SupportedLocale } from '@/types/booking';

export interface BookingEmailContext {
  bookingId: string;
  bookingReference: string;
  locale: SupportedLocale;
  customerFirstName: string;
  customerLastName: string;
  customerEmail: string;
  customerPhone: string | null;
  flightName: string;
  slotStartIso: string;
  peopleCount: number;
  addons: Array<{ name: string; quantity: number }>;
  supportContact: string;
  cancelUrl: string;
  rescheduleUrl: string;
}
