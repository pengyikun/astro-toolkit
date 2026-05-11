import { describe, it, expect } from 'vitest';
import { cn } from '../../lib/utils';

describe('cn (tailwind class merger)', () => {
  it('joins multiple class strings', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('drops falsy values', () => {
    expect(cn('a', false && 'x', null, undefined, 'b')).toBe('a b');
  });

  it('flattens nested arrays', () => {
    expect(cn(['a', ['b', 'c']])).toBe('a b c');
  });

  it('uses tailwind-merge to dedupe conflicting tailwind classes (last wins)', () => {
    expect(cn('p-2 p-4')).toBe('p-4');
  });

  it('keeps non-conflicting tailwind classes', () => {
    expect(cn('p-2 m-2')).toBe('p-2 m-2');
  });

  it('supports object syntax via clsx', () => {
    expect(cn({ a: true, b: false, c: true })).toBe('a c');
  });

  it('returns empty string when given nothing', () => {
    expect(cn()).toBe('');
  });
});
