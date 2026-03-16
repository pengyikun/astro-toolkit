import { describe, it, expect } from 'vitest';
import { parseXml } from '../../lib/xml-parser';

describe('XML Parser', () => {
  it('parses valid XML input', () => {
    const result = parseXml('<root>test</root>');
    expect(result.valid).toBe(true);
  });

  it('handles empty input', () => {
    const result = parseXml('');
    expect(result.valid).toBe(false);
  });

  it('handles invalid XML', () => {
    const result = parseXml('not xml <><>');
    expect(result.valid).toBe(false);
  });
});
