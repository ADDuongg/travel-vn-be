import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { REDIS_CLIENT } from 'src/redis/redis.module';
import { User } from 'src/user/schema/user.schema';
import { RbacRolePermission } from 'src/rbac/schemas/rbac-role-permission.schema';
import { RolesService } from './roles.service';
import { Role } from './schemas/role.schema';

describe('RolesService', () => {
  let service: RolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getModelToken(Role.name), useValue: {} },
        { provide: getModelToken(User.name), useValue: {} },
        {
          provide: getModelToken(RbacRolePermission.name),
          useValue: {},
        },
        {
          provide: REDIS_CLIENT,
          useValue: { keys: jest.fn(), del: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
