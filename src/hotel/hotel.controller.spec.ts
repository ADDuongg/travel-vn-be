import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { AdminGuard } from 'src/guards/admin.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { HotelAdminController } from './hotel.admin.controller';
import { HotelPublicController } from './hotel.public.controller';
import { HotelService } from './hotel.service';

const noopAuditInterceptor = {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle();
  },
};

const hotelServiceMock = {
  create: jest.fn(),
  findAllActive: jest.fn(),
  findAllActiveOptions: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
};

describe('HotelPublicController', () => {
  let controller: HotelPublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HotelPublicController],
      providers: [{ provide: HotelService, useValue: hotelServiceMock }],
    }).compile();

    controller = module.get<HotelPublicController>(HotelPublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('HotelAdminController', () => {
  let controller: HotelAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HotelAdminController],
      providers: [{ provide: HotelService, useValue: hotelServiceMock }],
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

    controller = module.get<HotelAdminController>(HotelAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
