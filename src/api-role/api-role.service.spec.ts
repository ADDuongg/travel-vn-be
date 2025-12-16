import { Test, TestingModule } from '@nestjs/testing';
import { ApiRoleService } from './api-role.service';

describe('ApiRoleService', () => {
  let service: ApiRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiRoleService],
    }).compile();

    service = module.get<ApiRoleService>(ApiRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
