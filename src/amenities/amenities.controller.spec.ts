import { Test, TestingModule } from '@nestjs/testing';
import { AmenitiesPublicController } from './amenities.public.controller';
import { AmenitiesService } from './amenities.service';

describe('AmenitiesPublicController', () => {
  let controller: AmenitiesPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AmenitiesPublicController],
      providers: [
        {
          provide: AmenitiesService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AmenitiesPublicController>(AmenitiesPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
