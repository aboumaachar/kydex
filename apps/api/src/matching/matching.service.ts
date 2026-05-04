import { Injectable } from '@nestjs/common';

const ARABIC_TO_LATIN_MAP: Record<string, string> = {
  ا: 'a',
  أ: 'a',
  إ: 'a',
  آ: 'a',
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
  ة: 'h',
  و: 'w',
  ي: 'y',
  ى: 'a',
  ء: 'a',
  ئ: 'y',
  ؤ: 'w',
};

const ARABIC_DIACRITICS_PATTERN = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g;
const TATWEEL_PATTERN = /ـ/g;
const COMBINING_MARKS_PATTERN = /[\u0300-\u036f]/g;

const ARABIC_NUMERAL_MAP: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

const LATIN_HONORIFICS = new Set([
  'dr',
  'doctor',
  'eng',
  'engineer',
  'haj',
  'hajj',
  'mr',
  'mrs',
  'ms',
  'sayyid',
  'sheikh',
  'sir',
]);

const ARABIC_HONORIFICS = new Set([
  'الاستاذ',
  'استاذ',
  'السيد',
  'سيد',
  'الشيخ',
  'شيخ',
  'الحاج',
  'حاج',
  'الدكتور',
  'دكتور',
  'المهندس',
  'مهندس',
]);

const CANONICAL_TOKEN_MAP: Record<string, string> = {
  'abd-allah': 'abdallah',
  abdallah: 'abdallah',
  abdullah: 'abdallah',
  'abdullahh': 'abdallah',
  'abdellah': 'abdallah',
  allah: 'allah',
  allh: 'allah',
  aly: 'ali',
  'alyh': 'ali',
  'ahmad': 'ahmad',
  'ahmed': 'ahmad',
  'ahmet': 'ahmad',
  'achmad': 'ahmad',
  'ahmadd': 'ahmad',
  'ahmd': 'ahmad',
  'hasan': 'hassan',
  'hassan': 'hassan',
  'hsn': 'hassan',
  'husein': 'hussein',
  'husayn': 'hussein',
  'hussain': 'hussein',
  'hussein': 'hussein',
  'hsyn': 'hussein',
  'khaled': 'khalid',
  'khalid': 'khalid',
  'khld': 'khalid',
  'mhmd': 'mohammad',
  'mohamad': 'mohammad',
  'mohamed': 'mohammad',
  'mohammad': 'mohammad',
  'mohammed': 'mohammad',
  'muhamad': 'mohammad',
  'muhammad': 'mohammad',
  'muhammed': 'mohammad',
  'yousef': 'yousef',
  'yousif': 'yousef',
  'yusuf': 'yousef',
  'يوسف': 'yousef',
  'ywsf': 'yousef',
};

const LATIN_CONNECTOR_TOKENS = new Set(['al', 'bin', 'bint', 'ibn']);

@Injectable()
export class MatchingService {
  normalizeName(input: unknown): string {
    return this.tokenizeComparableText(input).join(' ');
  }

  normalizeArabicName(input: string): string {
    const withWesternDigits = [...input].map((char) => ARABIC_NUMERAL_MAP[char] ?? char).join('');

    return withWesternDigits
      .trim()
      .replace(ARABIC_DIACRITICS_PATTERN, '')
      .replace(TATWEEL_PATTERN, '')
      .replace(/[أإآ]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/ؤ/g, 'و')
      .replace(/ئ/g, 'ي')
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .split(/\s+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !ARABIC_HONORIFICS.has(token))
      .map((token) => this.normalizeArabicToken(token))
      .join(' ')
      .trim();
  }

  transliterateArabicToLatin(input: string): string {
    return [...this.normalizeArabicName(input)]
      .map((char) => ARABIC_TO_LATIN_MAP[char] ?? char)
      .join('')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }

  toLatinSearchKey(input: unknown): string {
    return this.buildConsonantKey(this.normalizeName(input));
  }

  computeNameSimilarity(a: string, b: string): number {
    const normalizedA = this.normalizeName(a);
    const normalizedB = this.normalizeName(b);
    const shouldUseConsonantSimilarity = this.containsArabicScript(a) || this.containsArabicScript(b);
    const consonantA = this.buildConsonantKey(normalizedA);
    const consonantB = this.buildConsonantKey(normalizedB);

    if (!normalizedA || !normalizedB) {
      return 0;
    }

    if (normalizedA === normalizedB) {
      return 1;
    }

    return Math.max(
      this.jaccardTokenSimilarity(normalizedA, normalizedB),
      this.diceTokenSimilarity(normalizedA, normalizedB),
      this.bigramDiceSimilarity(normalizedA, normalizedB),
      shouldUseConsonantSimilarity
        ? Math.max(
            this.bigramDiceSimilarity(consonantA, consonantB),
            this.tokenAlignedSimilarity(consonantA, consonantB),
          )
        : 0,
      this.exactTokenContainmentSimilarity(normalizedA, normalizedB),
    );
  }

  getNormalizedTokens(value: string): string[] {
    return this.tokenize(value);
  }

  containsArabicScript(value: string): boolean {
    return /[\u0600-\u06FF]/.test(value);
  }

  countSharedTokens(a: string, b: string): number {
    const tokensA = this.tokenize(a);
    const tokensB = new Set(this.tokenize(b));
    return tokensA.filter((token) => tokensB.has(token)).length;
  }

