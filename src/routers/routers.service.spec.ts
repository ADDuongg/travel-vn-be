import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RouterService } from './routers.service';
import { Router } from './schemas/router.schema';

describe('RouterService', () => {
  let service: RouterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterService,
        {
          provide: getModelToken(Router.name),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<RouterService>(RouterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
