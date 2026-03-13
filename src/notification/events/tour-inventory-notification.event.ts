export class TourInventoryNotificationEvent {
  constructor(
    public readonly tourId: string,
    public readonly departureDate: string,
    public readonly totalSlots: number,
    public readonly availableSlots: number,
  ) {}
}

