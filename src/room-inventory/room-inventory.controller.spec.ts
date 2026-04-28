import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from 'src/guards/admin.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { RoomInventoryAdminController } from './room-inventory.admin.controller';
import { RoomInventoryPublicController } from './room-inventory.public.controller';
import { RoomInventoryService } from './room-inventory.service';

const invServiceMock = {
  ensureInventoryExists: jest.fn(),
  getMaxRoomsCanBook: jest.fn(),
};

describe('RoomInventoryPublicController', () => {
  let controller: RoomInventoryPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomInventoryPublicController],
      providers: [{ provide: RoomInventoryService, useValue: invServiceMock }],
    }).compile();

    controller = module.get<RoomInventoryPublicController>(
      RoomInventoryPublicController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('RoomInventoryAdminController', () => {
  let controller: RoomInventoryAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomInventoryAdminController],
      providers: [{ provide: RoomInventoryService, useValue: invServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RoomInventoryAdminController>(
      RoomInventoryAdminController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
