import { describe, it, expect } from 'vitest';
import { accountSchema } from '../../schemas/account.schema';
import { credentialSchema } from '../../schemas/credential.schema';
import { pennyLogSchema } from '../../schemas/penny-log.schema';

describe('Account Schema', () => {
  it('accepts valid input', () => {
    const result = accountSchema.safeParse({
      name: 'Test Account',
      region_code: 'US',
      currency: 'USD',
      account_type: 'mock',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = accountSchema.safeParse({
      name: '',
      region_code: 'US',
      currency: 'USD',
      account_type: 'mock',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid currency length', () => {
    const result = accountSchema.safeParse({
      name: 'Test',
      region_code: 'US',
      currency: 'USDD',
      account_type: 'mock',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid account_type', () => {
    const result = accountSchema.safeParse({
      name: 'Test',
      region_code: 'US',
      currency: 'USD',
      account_type: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('defaults status to active', () => {
    const result = accountSchema.safeParse({
      name: 'Test',
      region_code: 'US',
      currency: 'USD',
      account_type: 'mock',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
    }
  });
});

describe('Credential Schema', () => {
  it('accepts valid input', () => {
    const result = credentialSchema.safeParse({
      partner_name: 'Partner Alpha',
      environment: 'sandbox',
      label: 'Test Keys',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing partner_name', () => {
    const result = credentialSchema.safeParse({
      partner_name: '',
      environment: 'sandbox',
      label: 'Test',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid environment', () => {
    const result = credentialSchema.safeParse({
      partner_name: 'Partner',
      environment: 'production',
      label: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('Penny Log Schema', () => {
  it('accepts valid input', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'outbound',
      amount: '0.01',
      currency: 'USD',
      status: 'pending',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'outbound',
      amount: '0',
      currency: 'USD',
      status: 'pending',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'outbound',
      amount: '-5',
      currency: 'USD',
      status: 'pending',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid direction', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'lateral',
      amount: '1',
      currency: 'USD',
      status: 'pending',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'outbound',
      amount: '1',
      currency: 'USD',
      status: 'processing',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(false);
  });

  it('coerces amount from string to number', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'outbound',
      amount: '1.50',
      currency: 'USD',
      status: 'pending',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.amount).toBe(1.5);
    }
  });

  it('defaults optional fields', () => {
    const result = pennyLogSchema.safeParse({
      partner_name: 'TestPartner',
      direction: 'outbound',
      amount: '1',
      currency: 'USD',
      status: 'pending',
      tested_at: '2025-03-11T12:00:00Z',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBe('');
      expect(result.data.error_code).toBe('');
      expect(result.data.account_id).toBeNull();
    }
  });
});
