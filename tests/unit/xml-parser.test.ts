import { describe, it, expect } from 'vitest';
import { parseXml } from '../../src/lib/xml-parser';

describe('parseXml', () => {
  describe('valid simple XML', () => {
    it('parses a simple XML document', () => {
      const result = parseXml('<root><item>test</item></root>');
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeDefined();
    });

    it('returns formatted output', () => {
      const result = parseXml('<root><item>test</item></root>');
      expect(result.valid).toBe(true);
      expect(result.formatted).toBeDefined();
      expect(typeof result.formatted).toBe('string');
    });

    it('stores the trimmed original input', () => {
      const result = parseXml('  <root/>  ');
      expect(result.original).toBe('<root/>');
    });
  });

  describe('XML with attributes', () => {
    it('parses XML with attributes and counts them', () => {
      const result = parseXml('<root attr="val"><item/></root>');
      expect(result.valid).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats!.attributeCount).toBeGreaterThanOrEqual(1);
    });

    it('parses XML with multiple attributes', () => {
      const result = parseXml('<root a="1" b="2"><child c="3"/></root>');
      expect(result.valid).toBe(true);
      expect(result.stats!.attributeCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('toJson output', () => {
    it('returns toJson as a valid JSON string', () => {
      const result = parseXml('<root><item>test</item></root>');
      expect(result.valid).toBe(true);
      expect(result.toJson).toBeDefined();
      expect(() => JSON.parse(result.toJson!)).not.toThrow();
    });

    it('toJson contains the parsed element data', () => {
      const result = parseXml('<root><item>hello</item></root>');
      const json = JSON.parse(result.toJson!);
      expect(json.root).toBeDefined();
      expect(json.root.item).toBe('hello');
    });
  });

  describe('stats computation', () => {
    it('counts elements correctly', () => {
      const result = parseXml('<root><a>1</a><b>2</b><c>3</c></root>');
      expect(result.valid).toBe(true);
      expect(result.stats).toBeDefined();
      // root + a + b + c = 4 elements
      expect(result.stats!.elementCount).toBeGreaterThanOrEqual(4);
    });

    it('sets size stat equal to the input length', () => {
      const input = '<root><item>test</item></root>';
      const result = parseXml(input);
      expect(result.valid).toBe(true);
      expect(result.stats!.size).toBe(input.length);
    });

    it('tracks depth for nested elements', () => {
      const result = parseXml('<a><b><c><d>deep</d></c></b></a>');
      expect(result.valid).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats!.depth).toBeGreaterThanOrEqual(3);
    });

    it('counts text nodes', () => {
      const result = parseXml('<root><a>text1</a><b>text2</b></root>');
      expect(result.valid).toBe(true);
      expect(result.stats!.textNodeCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('empty and invalid input', () => {
    it('returns invalid for empty string', () => {
      const result = parseXml('');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.toLowerCase()).toContain('empty');
    });

    it('returns invalid for whitespace-only input', () => {
      const result = parseXml('   \n\t  ');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.toLowerCase()).toContain('empty');
    });

    it('does not include parsed, formatted, toJson, or stats on failure', () => {
      const result = parseXml('');
      expect(result.parsed).toBeUndefined();
      expect(result.formatted).toBeUndefined();
      expect(result.toJson).toBeUndefined();
      expect(result.stats).toBeUndefined();
    });

    it('returns invalid for malformed XML', () => {
      const result = parseXml('<root><unclosed>');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for random non-XML text', () => {
      const result = parseXml('this is not xml');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns invalid for mismatched tags', () => {
      const result = parseXml('<root><a></b></root>');
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('XML with declaration', () => {
    it('parses XML with a standard declaration', () => {
      const result = parseXml('<?xml version="1.0"?><root/>');
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeDefined();
    });

    it('parses XML with declaration and encoding', () => {
      const result = parseXml('<?xml version="1.0" encoding="UTF-8"?><root><item>data</item></root>');
      expect(result.valid).toBe(true);
    });
  });

  describe('XML with CDATA', () => {
    it('parses XML containing a CDATA section', () => {
      const input = '<root><content><![CDATA[Some <special> content & more]]></content></root>';
      const result = parseXml(input);
      expect(result.valid).toBe(true);
      expect(result.parsed).toBeDefined();
    });

    it('preserves CDATA content in parsed output', () => {
      const input = '<root><data><![CDATA[hello world]]></data></root>';
      const result = parseXml(input);
      expect(result.valid).toBe(true);
      expect(result.toJson).toBeDefined();
      const json = JSON.parse(result.toJson!);
      // CDATA is stored under __cdata key per parser options
      expect(json.root.data.__cdata).toBe('hello world');
    });
  });

  describe('self-closing tags', () => {
    it('parses self-closing tags', () => {
      const result = parseXml('<root><empty/></root>');
      expect(result.valid).toBe(true);
    });

    it('parses self-closing tag with attributes', () => {
      const result = parseXml('<root><img src="test.png"/></root>');
      expect(result.valid).toBe(true);
      expect(result.stats!.attributeCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe('complex XML', () => {
    it('handles XML with mixed content types', () => {
      const input = `<?xml version="1.0" encoding="UTF-8"?>
<catalog>
  <book id="1" lang="en">
    <title>XML Guide</title>
    <author>John</author>
    <price currency="USD">29.99</price>
  </book>
  <book id="2" lang="fr">
    <title>Le Guide</title>
    <author>Marie</author>
    <price currency="EUR">24.99</price>
  </book>
</catalog>`;
      const result = parseXml(input);
      expect(result.valid).toBe(true);
      expect(result.stats).toBeDefined();
      expect(result.stats!.attributeCount).toBeGreaterThanOrEqual(4); // id, lang, id, lang, currency, currency
      expect(result.stats!.elementCount).toBeGreaterThanOrEqual(7); // catalog + 2*(book + title + author + price)
    });
  });
});
