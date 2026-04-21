export class TourBookingPaymentExpiredClientEvent {
  constructor(
    public readonly userId: string,
    public readonly bookingId: string,
    public readonly bookingCode: string,
    public readonly tourId: string,
    public readonly tourName?: string,
  ) {}
}

export class RoomBookingPaymentExpiredClientEvent {
  constructor(
    public readonly userId: string,
    public readonly bookingId: string,
  ) {}
}
