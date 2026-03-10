export class GuideRegisteredEvent {
  constructor(
    public readonly guideId: string,
    public readonly userId: string,
    public readonly userName: string,
    public readonly userEmail?: string,
  ) {}
}
