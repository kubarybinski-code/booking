export type UUID = string;

export type LocaleCode = 'en' | 'de' | 'fr' | 'es' | 'it';

export interface BaseEntity {
  id: UUID;
  created_at: string;
  updated_at: string;
}

export interface Flight extends BaseEntity {
  slug: string;
  base_price_cents: number;
  min_people: 1 | 2 | 3;
  max_people: 1 | 2 | 3;
  is_active: boolean;
}

export interface FlightTranslation extends BaseEntity {
  flight_id: UUID;
  locale: LocaleCode;
  name: string;
  short_description: string | null;
  description: string | null;
}

export interface Addon extends BaseEntity {
  code: string;
  price_cents: number;
  is_active: boolean;
}

export interface AddonTranslation extends BaseEntity {
  addon_id: UUID;
  locale: LocaleCode;
  name: string;
  description: string | null;
}

export interface Booking extends BaseEntity {
  booking_reference: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'rescheduled';
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone: string | null;
  flight_id: UUID;
  daily_slot_id: UUID;
  people_count: 1 | 2 | 3;
  subtotal_cents: number;
  discount_code_id: UUID | null;
  discount_amount_cents: number;
  total_cents: number;
  notes: string | null;
  cancelled_at: string | null;
  rescheduled_from_booking_id: UUID | null;
}
