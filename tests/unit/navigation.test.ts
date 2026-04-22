import { describe, expect, it } from 'vitest';
import { isNavPathActive } from '../../lib/navigation';

describe('isNavPathActive', () => {
  it('keeps exact-match routes scoped to their own page', () => {
    expect(isNavPathActive('/settings', '/settings', 'exact')).toBe(true);
    expect(isNavPathActive('/settings', '/settings/profile', 'exact')).toBe(false);
  });

  it('matches descendant detail pages only on path-segment boundaries', () => {
    expect(isNavPathActive('/accounts', '/accounts', 'segment')).toBe(true);
    expect(isNavPathActive('/accounts', '/accounts/42', 'segment')).toBe(true);
    expect(isNavPathActive('/accounts', '/accounts-archive', 'segment')).toBe(false);
  });
});
