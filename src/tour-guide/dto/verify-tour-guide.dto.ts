import { IsBoolean } from 'class-validator';

export class VerifyTourGuideDto {
  @IsBoolean()
  isVerified: boolean;
}
