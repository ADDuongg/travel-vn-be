import { Test, TestingModule } from '@nestjs/testing';
import { RoomInventoryService } from './room-inventory.service';

describe('RoomInventoryService', () => {
  let service: RoomInventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RoomInventoryService],
    }).compile();

    service = module.get<RoomInventoryService>(RoomInventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
