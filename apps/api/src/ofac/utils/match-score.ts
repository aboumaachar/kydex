import { compactName, normalizeName, tokenizeName } from './ofac-normalizer';

export type MatchRisk = 'clear' | 'weak_possible_match' | 'review_required' | 'strong_potential_match';

export interface MatchScoreResult {
  score: number;
  riskLevel: MatchRisk;
  matchReason: string;
}

function levenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));

  for (let index = 0; index <= a.length; index += 1) matrix[index][0] = index;
  for (let index = 0; index <= b.length; index += 1) matrix[0][index] = index;

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
    }
  }

  return matrix[a.length][b.length];
}

function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  const maxLength = Math.max(a.length, b.length);
  const distance = levenshtein(a, b);
  return Math.max(0, 1 - distance / maxLength);
}

function tokenOverlapScore(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;

  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter((token) => setB.has(token)).length;
  const union = new Set([...a, ...b]).size;

  return intersection / union;
}

export function riskFromScore(score: number): MatchRisk {
  if (score >= 90) return 'strong_potential_match';
  if (score >= 75) return 'review_required';
  if (score >= 60) return 'weak_possible_match';
  return 'clear';
}

export function calculateNameMatchScore(query: string, candidate: string): MatchScoreResult {
  const normalizedQuery = normalizeName(query);
  const normalizedCandidate = normalizeName(candidate);

  if (!normalizedQuery || !normalizedCandidate) {
    return { score: 0, riskLevel: 'clear', matchReason: 'empty_input' };
  }

  if (normalizedQuery === normalizedCandidate) {
    return { score: 100, riskLevel: 'strong_potential_match', matchReason: 'normalized_exact_match' };
  }

  if (compactName(normalizedQuery) === compactName(normalizedCandidate)) {
    return { score: 96, riskLevel: 'strong_potential_match', matchReason: 'compact_exact_match' };
  }

  const queryTokens = tokenizeName(normalizedQuery);
  const candidateTokens = tokenizeName(normalizedCandidate);

  const overlap = tokenOverlapScore(queryTokens, candidateTokens);
  const orderedSimilarity = similarity(normalizedQuery, normalizedCandidate);
  const compactSimilarity = similarity(compactName(normalizedQuery), compactName(normalizedCandidate));

  let score = Math.round(
    Math.max(
      orderedSimilarity * 100,
      compactSimilarity * 95,
      overlap * 92,
    ),
  );

  if (queryTokens.length >= 2 && overlap >= 0.8) {
    score = Math.max(score, 88);
  } else if (queryTokens.length >= 2 && overlap >= 0.6) {
    score = Math.max(score, 76);
  }

  let matchReason = 'name_fuzzy_similarity';
  if (overlap >= 0.8) {
    matchReason = 'token_overlap';
  } else if (compactSimilarity >= orderedSimilarity) {
    matchReason = 'compact_fuzzy_similarity';
  }

  return {
    score,
    riskLevel: riskFromScore(score),
    matchReason,
  };
}