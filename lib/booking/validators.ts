import type { BookingRequestPayload } from '@/types/booking';

export function validateBookingPayload(payload: BookingRequestPayload) {
  if (!payload.flightId) throw new Error('Flight is required.');
  if (!payload.dailySlotId) throw new Error('Slot is required.');
  if (![1, 2, 3].includes(payload.peopleCount)) throw new Error('People count must be 1, 2, or 3.');
  if (!payload.customerFirstName?.trim()) throw new Error('First name is required.');
  if (!payload.customerLastName?.trim()) throw new Error('Last name is required.');
  if (!payload.customerEmail?.trim()) throw new Error('Email is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.customerEmail)) throw new Error('Invalid email format.');
}
