import type { AccountField } from '../../src/types';

export function account(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Test Account',
    region_code: 'US',
    currency: 'USD',
    account_type: 'mock',
    status: 'active',
    notes: '',
    fields: [
      { field_key: 'aba_routing_number', field_label: 'ABA Routing Number', field_value: '021000021', field_type: 'text' as const, is_custom: 0, sort_order: 0 },
      { field_key: 'account_number', field_label: 'Account Number', field_value: '123456789', field_type: 'text' as const, is_custom: 0, sort_order: 1 },
      { field_key: 'beneficiary_name', field_label: 'Beneficiary Name', field_value: 'John Doe', field_type: 'text' as const, is_custom: 0, sort_order: 2 },
    ] as Omit<AccountField, 'id' | 'account_id'>[],
    ...overrides,
  };
}

export function credential(overrides: Record<string, unknown> = {}) {
  return {
    partner_name: 'TestPartner',
    environment: 'sandbox',
    label: 'Test Credential Set',
    notes: '',
    items: [
      { item_key: 'api_key', item_value: 'test-api-key-12345', item_type: 'text' as const, file_name: null, file_path: null },
    ],
    ...overrides,
  };
}

export function pennyLog(overrides: Record<string, unknown> = {}) {
  return {
    account_id: null,
    partner_name: 'TestPartner',
    direction: 'outbound' as const,
    amount: 0.01,
    currency: 'USD',
    status: 'pending' as const,
    reference_id: 'TXN-TEST-001',
    error_code: '',
    error_message: '',
    request_payload: '{"test": true}',
    response_payload: '',
    notes: 'Test penny log entry',
    tested_at: new Date().toISOString(),
    ...overrides,
  };
}
