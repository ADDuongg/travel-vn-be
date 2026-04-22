import {
  IsEnum,
  IsIP,
  IsMongoId,
  IsOptional,
  IsString,
  IsDateString,
  IsIn,
} from 'class-validator';
import { AuditCategory, AuditResourceType } from '../enums/audit-log.enum';

export class AuditLogExportQueryDto {
  @IsOptional()
  @IsMongoId()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsEnum(AuditResourceType)
  resourceType?: AuditResourceType;

  @IsOptional()
  @IsIP()
  ip?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsIn(['csv', 'xlsx'])
  format: 'csv' | 'xlsx';
}
