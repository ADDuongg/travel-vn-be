import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RoomInventoryService } from './room-inventory.service';
import { RoomInventory } from './schema/room-inventory.schema';
import { Room } from 'src/room/schema/room.schema';

describe('RoomInventoryService', () => {
  let service: RoomInventoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomInventoryService,
        { provide: getModelToken(RoomInventory.name), useValue: {} },
        { provide: getModelToken(Room.name), useValue: {} },
      ],
    }).compile();

    service = module.get<RoomInventoryService>(RoomInventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
