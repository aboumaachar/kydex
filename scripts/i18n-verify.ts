import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function loadJson(filePath: string) {
  return JSON.parse(readFileSync(filePath, 'utf-8')) as Record<string, JsonValue>;
}

function flattenKeys(value: JsonValue, prefix = ''): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    return flattenKeys(nestedValue, nextPrefix);
  });
}

function diffKeys(source: string[], target: string[]) {
  const targetSet = new Set(target);
  return source.filter((key) => !targetSet.has(key)).sort((left, right) => left.localeCompare(right));
}

function main() {
  const root = process.cwd();
  const enPath = resolve(root, 'apps', 'web', 'src', 'i18n', 'en.json');
  const arPath = resolve(root, 'apps', 'web', 'src', 'i18n', 'ar.json');

  const englishKeys = flattenKeys(loadJson(enPath));
  const arabicKeys = flattenKeys(loadJson(arPath));
  const missingInArabic = diffKeys(englishKeys, arabicKeys);
  const missingInEnglish = diffKeys(arabicKeys, englishKeys);

  if (missingInArabic.length === 0 && missingInEnglish.length === 0) {
    console.log(`[i18n:verify] key parity verified across ${englishKeys.length} translation keys.`);
    return;
  }

  if (missingInArabic.length > 0) {
    console.error('[i18n:verify] Missing Arabic keys:');
    missingInArabic.forEach((key) => console.error(`- ${key}`));
  }

  if (missingInEnglish.length > 0) {
    console.error('[i18n:verify] Missing English keys:');
    missingInEnglish.forEach((key) => console.error(`- ${key}`));
  }

  process.exitCode = 1;
}

main();