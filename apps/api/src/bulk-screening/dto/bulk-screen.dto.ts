import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { z } from 'zod';

const bulkRecordSchema = z.object({
  fullName: z.string().min(2),
  dateOfBirth: z.string().min(2).optional(),
  nationality: z.string().min(2).optional(),
  documentNumber: z.string().min(2).optional(),
  transactionType: z.string().min(2).optional(),
  clientReference: z.string().min(1).optional(),
});

export const bulkScreenSchema = z.object({
  records: z.array(bulkRecordSchema).min(1),
  sources: z.array(z.string().min(1)).min(1),
});

class BulkRecordDto {
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
  transactionType?: string;

  @IsOptional()
  @IsString()
  clientReference?: string;
}

export class BulkScreenDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkRecordDto)
  records!: BulkRecordDto[];

  @IsArray()
  @IsString({ each: true })
  sources!: string[];
}

export type BulkJobData = {
  tenantId: string;
  userId?: string;
  records: BulkRecordDto[];
  sources: string[];
};
