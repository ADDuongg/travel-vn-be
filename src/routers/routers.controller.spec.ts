import { Test, TestingModule } from '@nestjs/testing';
import { RoutersController } from './routers.controller';
import { RoutersService } from './routers.service';

describe('RoutersController', () => {
  let controller: RoutersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoutersController],
      providers: [RoutersService],
    }).compile();

    controller = module.get<RoutersController>(RoutersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
