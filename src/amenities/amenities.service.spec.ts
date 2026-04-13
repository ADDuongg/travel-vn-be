import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { AmenitiesService } from './amenities.service';
import { Amenity } from './schema/amenity.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

describe('AmenitiesService', () => {
  let service: AmenitiesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AmenitiesService,
        { provide: getModelToken(Amenity.name), useValue: {} },
        { provide: CloudinaryService, useValue: { uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get<AmenitiesService>(AmenitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
