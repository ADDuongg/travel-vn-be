import { Test, TestingModule } from '@nestjs/testing';
import { RouterRoleService } from './router-role.service';

describe('RouterRoleService', () => {
  let service: RouterRoleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RouterRoleService],
    }).compile();

    service = module.get<RouterRoleService>(RouterRoleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
