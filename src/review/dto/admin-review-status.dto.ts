import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewStatus } from '../schema/ewview.schema';

export class AdminReviewStatusDto {
  @IsEnum(ReviewStatus)
  status: ReviewStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectReason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  hiddenReason?: string;
}
