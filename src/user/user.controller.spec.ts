import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CrudAuditInterceptor } from 'src/audit-log/interceptors/crud-audit.interceptor';
import { AdminGuard } from 'src/guards/admin.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { UserAdminController } from './user.admin.controller';
import { UserClientController } from './user.client.controller';
import { UserService } from './user.service';

const noopAuditInterceptor = {
  intercept(_ctx: ExecutionContext, next: CallHandler) {
    return next.handle();
  },
};

const userServiceMock = {
  create: jest.fn(),
  findAll: jest.fn(),
  updateProfile: jest.fn(),
  findOneById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('UserClientController', () => {
  let controller: UserClientController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserClientController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
    })
      .overrideInterceptor(CrudAuditInterceptor)
      .useValue(noopAuditInterceptor)
      .compile();

    controller = module.get<UserClientController>(UserClientController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

describe('UserAdminController', () => {
  let controller: UserAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAdminController],
      providers: [{ provide: UserService, useValue: userServiceMock }],
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

    controller = module.get<UserAdminController>(UserAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
