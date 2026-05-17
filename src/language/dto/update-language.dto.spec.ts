import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateLanguageDto } from './update-language.dto';

describe('UpdateLanguageDto', () => {
  it('coerces multipart isActive string to boolean', async () => {
    const dto = plainToInstance(UpdateLanguageDto, {
      name: 'English',
      isActive: 'true',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.isActive).toBe(true);
  });
});
