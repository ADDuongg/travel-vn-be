export class TourGuideNotificationEvent {
  constructor(
    public readonly guideId: string,
    public readonly userId: string,
    public readonly userName: string,
    public readonly userEmail?: string,

    public readonly isVerified?: boolean,
  ) {}
}
