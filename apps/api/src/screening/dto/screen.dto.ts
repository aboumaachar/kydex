import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { z } from 'zod';

function toTrimmedString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveQueryAlias(input: {
  query?: string;
  fullName?: string;
  subject?: string;
  name?: string;
}) {
  return [input.query, input.fullName, input.subject, input.name]
    .map((value) => toTrimmedString(value))
    .find((value) => value.length > 0) ?? '';
}

const boolInputSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  return value;
}, z.boolean());

export const screenSchema = z.object({
  query: z.string().min(2).optional(),
  fullName: z.string().min(2).optional(),
  subject: z.string().min(2).optional(),
  name: z.string().min(2).optional(),
  dateOfBirth: z.string().min(2).optional(),
  nationality: z.string().min(2).optional(),
  documentNumber: z.string().min(2).optional(),
  transactionType: z.string().min(2).optional(),
  screeningType: z.string().min(2).optional(),
  source: z.string().min(2).optional(),
  liveVerify: boolInputSchema.optional(),
  sources: z.array(z.string().min(1)).optional(),
  clientReference: z.string().min(1).optional(),
}).superRefine((value, context) => {
  if (resolveQueryAlias(value).length > 0) {
    return;
  }

  context.addIssue({
    code: z.ZodIssueCode.custom,
    path: ['query'],
    message: 'A screening query is required.',
  });
}).transform((value) => {
  const resolvedQuery = resolveQueryAlias(value);
  return {
    ...value,
    query: resolvedQuery,
    fullName: resolvedQuery,
    screeningType: value.screeningType ?? 'ofac',
    source: value.source ?? 'dashboard',
    liveVerify: value.liveVerify ?? false,
  };
});

export class ScreenDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  query?: string;

  @IsString()
  @MinLength(2)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  subject?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

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
  screeningType?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  liveVerify?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  sources?: string[];

  @IsOptional()
  @IsString()
  clientReference?: string;
}
