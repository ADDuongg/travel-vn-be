export class TourGuideNotificationEvent {
  constructor(
    public readonly guideId: string,
    public readonly userId: string,
    public readonly userName: string,
    public readonly userEmail?: string,
    /**
     * Chỉ dùng cho event GUIDE_VERIFIED. Với GUIDE_REGISTERED có thể để undefined.
     */
    public readonly isVerified?: boolean,
  ) {}
}
