import type { RegionSchema, RegionFieldDef, RegionSummary } from '../types';

export const REGION_SCHEMAS: Record<string, RegionSchema> = {
  BR: {
    name: 'Brazil',
    currency: 'BRL',
    fields: [
      { key: 'bank_code', label: 'Bank Code (COMPE)', type: 'text', required: true, placeholder: 'e.g. 001', validation: '^\\d{3}$' },
      { key: 'branch_code', label: 'Branch Code (Agência)', type: 'text', required: true, placeholder: 'e.g. 1234' },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'account_type_br', label: 'Account Type', type: 'select', required: true, options: ['Corrente', 'Poupança'] },
      { key: 'cpf_cnpj', label: 'CPF / CNPJ', type: 'text', required: true, placeholder: 'Individual (CPF) or Corporate (CNPJ)' },
      { key: 'pix_key', label: 'PIX Key', type: 'text', required: false, placeholder: 'CPF, CNPJ, email, phone, or EVP' },
      { key: 'pix_key_type', label: 'PIX Key Type', type: 'select', required: false, options: ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'] },
      { key: 'pix_qr_code', label: 'PIX QR Code Payload', type: 'textarea', required: false },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
    ],
  },
  US: {
    name: 'United States',
    currency: 'USD',
    fields: [
      { key: 'aba_routing_number', label: 'ABA Routing Number (ACH)', type: 'text', required: true, placeholder: '9 digits', validation: '^\\d{9}$' },
      { key: 'fedwire_routing_number', label: 'Fedwire Routing Number', type: 'text', required: false, placeholder: '9 digits (if different from ABA)', validation: '^\\d{9}$' },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'account_type_us', label: 'Account Type', type: 'select', required: true, options: ['Checking', 'Savings'] },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'beneficiary_address', label: 'Beneficiary Address', type: 'textarea', required: false },
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: false },
    ],
  },
  GB: {
    name: 'United Kingdom',
    currency: 'GBP',
    fields: [
      { key: 'sort_code', label: 'Sort Code', type: 'text', required: true, placeholder: 'e.g. 20-00-00', validation: '^\\d{2}-?\\d{2}-?\\d{2}$' },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true, placeholder: '8 digits', validation: '^\\d{8}$' },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: false },
    ],
  },
  MX: {
    name: 'Mexico',
    currency: 'MXN',
    fields: [
      { key: 'clabe', label: 'CLABE', type: 'text', required: true, placeholder: '18 digits', validation: '^\\d{18}$' },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: false },
      { key: 'rfc', label: 'RFC (Tax ID)', type: 'text', required: false },
    ],
  },
  NG: {
    name: 'Nigeria',
    currency: 'NGN',
    fields: [
      { key: 'bank_code', label: 'Bank Code', type: 'text', required: true },
      { key: 'account_number', label: 'Account Number (NUBAN)', type: 'text', required: true, placeholder: '10 digits', validation: '^\\d{10}$' },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: false },
    ],
  },
  SG: {
    name: 'Singapore',
    currency: 'SGD',
    fields: [
      { key: 'bank_code', label: 'Bank Code', type: 'text', required: true, placeholder: '4 digits' },
      { key: 'branch_code', label: 'Branch Code', type: 'text', required: true, placeholder: '3 digits' },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'paynow_proxy_type', label: 'PayNow Proxy Type', type: 'select', required: false, options: ['NRIC', 'UEN', 'MOBILE', 'VPA'] },
      { key: 'paynow_proxy_value', label: 'PayNow Proxy Value', type: 'text', required: false },
    ],
  },
  VN: {
    name: 'Vietnam',
    currency: 'VND',
    fields: [
      { key: 'bank_code', label: 'Bank Code (CITAD/BIN)', type: 'text', required: true },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: false },
    ],
  },
  SEPA: {
    name: 'SEPA Zone (EUR)',
    currency: 'EUR',
    fields: [
      { key: 'iban', label: 'IBAN', type: 'text', required: true },
      { key: 'bic', label: 'BIC/SWIFT', type: 'text', required: false },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'bank_name', label: 'Bank Name', type: 'text', required: false },
    ],
  },
  AU: {
    name: 'Australia',
    currency: 'AUD',
    fields: [
      { key: 'bsb_code', label: 'BSB Code', type: 'text', required: true, placeholder: '6 digits (e.g. 062-000)', validation: '^\\d{3}-?\\d{3}$' },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
    ],
  },
  NZ: {
    name: 'New Zealand',
    currency: 'NZD',
    fields: [
      { key: 'nz_account_number', label: 'NZ Bank Account Number', type: 'text', required: true, placeholder: 'BB-bbbb-AAAAAAA-SSS format' },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
    ],
  },
  IN: {
    name: 'India',
    currency: 'INR',
    fields: [
      { key: 'ifsc_code', label: 'IFSC Code', type: 'text', required: true, placeholder: 'e.g. SBIN0001234', validation: '^[A-Z]{4}0[A-Z0-9]{6}$' },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'upi_id', label: 'UPI ID', type: 'text', required: false, placeholder: 'e.g. name@upi' },
    ],
  },
  KE: {
    name: 'Kenya',
    currency: 'KES',
    fields: [
      { key: 'bank_code', label: 'Bank Code', type: 'text', required: true },
      { key: 'branch_code', label: 'Branch Code', type: 'text', required: true },
      { key: 'account_number', label: 'Account Number', type: 'text', required: true },
      { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
      { key: 'mpesa_number', label: 'M-Pesa Number', type: 'text', required: false },
    ],
  },
};

export function getRegion(code: string): RegionSchema | null {
  return REGION_SCHEMAS[code.toUpperCase()] ?? null;
}

export function getAllRegions(): RegionSummary[] {
  return Object.entries(REGION_SCHEMAS).map(([code, schema]) => ({
    code,
    name: schema.name,
    currency: schema.currency,
  }));
}

export function getRegionFields(code: string): RegionFieldDef[] | null {
  const schema = getRegion(code);
  return schema ? schema.fields : null;
}
