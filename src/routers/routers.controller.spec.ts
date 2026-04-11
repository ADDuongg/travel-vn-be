import { Test, TestingModule } from '@nestjs/testing';
import { RouterController } from './routers.controller';
import { RouterService } from './routers.service';

describe('RouterController', () => {
  let controller: RouterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RouterController],
      providers: [
        {
          provide: RouterService,
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

    controller = module.get<RouterController>(RouterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
