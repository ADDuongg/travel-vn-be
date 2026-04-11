import { Test, TestingModule } from '@nestjs/testing';
import { ApiRoleController } from './api-role.controller';
import { ApiRoleService } from './api-role.service';

describe('ApiRoleController', () => {
  let controller: ApiRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiRoleController],
      providers: [
        {
          provide: ApiRoleService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findByRole: jest.fn(),
            remove: jest.fn(),
            replaceByRole: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApiRoleController>(ApiRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
