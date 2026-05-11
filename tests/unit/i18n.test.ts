import { describe, it, expect } from 'vitest';
import { t, getDictionary, formatDate, formatNumber, formatCurrency } from '../../lib/i18n';

describe('lib/i18n t()', () => {
  it('returns the dictionary value when present', () => {
    const dict = { hello: 'Hi' };
    expect(t(dict, 'hello')).toBe('Hi');
  });

  it('falls back to the key when missing', () => {
    expect(t({}, 'missing.key')).toBe('missing.key');
  });

  it('interpolates {placeholder} values', () => {
    const dict = { greet: 'Hello {name}, you have {count} items' };
    expect(t(dict, 'greet', { name: 'Ada', count: 3 })).toBe('Hello Ada, you have 3 items');
  });

  it('leaves unknown placeholders as-is', () => {
    const dict = { greet: 'Hello {name} ({rank})' };
    expect(t(dict, 'greet', { name: 'Ada' })).toBe('Hello Ada ({rank})');
  });
});

describe('lib/i18n getDictionary()', () => {
  it('returns the requested dictionary for a known locale', () => {
    expect(getDictionary('en')).toBeTruthy();
  });

  it('falls back to default when locale is invalid', () => {
    // @ts-expect-error - testing fallback path
    expect(getDictionary('xx')).toBeTruthy();
  });
});

describe('lib/i18n formatters', () => {
  it('formatDate accepts Date and string input', () => {
    expect(typeof formatDate('en', new Date('2025-01-02'))).toBe('string');
    expect(typeof formatDate('en', '2025-01-02')).toBe('string');
  });

  it('formatNumber respects locale-specific separators', () => {
    expect(formatNumber('en', 1234.5).replace(/\u00a0/g, ' ')).toMatch(/1[,. ]?234/);
  });

  it('formatCurrency emits the requested currency', () => {
    const out = formatCurrency('en', 9.5, 'USD');
    expect(out).toMatch(/USD|\$/);
  });
});
