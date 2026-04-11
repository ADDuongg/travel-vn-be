export class TourBookingNotificationEvent {
  constructor(
    public readonly bookingId: string,
    public readonly bookingCode: string,
    public readonly tourId: string,
    public readonly tourName?: string,
  ) {}
}
