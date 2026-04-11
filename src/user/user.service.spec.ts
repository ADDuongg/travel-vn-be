import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { UserService } from './user.service';
import { User } from './schema/user.schema';
import { PermissionService } from 'src/permission/permission.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

describe('UserService', () => {
  let service: UserService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken(User.name), useValue: {} },
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
