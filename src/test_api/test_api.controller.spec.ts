import { Test, TestingModule } from '@nestjs/testing';
import { TestApiController } from './test_api.controller';

describe('TestApiController', () => {
  let controller: TestApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestApiController],
    }).compile();

    controller = module.get<TestApiController>(TestApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
