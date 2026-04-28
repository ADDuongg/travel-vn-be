import { Test, TestingModule } from '@nestjs/testing';
import { LanguagePublicController } from './language.public.controller';
import { LanguageService } from './language.service';

describe('LanguagePublicController', () => {
  let controller: LanguagePublicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguagePublicController],
      providers: [
        {
          provide: LanguageService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<LanguagePublicController>(LanguagePublicController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
