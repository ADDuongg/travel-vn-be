import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApiRoleService } from './api-role.service';
import { ApiRole } from './schema/api-role.schema';

describe('ApiRoleService', () => {
  let service: ApiRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiRoleService,
        { provide: getModelToken(ApiRole.name), useValue: {} },
      ],
    }).compile();

    service = module.get<ApiRoleService>(ApiRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
