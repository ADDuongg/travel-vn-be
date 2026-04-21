import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HotelService } from './hotel.service';
import { Hotel } from './schema/hotel.schema';
import { ProvincesService } from 'src/provinces/provinces.service';
import { FavoriteService } from 'src/favorite/favorite.service';

describe('HotelService', () => {
  let service: HotelService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HotelService,
        { provide: getModelToken(Hotel.name), useValue: {} },
        {
          provide: ProvincesService,
          useValue: { findAllForDropdown: jest.fn().mockResolvedValue([]) },
        },
        { provide: FavoriteService, useValue: {} },
      ],
    }).compile();

    service = module.get<HotelService>(HotelService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
