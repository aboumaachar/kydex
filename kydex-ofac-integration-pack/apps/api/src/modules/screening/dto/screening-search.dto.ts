import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ScreeningSearchDto {
  @IsString()
  @MaxLength(250)
  query!: string;

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
  @IsString()
  @MaxLength(50)
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationality?: string;
}
