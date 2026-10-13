import { slugify } from './slugify.js';

describe('slugify', () => {
  it('removes Vietnamese diacritics and replaces đ', () => {
    expect(slugify('Tiệm Tóc Đẹp 24h')).toBe('tiem-toc-dep-24h');
  });

  it('collapses symbols and trims dashes', () => {
    expect(slugify('  --Salon & Spa!!  ')).toBe('salon-spa');
  });

  it('returns an empty string when nothing usable is left', () => {
    expect(slugify('!!!')).toBe('');
  });
});
