import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PermissionService } from 'src/permission/permission.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UserRepository } from './user.repository';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: {} },
        {
          provide: PermissionService,
          useValue: { resolvePermissions: jest.fn() },
        },
        { provide: CloudinaryService, useValue: { uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
