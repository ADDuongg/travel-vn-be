import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { RouterRoleService } from './router-role.service';
import { RouterRole } from './schema/router-role.schema';

describe('RouterRoleService', () => {
  let service: RouterRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RouterRoleService,
        { provide: getModelToken(RouterRole.name), useValue: {} },
      ],
    }).compile();

    service = module.get<RouterRoleService>(RouterRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
