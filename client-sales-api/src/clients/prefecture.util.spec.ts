import { extractPrefecture } from './prefecture.util.js';

describe('extractPrefecture', () => {
  it('matches when the address starts with a full prefecture name', () => {
    expect(extractPrefecture('福岡県福岡市中央区天神2丁目8-35')).toBe('福岡県');
  });

  it('strips a leading postal code before matching', () => {
    expect(extractPrefecture('〒810-0001 福岡県福岡市中央区天神2丁目8-35')).toBe('福岡県');
  });

  it('falls back to the geocoded title when the raw address omits the prefecture', () => {
    expect(extractPrefecture('鹿児島市中央町18番地1', '鹿児島県鹿児島市中央町')).toBe('鹿児島県');
  });

  it('falls back to a major-city lookup when neither the address nor the geocoded title has the prefecture', () => {
    expect(extractPrefecture('鹿児島市中央町18番地1', null)).toBe('鹿児島県');
  });

  it('returns null when nothing matches', () => {
    expect(extractPrefecture('中央区1-1-1', null)).toBeNull();
  });
});
