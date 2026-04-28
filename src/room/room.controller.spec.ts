import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { AdminGuard } from 'src/guards/admin.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { RoomAdminController } from './room.admin.controller';
import { RoomPublicController } from './room.public.controller';
import { RoomService } from './room.service';

const noopAuditInterceptor = {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle();
  },
};

const roomServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('RoomPublicController', () => {
  let controller: RoomPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomPublicController],
      providers: [{ provide: RoomService, useValue: roomServiceMock }],
    }).compile();

    controller = module.get<RoomPublicController>(RoomPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('RoomAdminController', () => {
  let controller: RoomAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoomAdminController],
      providers: [{ provide: RoomService, useValue: roomServiceMock }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .overrideInterceptor(CrudAuditInterceptor)
      .useValue(noopAuditInterceptor)
      .compile();

    controller = module.get<RoomAdminController>(RoomAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
