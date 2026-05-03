import { Injectable, PipeTransform } from '@nestjs/common';

@Injectable()
export class SanitizeInputPipe implements PipeTransform {
  transform(value: unknown) {
    return sanitizeValue(value);
  }
}

function sanitizeValue(value: unknown): unknown {
  if (Buffer.isBuffer(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeValue(entry));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, sanitizeValue(entry)]),
    );
  }

  if (typeof value === 'string') {
    return value.replace(/\u0000/g, '').trim();
  }

  return value;
}