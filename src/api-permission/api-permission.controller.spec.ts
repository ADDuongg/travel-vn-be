import { Test, TestingModule } from '@nestjs/testing';
import { ApiPermissionController } from './api-permission.controller';
import { ApiPermissionService } from './api-permission.service';

describe('ApiPermissionController', () => {
  let controller: ApiPermissionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiPermissionController],
      providers: [
        {
          provide: ApiPermissionService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ApiPermissionController>(ApiPermissionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
