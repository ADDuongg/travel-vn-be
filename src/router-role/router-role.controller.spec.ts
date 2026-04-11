import { Test, TestingModule } from '@nestjs/testing';
import { RouterRoleController } from './router-role.controller';
import { RouterRoleService } from './router-role.service';

describe('RouterRoleController', () => {
  let controller: RouterRoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouterRoleController],
      providers: [
        {
          provide: RouterRoleService,
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

    controller = module.get<RouterRoleController>(RouterRoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
