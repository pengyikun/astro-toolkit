import { describe, expect, it } from 'vitest';
import { validateChatJid } from '../../lib/whatsapp';

describe('whatsapp input validation', () => {
  it('accepts ordinary chat JIDs', () => {
    expect(validateChatJid('15551234567@s.whatsapp.net')).toBe('15551234567@s.whatsapp.net');
    expect(validateChatJid('12345@g.us')).toBe('12345@g.us');
  });

  it('rejects empty or control-character JIDs', () => {
    expect(() => validateChatJid('')).toThrow('Invalid chat JID');
    expect(() => validateChatJid('abc\ndef')).toThrow('Invalid chat JID');
    expect(() => validateChatJid('   ')).toThrow('Invalid chat JID');
  });

  it('rejects JIDs exceeding max length', () => {
    expect(() => validateChatJid('x'.repeat(129))).toThrow('Invalid chat JID');
  });
});
