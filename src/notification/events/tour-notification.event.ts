export class TourNotificationEvent {
  constructor(
    public readonly tourId: string,
    public readonly tourCode?: string,
    public readonly tourName?: string,

    public readonly isActive?: boolean,
  ) {}
}
