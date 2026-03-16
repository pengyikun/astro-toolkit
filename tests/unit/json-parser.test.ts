import { describe, it, expect } from 'vitest';
import { parseJson } from '../../lib/json-parser';

describe('parseJson', () => {
  describe('valid JSON', () => {
    it('parses a valid JSON object', () => {
      const result = parseJson('{"key": "value"}');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toEqual({ key: 'value' });
    });

    it('parses a valid JSON array', () => {
      const result = parseJson('[1,2,3]');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toEqual([1, 2, 3]);
    });

    it('returns formatted output matching JSON.stringify with indentation', () => {
      const input = '{"a":1,"b":2}';
      const result = parseJson(input);
      expect(result.formatted).toBe(JSON.stringify({ a: 1, b: 2 }, null, 2));
    });

    it('returns minified output matching JSON.stringify', () => {
      const input = '{ "a" : 1 , "b" : 2 }';
      const result = parseJson(input);
      expect(result.minified).toBe(JSON.stringify({ a: 1, b: 2 }));
    });

    it('stores the trimmed original input', () => {
      const result = parseJson('  {"key": "value"}  ');
      expect(result.original).toBe('{"key": "value"}');
    });
  });

  describe('primitives', () => {
    it('parses a string primitive', () => {
      const result = parseJson('"hello"');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toBe('hello');
    });

    it('parses a number primitive', () => {
      const result = parseJson('42');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toBe(42);
    });

    it('parses a boolean primitive', () => {
      const result = parseJson('true');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toBe(true);
    });

    it('parses null', () => {
      const result = parseJson('null');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toBeNull();
    });
  });

  describe('stats computation', () => {
    it('computes stats correctly for a nested object', () => {
      const input = JSON.stringify({
        name: 'test',
        count: 5,
        active: true,
        tags: ['a', 'b'],
        meta: { nested: null },
      });
      const result = parseJson(input);
      expect(result.valid).toBe(true);
      expect(result.stats).toBeDefined();
      const stats = result.stats!;
      // Top-level keys: name, count, active, tags, meta = 5
      // meta has 1 key (nested) → total keys = 6
      expect(stats.keys).toBe(6);
      expect(stats.objectCount).toBe(2); // root + meta
      expect(stats.arrayCount).toBe(1); // tags
      expect(stats.stringCount).toBe(3); // 'test', 'a', 'b'
      expect(stats.numberCount).toBe(1); // 5
      expect(stats.booleanCount).toBe(1); // true
      expect(stats.nullCount).toBe(1); // null
    });

    it('computes depth correctly for deeply nested structures', () => {
      const input = JSON.stringify({ a: { b: { c: { d: 'deep' } } } });
      const result = parseJson(input);
      expect(result.stats).toBeDefined();
      // depth 0 = root object, depth 1 = a's value, depth 2 = b's value, depth 3 = c's value, depth 4 = "deep" string
      expect(result.stats!.depth).toBe(4);
    });

    it('sets size to the length of minified output', () => {
      const input = '{"key": "value"}';
      const result = parseJson(input);
      expect(result.stats).toBeDefined();
      expect(result.stats!.size).toBe(result.minified!.length);
    });

    it('computes accurate stats for object with 3 keys, array of 2 items, and null', () => {
      const input = JSON.stringify({
        first: 'one',
        second: [10, 20],
        third: null,
      });
      const result = parseJson(input);
      expect(result.valid).toBe(true);
      const stats = result.stats!;
      expect(stats.keys).toBe(3);
      expect(stats.objectCount).toBe(1);
      expect(stats.arrayCount).toBe(1);
      expect(stats.stringCount).toBe(1); // 'one'
      expect(stats.numberCount).toBe(2); // 10, 20
      expect(stats.nullCount).toBe(1);
      expect(stats.booleanCount).toBe(0);
    });
  });

  describe('empty and whitespace input', () => {
    it('returns invalid for empty string', () => {
      const result = parseJson('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.toLowerCase()).toContain('empty');
    });

    it('returns invalid for whitespace-only input', () => {
      const result = parseJson('   \n\t  ');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.toLowerCase()).toContain('empty');
    });

    it('does not include parsed, formatted, minified, or stats on failure', () => {
      const result = parseJson('');
      expect(result.parsed).toBeUndefined();
      expect(result.formatted).toBeUndefined();
      expect(result.minified).toBeUndefined();
      expect(result.stats).toBeUndefined();
    });
  });

  describe('repaired JSON', () => {
    it('repairs JSON with unquoted keys', () => {
      const result = parseJson('{key: "value"}');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.parsed).toEqual({ key: 'value' });
    });

    it('repairs JSON with single-quoted strings', () => {
      const result = parseJson("{'key': 'value'}");
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.parsed).toEqual({ key: 'value' });
    });

    it('repairs JSON with trailing comma', () => {
      const result = parseJson('{"a": 1, "b": 2,}');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(true);
      expect(result.parsed).toEqual({ a: 1, b: 2 });
    });

    it('provides stats for repaired JSON', () => {
      const result = parseJson('{key: "value"}');
      expect(result.stats).toBeDefined();
      expect(result.stats!.keys).toBe(1);
      expect(result.stats!.objectCount).toBe(1);
    });
  });

  describe('invalid, unrepairable JSON', () => {
    it('returns invalid for completely broken input', () => {
      const result = parseJson('{{{{');
      expect(result.valid).toBe(false);
      expect(result.repaired).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for mismatched brackets', () => {
      const result = parseJson('}{}{}{');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('large and complex JSON', () => {
    it('handles a large valid JSON with nested arrays and objects', () => {
      const large = {
        users: Array.from({ length: 100 }, (_, i) => ({
          id: i,
          name: `user_${i}`,
          active: i % 2 === 0,
          tags: [`tag_${i}`],
          meta: { score: i * 10 },
        })),
      };
      const result = parseJson(JSON.stringify(large));
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.stats).toBeDefined();
      expect(result.stats!.objectCount).toBe(1 + 100 + 100); // root + 100 user objects + 100 meta objects
      expect(result.stats!.arrayCount).toBe(1 + 100); // users array + 100 tags arrays
    });
  });

  describe('unicode content', () => {
    it('parses JSON with unicode characters', () => {
      const result = parseJson('{"emoji": "🎉", "chinese": "你好", "arabic": "مرحبا"}');
      expect(result.valid).toBe(true);
      expect(result.repaired).toBe(false);
      expect(result.parsed).toEqual({ emoji: '🎉', chinese: '你好', arabic: 'مرحبا' });
    });

    it('preserves unicode in formatted output', () => {
      const result = parseJson('{"text": "café"}');
      expect(result.formatted).toContain('café');
    });
  });
});
