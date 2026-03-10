import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schema/notification.schema';
import { NotificationQueryDto } from './dto/notification-query.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async create(data: {
    recipientId: string;
    type: string;
    title: string;
    message: string;
    metadata?: Record<string, any>;
    link?: string;
  }) {
    return this.notificationModel.create({
      ...data,
      recipientId: new Types.ObjectId(data.recipientId),
    });
  }

  async createMany(
    notifications: Array<{
      recipientId: string;
      type: string;
      title: string;
      message: string;
      metadata?: Record<string, any>;
      link?: string;
    }>,
  ) {
    const docs = notifications.map((n) => ({
      ...n,
      recipientId: new Types.ObjectId(n.recipientId),
    }));
    return this.notificationModel.insertMany(docs);
  }

  async findByRecipient(recipientId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, isRead, type } = query;

    const filter: Record<string, unknown> = {
      recipientId: new Types.ObjectId(recipientId),
    };
    if (typeof isRead === 'boolean') filter.isRead = isRead;
    if (type) filter.type = type;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.notificationModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.notificationModel.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async getUnreadCount(recipientId: string): Promise<number> {
    return this.notificationModel.countDocuments({
      recipientId: new Types.ObjectId(recipientId),
      isRead: false,
    });
  }

  async markAsRead(notificationId: string, recipientId: string) {
    return this.notificationModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(notificationId),
        recipientId: new Types.ObjectId(recipientId),
      },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
  }

  async markAllAsRead(recipientId: string) {
    const result = await this.notificationModel.updateMany(
      {
        recipientId: new Types.ObjectId(recipientId),
        isRead: false,
      },
      { isRead: true, readAt: new Date() },
    );
    return { modifiedCount: result.modifiedCount };
  }
}
