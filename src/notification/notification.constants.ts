export const NOTIFICATION_QUEUE = 'notification';

export enum NotificationEvent {
  GUIDE_REGISTERED = 'guide.registered',
  GUIDE_VERIFIED = 'guide.verified',
}

export enum NotificationType {
  GUIDE_REGISTRATION_PENDING = 'GUIDE_REGISTRATION_PENDING',
  GUIDE_VERIFIED = 'GUIDE_VERIFIED',
  GUIDE_REJECTED = 'GUIDE_REJECTED',
}
