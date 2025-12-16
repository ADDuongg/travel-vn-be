import { Test, TestingModule } from '@nestjs/testing';
import { ApiPermissionController } from './api-permission.controller';
import { ApiPermissionService } from './api-permission.service';

describe('ApiPermissionController', () => {
  let controller: ApiPermissionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiPermissionController],
      providers: [ApiPermissionService],
    }).compile();

    controller = module.get<ApiPermissionController>(ApiPermissionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
