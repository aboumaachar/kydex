const LEGAL_SUFFIXES = [
  's a',
  'sa',
  's a l',
  'sal',
  'sarl',
  'llc',
  'l l c',
  'ltd',
  'limited',
  'inc',
  'corp',
  'corporation',
  'co',
  'company',
  'plc',
  'holding',
  'holdings',
];

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

const ARABIC_CHAR_MAP: Record<string, string> = {
  أ: 'ا',
  إ: 'ا',
  آ: 'ا',
  ٱ: 'ا',
  ى: 'ي',
  ئ: 'ي',
  ؤ: 'و',
  ة: 'ه',
};

const ARABIC_TO_LATIN_APPROX: Record<string, string> = {
  ا: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'j',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'dh',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'q',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  و: 'w',
  ي: 'y',
  ء: '',
  لا: 'la',
};

export function normalizeArabic(input: string): string {
  return input
    .replace(ARABIC_DIACRITICS, '')
    .split('')
    .map((char) => ARABIC_CHAR_MAP[char] ?? char)
    .join('');
}

export function arabicToLatinApprox(input: string): string {
  const normalized = normalizeArabic(input);
  return normalized
    .split('')
    .map((char) => ARABIC_TO_LATIN_APPROX[char] ?? char)
    .join('');
}

export function normalizeName(input: string | null | undefined): string {
  if (!input) return '';

  const arabicNormalized = normalizeArabic(input);
  const arabicApprox = arabicToLatinApprox(arabicNormalized);

  const base = `${arabicNormalized} ${arabicApprox}`
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9\u0600-\u06FF]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const tokens = base
    .split(' ')
    .filter(Boolean)
    .filter((token) => !LEGAL_SUFFIXES.includes(token));

  return Array.from(new Set(tokens)).join(' ');
}

export function tokenizeName(input: string | null | undefined): string[] {
  return normalizeName(input).split(' ').filter(Boolean);
}

export function compactName(input: string | null | undefined): string {
  return normalizeName(input).replace(/\s+/g, '');
}
