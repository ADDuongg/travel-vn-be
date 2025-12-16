import { Test, TestingModule } from '@nestjs/testing';
import { ApiRoleController } from './api-role.controller';
import { ApiRoleService } from './api-role.service';

describe('ApiRoleController', () => {
  let controller: ApiRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiRoleController],
      providers: [ApiRoleService],
    }).compile();

    controller = module.get<ApiRoleController>(ApiRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
