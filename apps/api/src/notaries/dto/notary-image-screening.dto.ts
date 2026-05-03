import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class NotaryImageScreeningDto {
  /**
   * Optional base64 fallback when multipart upload is not available.
   * The preferred request type for WordPress is multipart/form-data with `file`.
   */
  @IsOptional()
  @IsString()
  imageBase64?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  mimeType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  queryOverride?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  clientReference?: string;

  /** WordPress user ID supplied by the plugin for audit attribution. */
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? undefined : String(value)))
  @IsString()
  @MaxLength(100)
  wpUserId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  wordpressSite?: string;
}
