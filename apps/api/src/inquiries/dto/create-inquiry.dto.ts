import { IsString, IsOptional, MaxLength, IsObject } from 'class-validator';

export class CreateInquiryDto {
  @IsString()
  @MaxLength(300)
  query!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientReference?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  notarySlug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  wordpressSite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  wpUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  screeningType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
