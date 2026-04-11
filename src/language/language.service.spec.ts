import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LanguageService } from './language.service';
import { Language } from './schema/language.schema';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

describe('LanguageService', () => {
  let service: LanguageService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LanguageService,
        { provide: getModelToken(Language.name), useValue: {} },
        { provide: CloudinaryService, useValue: { uploadFile: jest.fn() } },
      ],
    }).compile();

    service = module.get<LanguageService>(LanguageService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
