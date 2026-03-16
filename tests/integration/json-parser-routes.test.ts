import { describe, it, expect } from 'vitest';
import { parseJson } from '../../lib/json-parser';

describe('JSON Parser', () => {
  it('parses valid JSON input', () => {
    const result = parseJson('{"key": "value"}');
    expect(result.valid).toBe(true);
  });

  it('handles empty input', () => {
    const result = parseJson('');
    expect(result.valid).toBe(false);
  });

  it('repairs invalid JSON when possible', () => {
    const result = parseJson('not json');
    // jsonrepair can repair 'not json' into '"not json"'
    expect(result.valid).toBe(true);
    expect(result.repaired).toBe(true);
  });
});
