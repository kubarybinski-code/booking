/**
 * Value object to keep capacity math centralized.
 */
export class SlotCapacity {
  constructor(
    private readonly capacity: number,
    private readonly alreadyBookedSeats: number,
  ) {}

  get remainingSeats() {
    return Math.max(0, this.capacity - this.alreadyBookedSeats);
  }

  canAccommodate(requestedPeople: number) {
    return requestedPeople > 0 && requestedPeople <= this.remainingSeats;
  }
}
