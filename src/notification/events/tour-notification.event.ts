export class TourNotificationEvent {
  constructor(
    public readonly tourId: string,
    public readonly tourCode?: string,
    public readonly tourName?: string,
    /**
     * Dùng cho case publish/unpublish nếu cần.
     */
    public readonly isActive?: boolean,
  ) {}
}
