import type { Booking } from '@/types/database';

export interface BookingPriceBreakdown {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

export interface BookingWithPricing extends Booking {
  pricing: BookingPriceBreakdown;
}
