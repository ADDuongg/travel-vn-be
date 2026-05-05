import { Test, TestingModule } from '@nestjs/testing';
import { RolesAdminController } from './roles.admin.controller';
import { RolesService } from './roles.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { AdminGuard } from 'src/guards/admin.guard';
import { PermissionGuard } from 'src/guards/permission.guard';

describe('RolesAdminController', () => {
  let controller: RolesAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesAdminController],
      providers: [
        {
          provide: RolesService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RolesAdminController>(RolesAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
