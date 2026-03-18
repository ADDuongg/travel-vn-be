import { IsEnum, IsOptional, IsString } from 'class-validator';

export enum DashboardRange {
  TODAY = 'today',
  SEVEN_DAYS = '7d',
  THIRTY_DAYS = '30d',
  CUSTOM = 'custom',
}

export class DashboardQueryDto {
  @IsOptional()
  @IsEnum(DashboardRange)
  range?: DashboardRange;

  /** ISO date string, chỉ dùng khi range=custom */
  @IsOptional()
  @IsString()
  from?: string;

  /** ISO date string, chỉ dùng khi range=custom */
  @IsOptional()
  @IsString()
  to?: string;
}

