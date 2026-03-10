export class GuideVerifiedEvent {
  constructor(
    public readonly guideId: string,
    public readonly userId: string,
    public readonly userName: string,
    public readonly userEmail: string | undefined,
    public readonly isVerified: boolean,
  ) {}
}
