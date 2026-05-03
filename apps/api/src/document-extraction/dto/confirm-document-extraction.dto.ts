import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

export class ConfirmDocumentExtractionDto {
  @IsString()
  fullName!: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  nationality?: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsString()
  issuingCountry?: string;

  @IsOptional()
  @IsString()
  expiryDate?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsString()
  transactionType?: string;

  @IsOptional()
  @IsString()
  clientReference?: string;

  @IsOptional()
  @IsBoolean()
  redactAfterExtract?: boolean;
}
