import { SlotCapacity } from '@/domain/value-objects/slot-capacity';

export function isSlotAvailable(slotCapacity: number, bookedSeats: number, requestedPeople: number) {
  const capacity = new SlotCapacity(slotCapacity, bookedSeats);
  return capacity.canAccommodate(requestedPeople);
}