  jaccardTokenSimilarity(a: string, b: string): number {
    const setA = new Set(this.tokenize(a));
    const setB = new Set(this.tokenize(b));

    if (setA.size === 0 || setB.size === 0) {
      return 0;
    }

    const intersection = [...setA].filter((token) => setB.has(token)).length;
    const union = new Set([...setA, ...setB]).size;
    return intersection / union;
  }

  private diceTokenSimilarity(a: string, b: string): number {
    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);

    if (tokensA.length === 0 || tokensB.length === 0) {
      return 0;
    }

    const setB = new Set(tokensB);
    const intersection = tokensA.filter((token) => setB.has(token)).length;
    return (2 * intersection) / (tokensA.length + tokensB.length);
  }

  private exactTokenContainmentSimilarity(a: string, b: string): number {
    const tokensA = this.tokenize(a);
    const tokensB = this.tokenize(b);

    if (tokensA.length === 0 || tokensB.length === 0) {
      return 0;
    }

    const setB = new Set(tokensB);
    const allTokensPresent = tokensA.every((token) => setB.has(token));
    if (allTokensPresent) {
      if (tokensA.length >= 2) {
        if (tokensB.length > 4) {
          return tokensA.length / tokensB.length;
        }

        return Math.min(0.92, 0.8 + (tokensA.length - 2) * 0.06);
      }

      const token = tokensA[0];
      if (token.length >= 6 || /^[a-z0-9]{2,5}$/i.test(token)) {
        return 0.8;
      }
    }

    return b.includes(a) ? (tokensA.length >= 2 ? 0.9 : 0.8) : 0;
  }

  private buildConsonantKey(value: string): string {
    return this.tokenize(value)
      .map((token) => token.replace(/[aeiou]/g, '').replace(/(.)\1+/g, '$1') || token)
      .join(' ')
      .trim();
  }

  private tokenAlignedSimilarity(a: string, b: string): number {
    const tokensA = a.split(' ').filter(Boolean);
    const tokensB = b.split(' ').filter(Boolean);

    if (tokensA.length === 0 || tokensB.length === 0) {
      return 0;
    }

    const total = tokensA.reduce((sum, tokenA) => {
      const bestForToken = tokensB.reduce(
        (best, tokenB) => Math.max(best, this.bigramDiceSimilarity(tokenA, tokenB)),
        0,
      );
      return sum + bestForToken;
    }, 0);

    return total / tokensA.length;
  }

  private bigramDiceSimilarity(a: string, b: string): number {
    const gramsA = this.buildBigrams(a);
    const gramsB = this.buildBigrams(b);

    if (gramsA.length === 0 || gramsB.length === 0) {
      return 0;
    }

    const counts = new Map<string, number>();
    for (const gram of gramsB) {
      counts.set(gram, (counts.get(gram) ?? 0) + 1);
    }

    let intersection = 0;
    for (const gram of gramsA) {
      const count = counts.get(gram) ?? 0;
      if (count > 0) {
        intersection += 1;
        counts.set(gram, count - 1);
      }
    }

    return (2 * intersection) / (gramsA.length + gramsB.length);
  }

  private buildBigrams(value: string): string[] {
    const compact = value.replaceAll(/\s+/g, ' ').trim();
    if (compact.length < 2) {
      return compact ? [compact] : [];
    }

    const bigrams: string[] = [];
    for (let index = 0; index < compact.length - 1; index += 1) {
      bigrams.push(compact.slice(index, index + 2));
    }

    return bigrams;
  }

  private tokenize(value: string): string[] {
    return this.tokenizeComparableText(value);
  }

  private tokenizeComparableText(value: unknown): string[] {
    if (typeof value !== 'string') {
      return [];
    }

    if (!value.trim()) {
      return [];
    }

    const latinComparable = this.toLatinComparableText(value);
    const canonicalTokens = latinComparable
      .split(' ')
      .map((token) => token.trim())
      .filter(Boolean)
      .filter((token) => !LATIN_HONORIFICS.has(token))
      .map((token) => this.canonicalizeToken(token))
      .filter(Boolean);

    const mergedTokens: string[] = [];
    canonicalTokens.forEach((token) => {
      if (token === 'allah' && mergedTokens[mergedTokens.length - 1] === 'abd') {
        mergedTokens[mergedTokens.length - 1] = 'abdallah';
        return;
      }

      mergedTokens.push(token);
    });

    return mergedTokens;
  }

  private toLatinComparableText(value: string): string {
    const normalizedArabic = this.containsArabicScript(value) ? this.normalizeArabicName(value) : value;

    return [...normalizedArabic
      .normalize('NFKD')
      .replace(COMBINING_MARKS_PATTERN, '')
      .toLowerCase()
      .replace(/[\u2019']/g, '')
      .replace(/[\u2010-\u2015-]/g, ' ')
      .replace(/[\p{P}\p{S}]/gu, ' ')
      .replaceAll(/\s+/g, ' ')
      .trim()]
      .map((char) => ARABIC_NUMERAL_MAP[char] ?? ARABIC_TO_LATIN_MAP[char] ?? char)
      .join('')
      .replaceAll(/\s+/g, ' ')
      .trim();
  }

  private normalizeArabicToken(token: string): string {
    if (token.startsWith('ال') && token.length > 4) {
      return token.slice(2);
    }

    return token;
  }

  private canonicalizeToken(token: string): string {
    if (!token) {
      return '';
    }

    if (LATIN_CONNECTOR_TOKENS.has(token)) {
      return token;
    }

    if (token === 'abd' || token === 'abdul' || token === 'abd-al') {
      return 'abd';
    }

    return CANONICAL_TOKEN_MAP[token] ?? token;
  }
}
