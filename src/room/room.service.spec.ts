import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RoomService } from './room.service';
import { Room } from './schema/room.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { HotelService } from 'src/hotel/hotel.service';
import { RoomInventoryService } from 'src/room-inventory/room-inventory.service';
import { AmenitiesService } from 'src/amenities/amenities.service';
import { FavoriteService } from 'src/favorite/favorite.service';

describe('RoomService', () => {
  let service: RoomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomService,
        { provide: getModelToken(Room.name), useValue: {} },
        { provide: CloudinaryService, useValue: { uploadFile: jest.fn() } },
        { provide: HotelService, useValue: { findById: jest.fn() } },
        {
          provide: RoomInventoryService,
          useValue: { ensureInventoryExists: jest.fn() },
        },
        {
          provide: AmenitiesService,
          useValue: { findIdsByCodes: jest.fn() },
        },
        { provide: FavoriteService, useValue: {} },
      ],
    }).compile();

    service = module.get<RoomService>(RoomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
