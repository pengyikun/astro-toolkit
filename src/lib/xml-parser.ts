import { XMLParser, XMLBuilder, XMLValidator } from 'fast-xml-parser';

export interface XmlParseResult {
  valid: boolean;
  original: string;
  parsed?: unknown;
  formatted?: string;
  toJson?: string;
  error?: string;
  stats?: {
    elementCount: number;
    attributeCount: number;
    textNodeCount: number;
    depth: number;
    size: number;
  };
}

const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseTagValue: true,
  parseAttributeValue: true,
  trimValues: true,
  cdataPropName: '__cdata',
  commentPropName: '__comment',
};

const builderOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  indentBy: '  ',
  suppressEmptyNode: false,
  cdataPropName: '__cdata',
  commentPropName: '__comment',
};

interface XmlStats {
  elementCount: number;
  attributeCount: number;
  textNodeCount: number;
  depth: number;
  size: number;
}

function countStats(obj: unknown, depth = 0): XmlStats {
  const stats: XmlStats = {
    elementCount: 0,
    attributeCount: 0,
    textNodeCount: 0,
    depth,
    size: 0,
  };

  if (obj === null || obj === undefined) return stats;

  if (typeof obj !== 'object') {
    stats.textNodeCount = 1;
    return stats;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const child = countStats(item, depth);
      stats.elementCount += child.elementCount;
      stats.attributeCount += child.attributeCount;
      stats.textNodeCount += child.textNodeCount;
      stats.depth = Math.max(stats.depth, child.depth);
    }
    return stats;
  }

  const entries = Object.entries(obj as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (key.startsWith('@_')) {
      stats.attributeCount++;
    } else if (key === '#text' || key === '__cdata' || key === '__comment') {
      stats.textNodeCount++;
    } else {
      stats.elementCount++;
      const child = countStats(value, depth + 1);
      stats.elementCount += child.elementCount;
      stats.attributeCount += child.attributeCount;
      stats.textNodeCount += child.textNodeCount;
      stats.depth = Math.max(stats.depth, child.depth);
    }
  }

  return stats;
}

function tryRepairXml(input: string): string {
  let xml = input.trim();

  // Add XML declaration if missing
  if (!xml.startsWith('<?xml')) {
    // Only add if it looks like XML content
    if (xml.startsWith('<')) {
      // Don't add declaration, just proceed
    }
  }

  // Fix common issues: unclosed tags, missing quotes on attributes
  // Basic self-closing tag fix
  xml = xml.replace(/<(\w+)([^>]*[^/])>(\s*)<\/\1>/g, (match, tag, attrs, space) => {
    if (!space.trim()) return `<${tag}${attrs} />`;
    return match;
  });

  return xml;
}

export function parseXml(input: string): XmlParseResult {
  if (!input || !input.trim()) {
    return { valid: false, original: input, error: 'Input is empty' };
  }

  const trimmed = input.trim();

  // Validate first
  const validation = XMLValidator.validate(trimmed, {
    allowBooleanAttributes: true,
  });

  let xmlToParse = trimmed;
  let wasRepaired = false;

  if (validation !== true) {
    // Try basic repair
    xmlToParse = tryRepairXml(trimmed);
    const revalidation = XMLValidator.validate(xmlToParse, {
      allowBooleanAttributes: true,
    });
    if (revalidation !== true) {
      const errMsg = typeof validation === 'object' && validation.err
        ? `${validation.err.msg} (line ${validation.err.line}, col ${validation.err.col})`
        : 'Invalid XML';
      return { valid: false, original: trimmed, error: errMsg };
    }
    wasRepaired = true;
  }

  try {
    const parser = new XMLParser(parserOptions);
    const parsed = parser.parse(xmlToParse);

    const builder = new XMLBuilder(builderOptions);
    const formatted = builder.build(parsed);

    const jsonOutput = JSON.stringify(parsed, null, 2);

    const stats: XmlStats = countStats(parsed);
    stats.size = trimmed.length;

    return {
      valid: true,
      original: trimmed,
      parsed,
      formatted: wasRepaired ? formatted : formatXmlString(xmlToParse),
      toJson: jsonOutput,
      stats,
    };
  } catch (err) {
    return {
      valid: false,
      original: trimmed,
      error: err instanceof Error ? err.message : 'Failed to parse XML',
    };
  }
}

function formatXmlString(xml: string): string {
  // Use the builder to reformat
  try {
    const parser = new XMLParser(parserOptions);
    const parsed = parser.parse(xml);
    const builder = new XMLBuilder(builderOptions);
    return builder.build(parsed);
  } catch {
    return xml;
  }
}
