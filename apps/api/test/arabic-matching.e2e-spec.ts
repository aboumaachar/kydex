import { MatchingService } from '../src/matching/matching.service';

describe('MatchingService Arabic support', () => {
  const service = new MatchingService();

  it('normalizes Arabic diacritics and alef variants', () => {
    expect(service.normalizeArabicName('محمّد')).toBe('محمد');
    expect(service.normalizeArabicName('أحمد')).toBe('احمد');
    expect(service.normalizeArabicName('إحمد')).toBe('احمد');
  });

  it('builds a stable Latin search key for Arabic and Latin variants', () => {
    expect(service.toLatinSearchKey('محمد علي')).toBe(service.toLatinSearchKey('Mohammad Ali'));
    expect(service.toLatinSearchKey('عبد الله')).toBe(service.toLatinSearchKey('Abdullah'));
  });

  it('scores Arabic and Latin transliterations as strong matches', () => {
    expect(service.computeNameSimilarity('محمد علي', 'Mohammad Ali')).toBeGreaterThanOrEqual(0.85);
    expect(service.computeNameSimilarity('حسين', 'Husein')).toBeGreaterThanOrEqual(0.8);
    expect(service.computeNameSimilarity('عبدالله', 'Abdallah')).toBeGreaterThanOrEqual(0.8);
  });

  it('normalizes Arabic definite article and honorific noise', () => {
    expect(service.normalizeArabicName('السيد محمد العلي')).toBe('محمد علي');
  });
});