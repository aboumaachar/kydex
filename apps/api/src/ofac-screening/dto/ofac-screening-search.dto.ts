import { IsArray, IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

function normalizeQueryAlias(value: unknown, source?: { fullName?: unknown; subject?: unknown; name?: unknown }) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }

  const fallback = [source?.fullName, source?.subject, source?.name]
    .find((entry) => typeof entry === 'string' && entry.trim().length > 0);

  return typeof fallback === 'string' ? fallback.trim() : undefined;
}

function normalizeSources(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter((entry) => entry.length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);
  }

  return undefined;
}

function normalizeBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }

  return undefined;
}

export class OfacScreeningSearchDto {
  @IsOptional()
  @Transform(({ value, obj }) => normalizeQueryAlias(value, obj))
  @IsString()
  @MaxLength(250)
  query?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  subject?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  screeningType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  notarySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientReference?: string;

  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value)))
  @IsString()
  @MaxLength(100)
  wpUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  wordpressSite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @Transform(({ value }) => normalizeSources(value))
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @Transform(({ value }) => normalizeBoolean(value))
  @IsBoolean()
  liveVerify?: boolean;
}