import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Room, RoomDocument } from 'src/room/schema/room.schema';
import { Tour, TourDocument } from 'src/tour/schema/tour.schema';
import { Hotel, HotelDocument } from 'src/hotel/schema/hotel.schema';
import {
  TourGuide,
  TourGuideDocument,
} from 'src/tour-guide/schema/tour-guide.schema';

export type RatingSummaryPatch = {
  average: number;
  total: number;
};

@Injectable()
export class ReviewTargetRepository {
  constructor(
    @InjectModel(Room.name) private readonly roomModel: Model<RoomDocument>,
    @InjectModel(Tour.name) private readonly tourModel: Model<TourDocument>,
    @InjectModel(Hotel.name) private readonly hotelModel: Model<HotelDocument>,
    @InjectModel(TourGuide.name)
    private readonly tourGuideModel: Model<TourGuideDocument>,
  ) {}

  findToursSummaryDocs(ids: Types.ObjectId[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.tourModel
      .find({ _id: { $in: ids } })
      .select('translations thumbnail')
      .lean()
      .exec();
  }

  findRoomsSummaryDocs(ids: Types.ObjectId[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.roomModel
      .find({ _id: { $in: ids } })
      .select('translations thumbnail')
      .lean()
      .exec();
  }

  findHotelsSummaryDocs(ids: Types.ObjectId[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.hotelModel
      .find({ _id: { $in: ids } })
      .select('translations thumbnail')
      .lean()
      .exec();
  }

  findTourGuidesSummaryDocs(ids: Types.ObjectId[]) {
    if (!ids.length) return Promise.resolve([]);
    return this.tourGuideModel
      .find({ _id: { $in: ids } })
      .select('translations gallery')
      .lean()
      .exec();
  }

  async updateRoomRatingSummary(roomId: string, summary: RatingSummaryPatch) {
    await this.roomModel.findByIdAndUpdate(roomId, {
      ratingSummary: summary,
    });
  }

  async updateHotelRatingSummary(hotelId: string, summary: RatingSummaryPatch) {
    await this.hotelModel.findByIdAndUpdate(hotelId, {
      ratingSummary: summary,
    });
  }

  async updateTourRatingSummary(tourId: string, summary: RatingSummaryPatch) {
    await this.tourModel.findByIdAndUpdate(tourId, {
      ratingSummary: summary,
    });
  }

  async updateTourGuideRatingSummary(
    guideId: string,
    summary: RatingSummaryPatch,
  ) {
    await this.tourGuideModel.findByIdAndUpdate(guideId, {
      ratingSummary: summary,
    });
  }
}
