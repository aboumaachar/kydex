import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ZodSchema } from 'zod';

const ACCEPTED_QUERY_FIELDS = ['query', 'fullName', 'subject', 'name'] as const;

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (result.success) {
      return result.data;
    }

    const flattened = result.error.flatten();
    const hasQueryFieldError = ACCEPTED_QUERY_FIELDS.some((field) => {
      const fieldErrors = flattened.fieldErrors[field];
      return Array.isArray(fieldErrors) && fieldErrors.length > 0;
    });

    if (hasQueryFieldError) {
      throw new BadRequestException({
        status: 'validation_failed',
        message: 'مصدر الفحص غير صالح أو عبارة البحث مفقودة.',
        acceptedFields: [...ACCEPTED_QUERY_FIELDS],
        acceptedSources: ['ALL', 'OFAC', 'LEBANON_NATIONAL_LIST'],
        errors: flattened,
      });
    }

    throw new BadRequestException({
      status: 'validation_failed',
      message: 'مصدر الفحص غير صالح أو عبارة البحث مفقودة.',
      acceptedFields: [...ACCEPTED_QUERY_FIELDS],
      acceptedSources: ['ALL', 'OFAC', 'LEBANON_NATIONAL_LIST'],
      errors: flattened,
    });
  }
}