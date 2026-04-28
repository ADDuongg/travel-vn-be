import { Test, TestingModule } from '@nestjs/testing';
import { RolesAdminController } from './roles.admin.controller';
import { RolesService } from './roles.service';

describe('RolesAdminController', () => {
  let controller: RolesAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesAdminController],
      providers: [
        {
          provide: RolesService,
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

    controller = module.get<RolesAdminController>(RolesAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
