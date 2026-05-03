import { Transform } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

function toInt(value: unknown, fallback: number) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function toBoolean(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }

  return undefined;
}

export class ScreeningLogsQueryDto {
  @IsOptional()
  @Transform(({ value }) => toInt(value, 50))
  @IsInt()
  @Min(1)
  @Max(200)
  take = 50;

  @IsOptional()
  @Transform(({ value }) => toInt(value, 0))
  @IsInt()
  @Min(0)
  skip = 0;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  sourceMode?: string;

  @IsOptional()
  @Transform(({ value }) => toBoolean(value))
  @IsBoolean()
  usedFallback?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  status?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  requesterSlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  apiClient?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  query?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}