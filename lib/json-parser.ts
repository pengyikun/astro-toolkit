import { jsonrepair } from 'jsonrepair';

export interface JsonParseResult {
  valid: boolean;
  repaired: boolean;
  original: string;
  parsed?: unknown;
  formatted?: string;
  minified?: string;
  error?: string;
  stats?: {
    keys: number;
    depth: number;
    arrayCount: number;
    objectCount: number;
    stringCount: number;
    numberCount: number;
    booleanCount: number;
    nullCount: number;
    size: number;
  };
}

interface JsonStats {
  keys: number;
  depth: number;
  arrayCount: number;
  objectCount: number;
  stringCount: number;
  numberCount: number;
  booleanCount: number;
  nullCount: number;
  size: number;
}

function analyzeJson(obj: unknown, depth = 0): JsonStats {
  const stats: JsonStats = {
    keys: 0,
    depth,
    arrayCount: 0,
    objectCount: 0,
    stringCount: 0,
    numberCount: 0,
    booleanCount: 0,
    nullCount: 0,
    size: 0,
  };

  if (obj === null) {
    stats.nullCount = 1;
    return stats;
  }

  if (Array.isArray(obj)) {
    stats.arrayCount = 1;
    for (const item of obj) {
      const child = analyzeJson(item, depth + 1);
      stats.keys += child.keys;
      stats.depth = Math.max(stats.depth, child.depth);
      stats.arrayCount += child.arrayCount;
      stats.objectCount += child.objectCount;
      stats.stringCount += child.stringCount;
      stats.numberCount += child.numberCount;
      stats.booleanCount += child.booleanCount;
      stats.nullCount += child.nullCount;
    }
    return stats;
  }

  if (typeof obj === 'object') {
    stats.objectCount = 1;
    const entries = Object.entries(obj as Record<string, unknown>);
    stats.keys = entries.length;
    for (const [, value] of entries) {
      const child = analyzeJson(value, depth + 1);
      stats.keys += child.keys;
      stats.depth = Math.max(stats.depth, child.depth);
      stats.arrayCount += child.arrayCount;
      stats.objectCount += child.objectCount;
      stats.stringCount += child.stringCount;
      stats.numberCount += child.numberCount;
      stats.booleanCount += child.booleanCount;
      stats.nullCount += child.nullCount;
    }
    return stats;
  }

  if (typeof obj === 'string') stats.stringCount = 1;
  else if (typeof obj === 'number') stats.numberCount = 1;
  else if (typeof obj === 'boolean') stats.booleanCount = 1;

  return stats;
}

export function parseJson(input: string): JsonParseResult {
  if (!input || !input.trim()) {
    return { valid: false, repaired: false, original: input, error: 'Input is empty' };
  }

  const trimmed = input.trim();

  // First try direct parsing
  try {
    const parsed = JSON.parse(trimmed);
    const formatted = JSON.stringify(parsed, null, 2);
    const minified = JSON.stringify(parsed);
    const stats: JsonStats = analyzeJson(parsed);
    stats.size = minified.length;

    return {
      valid: true,
      repaired: false,
      original: trimmed,
      parsed,
      formatted,
      minified,
      stats,
    };
  } catch {
    // Try repair
  }

  // Attempt repair
  try {
    const repaired = jsonrepair(trimmed);
    const parsed = JSON.parse(repaired);
    const formatted = JSON.stringify(parsed, null, 2);
    const minified = JSON.stringify(parsed);
    const stats: JsonStats = analyzeJson(parsed);
    stats.size = minified.length;

    return {
      valid: true,
      repaired: true,
      original: trimmed,
      parsed,
      formatted,
      minified,
      stats,
    };
  } catch (err) {
    return {
      valid: false,
      repaired: false,
      original: trimmed,
      error: err instanceof Error ? err.message : 'Failed to parse or repair JSON',
    };
  }
}
