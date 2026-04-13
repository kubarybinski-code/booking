export function calculateRemainingSeats(totalCapacity: number, usedSeats: number) {
  return Math.max(0, totalCapacity - usedSeats);
}

export function hasEnoughCapacity(totalCapacity: number, usedSeats: number, requestedSeats: number) {
  return calculateRemainingSeats(totalCapacity, usedSeats) >= requestedSeats;
}
