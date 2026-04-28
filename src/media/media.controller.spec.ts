import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from 'src/guards/admin.guard';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionGuard } from 'src/guards/permission.guard';
import { MediaAdminController } from './media.admin.controller';
import { MediaService } from './media.service';

describe('MediaAdminController', () => {
  let controller: MediaAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MediaAdminController],
      providers: [
        {
          provide: MediaService,
          useValue: {
            uploadFile: jest.fn(),
            uploadFiles: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MediaAdminController>(MediaAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
