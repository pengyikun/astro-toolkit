import { describe, it, expect } from 'vitest';
import {
  STATUS_COLORS,
  STATUS_DOT_COLORS,
  STATUS_MARKER_CLASS,
} from '../../lib/style-utils';

describe('style-utils status maps', () => {
  const expectedKeys = ['success', 'pending', 'failed', 'timeout', 'returned'];

  it('STATUS_COLORS exposes one class string per known status', () => {
    for (const k of expectedKeys) {
      expect(typeof STATUS_COLORS[k]).toBe('string');
      expect(STATUS_COLORS[k].length).toBeGreaterThan(0);
    }
  });

  it('STATUS_DOT_COLORS covers the same statuses', () => {
    for (const k of expectedKeys) {
      expect(typeof STATUS_DOT_COLORS[k]).toBe('string');
    }
  });

  it('STATUS_MARKER_CLASS covers the same statuses', () => {
    for (const k of expectedKeys) {
      expect(typeof STATUS_MARKER_CLASS[k]).toBe('string');
    }
  });

  it('every entry includes a tailwind background or text color hook', () => {
    for (const v of Object.values(STATUS_COLORS)) {
      expect(/(?:bg-|text-)/.test(v)).toBe(true);
    }
  });

  it('returns undefined for unknown statuses (caller must handle)', () => {
    expect(STATUS_COLORS['unknown']).toBeUndefined();
  });
});
