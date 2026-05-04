/**
 * KYDEX Name Normalization Service
 *
 * Handles:
 * - Latin normalization (diacritics, case, punctuation)
 * - Arabic normalization (diacritics, alef forms, ta marbouta)
 * - Arabic → Latin transliteration (ALA-LC simplified)
 * - Latin → Arabic reverse transliteration
 * - Tokenization
 * - Query variant generation for bilingual screening
 * - Single-name and partial-name support
 */
import { Injectable } from '@nestjs/common';

// ─── Latin normalization ─────────────────────────────────────────────────────

export function normalizeLatin(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeLatin(input: string): string[] {
  return normalizeLatin(input)
    .split(' ')
    .filter((t) => t.length >= 2);
}

// ─── Arabic normalization ────────────────────────────────────────────────────

// Alef variants → plain alef
// Ta marbouta → ha
// Remove diacritics (harakat)
export function normalizeArabic(input: string): string {
  return input
    .replace(/[\u0640]/g, '')              // tatweel
    .replace(/[\u064B-\u065F]/g, '')       // harakat / diacritics
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')  // alef variants → ا
    .replace(/\u0629/g, '\u0647')          // ة → ه
    .replace(/\u0649/g, '\u064A')          // ى → ي
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeArabic(input: string): string[] {
  return normalizeArabic(input)
    .split(' ')
    .filter((t) => t.length >= 2);
}

// ─── Transliteration tables ──────────────────────────────────────────────────

const ARABIC_TO_LATIN: [RegExp, string][] = [
  [/\u0645\u062D\u0645\u062F/g, 'mohammad'],
  [/\u0645\u062D\u0645\u062F/g, 'mohammed'],
  [/\u062D\u0633\u0646/g, 'hassan'],
  [/\u062D\u0633\u064A\u0646/g, 'hussein'],
  [/\u0639\u0644\u064A/g, 'ali'],
  [/\u0639\u0644\u064A/g, 'aly'],
  [/\u0646\u0635\u0631 \u0627\u0644\u0644\u0647/g, 'nasrallah'],
  [/\u0646\u0635\u0631\u0627\u0644\u0644\u0647/g, 'nasrallah'],
  // Character-level fallbacks
  [/\u0627/g, 'a'],   [/\u0628/g, 'b'],   [/\u062A/g, 't'],  [/\u062B/g, 'th'],
  [/\u062C/g, 'j'],   [/\u062D/g, 'h'],   [/\u062E/g, 'kh'], [/\u062F/g, 'd'],
  [/\u0630/g, 'dh'],  [/\u0631/g, 'r'],   [/\u0632/g, 'z'],  [/\u0633/g, 's'],
  [/\u0634/g, 'sh'],  [/\u0635/g, 's'],   [/\u0636/g, 'd'],  [/\u0637/g, 't'],
  [/\u0638/g, 'z'],   [/\u0639/g, 'a'],   [/\u063A/g, 'gh'], [/\u0641/g, 'f'],
  [/\u0642/g, 'q'],   [/\u0643/g, 'k'],   [/\u0644/g, 'l'],  [/\u0645/g, 'm'],
  [/\u0646/g, 'n'],   [/\u0647/g, 'h'],   [/\u0648/g, 'w'],  [/\u064A/g, 'y'],
  [/\u0621/g, ''],    [/\u0624/g, 'w'],   [/\u0626/g, 'y'],
];

const LATIN_TO_ARABIC_PAIRS: [RegExp, string][] = [
  [/\bmohammad\b/gi, '\u0645\u062D\u0645\u062F'],
  [/\bmohammed\b/gi, '\u0645\u062D\u0645\u062F'],
  [/\bmohamed\b/gi, '\u0645\u062D\u0645\u062F'],
  [/\bhassan\b/gi, '\u062D\u0633\u0646'],
  [/\bhussein\b/gi, '\u062D\u0633\u064A\u0646'],
  [/\bhusain\b/gi, '\u062D\u0633\u064A\u0646'],
  [/\bali\b/gi, '\u0639\u0644\u064A'],
  [/\bnasrallah\b/gi, '\u0646\u0635\u0631\u0627\u0644\u0644\u0647'],
  [/\bnasralla\b/gi, '\u0646\u0635\u0631\u0627\u0644\u0644\u0647'],
  [/\bomar\b/gi, '\u0639\u0645\u0631'],
  [/\bahmed\b/gi, '\u0623\u062D\u0645\u062F'],
  [/\bahmad\b/gi, '\u0623\u062D\u0645\u062F'],
  [/\bkareem\b/gi, '\u0643\u0631\u064A\u0645'],
  [/\bkarim\b/gi, '\u0643\u0631\u064A\u0645'],
  [/\bnassif\b/gi, '\u0646\u0635\u064A\u0641'],
  [/\bnasif\b/gi, '\u0646\u0635\u064A\u0641'],
  [/\bkallab\b/gi, '\u0643\u0644\u0627\u0628'],
  [/\bsandra\b/gi, '\u0633\u0627\u0646\u062F\u0631\u0627'],
];

export function arabicToLatin(input: string): string {
  let result = normalizeArabic(input);
  for (const [pattern, replacement] of ARABIC_TO_LATIN) {
    result = result.replace(pattern, replacement);
  }
  return normalizeLatin(result);
}

export function latinToArabic(input: string): string {
  let result = input;
  for (const [pattern, replacement] of LATIN_TO_ARABIC_PAIRS) {
    result = result.replace(pattern, replacement);
  }
  return normalizeArabic(result);
}

// ─── Script detection ────────────────────────────────────────────────────────

export function containsArabic(input: string): boolean {
  return /[\u0600-\u06FF]/.test(input);
}

export function containsLatin(input: string): boolean {
  return /[a-zA-Z]/.test(input);
}

// ─── Common Arabic name variants ────────────────────────────────────────────

const MOHAMMAD_VARIANTS = ['mohammad', 'mohammed', 'mohamed', 'muhammad', 'mehmet'];
const HASSAN_VARIANTS   = ['hassan', 'hasan', 'hassane'];
const HUSSEIN_VARIANTS  = ['hussein', 'husain', 'husein', 'hossein'];
const ALI_VARIANTS      = ['ali', 'aly', 'aley'];
const AHMAD_VARIANTS    = ['ahmad', 'ahmed', 'ahmet', 'achmad'];

function expandName(token: string): string[] {
  const t = token.toLowerCase();
  if (MOHAMMAD_VARIANTS.includes(t)) return MOHAMMAD_VARIANTS;
  if (HASSAN_VARIANTS.includes(t))   return HASSAN_VARIANTS;
  if (HUSSEIN_VARIANTS.includes(t))  return HUSSEIN_VARIANTS;
  if (ALI_VARIANTS.includes(t))      return ALI_VARIANTS;
  if (AHMAD_VARIANTS.includes(t))    return AHMAD_VARIANTS;
  return [token];
}

// ─── Query variant generator ─────────────────────────────────────────────────

export function generateQueryVariants(input: string): string[] {
  const variants = new Set<string>();
  const trimmed = input.trim();

  // Always include original
  variants.add(trimmed);

  if (containsArabic(trimmed)) {
    const normalized = normalizeArabic(trimmed);
    variants.add(normalized);
    const transliterated = arabicToLatin(trimmed);
    variants.add(transliterated);
    // Token-level expansion
    const tokens = tokenizeArabic(trimmed);
    if (tokens.length > 0) {
      const expandedTokens = tokens.map((t) => expandName(arabicToLatin(t)));
      for (const combination of cartesian(expandedTokens)) {
        variants.add(combination.join(' '));
      }
    }
  } else if (containsLatin(trimmed)) {
    const normalized = normalizeLatin(trimmed);
    variants.add(normalized);
    const arabic = latinToArabic(trimmed);
    if (arabic !== trimmed) variants.add(arabic);
    // Token-level expansion
    const tokens = tokenizeLatin(trimmed);
    const expandedTokens = tokens.map((t) => expandName(t));
    for (const combination of cartesian(expandedTokens)) {
      variants.add(combination.join(' '));
    }
  }

  return Array.from(variants).filter(Boolean);
}

function cartesian(arrays: string[][]): string[][] {
  if (arrays.length === 0) return [[]];
  // Cap combinations to prevent explosion
  const MAX = 32;
  let result: string[][] = [[]];
  for (const arr of arrays) {
    const next: string[][] = [];
    for (const existing of result) {
      for (const item of arr) {
        next.push([...existing, item]);
        if (next.length >= MAX) break;
      }
      if (next.length >= MAX) break;
    }
    result = next;
  }
  return result;
}

// ─── Injectable service ──────────────────────────────────────────────────────

@Injectable()
export class NameNormalizationService {
  normalizeLatin(input: string): string {
    return normalizeLatin(input);
  }

  normalizeArabic(input: string): string {
    return normalizeArabic(input);
  }

  arabicToLatin(input: string): string {
    return arabicToLatin(input);
  }

  latinToArabic(input: string): string {
    return latinToArabic(input);
  }

  generateVariants(input: string): string[] {
    return generateQueryVariants(input);
  }

  tokenize(input: string): string[] {
    if (containsArabic(input)) return tokenizeArabic(input);
    return tokenizeLatin(input);
  }

  analyze(input: string) {
    const isArabic = containsArabic(input);
    const variants = generateQueryVariants(input);
    const tokens = isArabic ? tokenizeArabic(input) : tokenizeLatin(input);
    return {
      original: input,
      isArabic,
      isLatin: containsLatin(input),
      normalizedLatin: isArabic ? arabicToLatin(input) : normalizeLatin(input),
      normalizedArabic: isArabic ? normalizeArabic(input) : latinToArabic(input),
      tokens,
      variants,
    };
  }
}
