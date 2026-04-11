import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApiPermissionService } from './api-permission.service';
import { ApiPermission } from './schema/api-permission.schema';

describe('ApiPermissionService', () => {
  let service: ApiPermissionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiPermissionService,
        { provide: getModelToken(ApiPermission.name), useValue: {} },
      ],
    }).compile();

    service = module.get<ApiPermissionService>(ApiPermissionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
