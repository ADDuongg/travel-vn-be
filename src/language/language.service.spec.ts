import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LanguageService } from './language.service';
import { Language } from './schema/language.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { UpdateLanguageDto } from './dto/update-language.dto';

describe('LanguageService', () => {
  let service: LanguageService;
  let cloudinaryService: {
    uploadFile: jest.Mock;
    deleteFile: jest.Mock;
    isConfigured: jest.Mock;
  };

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
      uploadFile: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/demo/image/upload/v1/new-flag.jpg',
        public_id: 'languages/flags/new-flag',
      }),
      deleteFile: jest.fn().mockResolvedValue(undefined),
      isConfigured: jest.fn().mockReturnValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        {
          provide: getModelToken(Language.name),
          useValue: {
            findOne: jest.fn().mockImplementation((filter) => {
              const codeFilter = filter?.code;
              if (
                codeFilter?.$regex === '^en$' &&
                codeFilter?.$options === 'i'
              ) {
                return { exec: () => Promise.resolve(langDoc) };
              }
              return { exec: () => Promise.resolve(null) };
            }),
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

  it('keeps flagUrl when dto sends empty flagUrl after upload', async () => {
    await service.update(
      'en',
      { name: 'English', flagUrl: '' } as UpdateLanguageDto & { flagUrl: string },
      {
        fieldname: 'flag',
        originalname: 'flag.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 100,
        buffer: Buffer.from('fake'),
      } as Express.Multer.File,
    );

    expect(langDoc.flagUrl).toBe(
      'https://res.cloudinary.com/demo/image/upload/v1/new-flag.jpg',
    );
    expect(langDoc.flagPublicId).toBe('languages/flags/new-flag');
  });

  it('returns 503 when cloudinary is not configured but flag file is sent', async () => {
    cloudinaryService.isConfigured.mockReturnValue(false);

    await expect(
      service.update('en', { name: 'English' }, {
        fieldname: 'flag',
        originalname: 'flag.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        size: 100,
        buffer: Buffer.from('fake'),
      } as Express.Multer.File),
    ).rejects.toMatchObject({
      statusCode: 503,
      errorCode: 'CLOUDINARY_NOT_CONFIGURED',
    });
  });
});
