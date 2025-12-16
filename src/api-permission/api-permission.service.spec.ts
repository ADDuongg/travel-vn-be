import { Test, TestingModule } from '@nestjs/testing';
import { ApiPermissionService } from './api-permission.service';

describe('ApiPermissionService', () => {
  let service: ApiPermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ApiPermissionService],
    }).compile();

    service = module.get<ApiPermissionService>(ApiPermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
