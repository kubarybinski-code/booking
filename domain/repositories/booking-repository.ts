import type { Booking } from '@/types/database';

export interface BookingRepository {
  create(input: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking>;
  findByReference(reference: string): Promise<Booking | null>;
}
