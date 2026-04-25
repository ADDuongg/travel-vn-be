import { Test, TestingModule } from '@nestjs/testing';
import { MediaService } from './media.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediaService,
        {
          provide: CloudinaryService,
          useValue: {
            uploadFile: jest.fn(),
            uploadFiles: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MediaService>(MediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
