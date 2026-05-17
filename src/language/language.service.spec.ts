import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LanguageService } from './language.service';
import { Language } from './schema/language.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

describe('LanguageService', () => {
  let service: LanguageService;
  let cloudinaryService: { uploadFile: jest.Mock; deleteFile: jest.Mock };

  const save = jest.fn().mockResolvedValue({ code: 'EN', name: 'English' });
  const langDoc = {
    code: 'EN',
    name: 'English',
    flagPublicId: 'old-flag',
    flagUrl: 'https://example.com/old.png',
    save,
  };

  beforeEach(async () => {
    save.mockClear();
    cloudinaryService = {
      uploadFile: jest.fn(),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        {
          provide: getModelToken(Language.name),
          useValue: {
            findOne: jest.fn().mockResolvedValue(langDoc),
          },
        },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('skips cloudinary when flag multipart field is empty', async () => {
    await service.update('en', { name: 'English', isActive: true }, {
      fieldname: 'flag',
      originalname: 'flag.jfif',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 0,
      buffer: Buffer.alloc(0),
    } as Express.Multer.File);

    expect(cloudinaryService.deleteFile).not.toHaveBeenCalled();
    expect(cloudinaryService.uploadFile).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });
});
