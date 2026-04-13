export type UserRole = 'admin' | 'operator';

export interface AccessScope {
  userId: number;
  role: UserRole;
}

// ── Database Types ──────────────────────────────────────────────────────────

export interface Account {
  id: number;
  owner_user_id: number | null;
  name: string;
  region_code: string;
  currency: string;
  account_type: 'mock' | 'real';
  status: 'active' | 'archived';
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface AccountField {
  id?: number;
  account_id?: number;
  field_key: string;
  field_label: string;
  field_value: string;
  field_type: 'text' | 'select' | 'textarea';
  is_custom: number;
  sort_order: number;
}

export interface AccountWithFields extends Account {
  fields: AccountField[];
}

export interface Credential {
  id: number;
  owner_user_id: number | null;
  partner_name: string;
  environment: 'sandbox' | 'staging' | 'uat';
  label: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface CredentialItem {
  id?: number;
  credential_id?: number;
  item_key: string;
  item_value: string;
  item_type: 'text' | 'file';
  file_name: string | null;
  file_path: string | null;
  created_at?: string;
}

export interface CredentialWithItems extends Credential {
  items: CredentialItem[];
  item_count?: number;
}

export interface PennyTestLog {
  id: number;
  owner_user_id: number | null;
  account_id: number | null;
  partner_name: string;
  direction: 'inbound' | 'outbound';
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'timeout' | 'returned';
  reference_id: string;
  error_code: string;
  error_message: string;
  request_payload: string;
  response_payload: string;
  notes: string;
  tested_at: string;
  created_at: string;
  updated_at: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  password_hash: string;
  password_salt: string;
  created_at: string;
  updated_at: string;
}

// ── Pagination ──────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: string | number;
  perPage?: string | number;
}

// ── Filter Types ────────────────────────────────────────────────────────────

export interface AccountFilters extends PaginationParams {
  region_code?: string;
  status?: string;
  account_type?: string;
  search?: string;
}

export interface CredentialFilters extends PaginationParams {
  partner_name?: string;
  environment?: string;
  search?: string;
}

export interface PennyLogFilters extends PaginationParams {
  status?: string;
  partner_name?: string;
  direction?: string;
  currency?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// ── Encryption ──────────────────────────────────────────────────────────────

export interface EncryptedPayload {
  ct: string;
  iv: string;
  tag: string;
}

// ── IBAN/BIC ────────────────────────────────────────────────────────────────

export interface IBANValidationResult {
  valid: boolean;
  error?: string;
}

export interface IBANParseResult extends IBANValidationResult {
  iban?: string;
  country_code?: string;
  country_name?: string;
  check_digits?: string;
  bban?: string;
  bank_identifier?: string | null;
  branch_identifier?: string | null;
  account_number?: string | null;
  iban_formatted?: string;
}

export interface BICValidationResult {
  valid: boolean;
  error?: string;
}

export interface BICParseResult extends BICValidationResult {
  bic?: string;
  institution_code?: string;
  country_code?: string;
  country_name?: string;
  location_code?: string;
  branch_code?: string | null;
  is_primary_office?: boolean;
  is_test_bic?: boolean;
  is_passive_participant?: boolean;
  is_reverse_billing?: boolean;
}

// ── Region Schema ───────────────────────────────────────────────────────────

export interface RegionFieldDef {
  key: string;
  label: string;
  type: 'text' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  validation?: string;
  options?: string[];
}

export interface RegionSchema {
  name: string;
  currency: string;
  fields: RegionFieldDef[];
}

export interface RegionSummary {
  code: string;
  name: string;
  currency: string;
}

// ── Export/Import ────────────────────────────────────────────────────────────

export interface ExportMeta {
  app: string;
  version: string;
  exported_at: string;
  modules: string[];
}

export interface ExportData {
  meta: ExportMeta;
  accounts?: AccountWithFields[];
  credentials?: CredentialWithItems[];
  penny_test_logs?: PennyTestLog[];
}

export interface ImportSummary {
  accounts: number;
  credentials: number;
  penny_test_logs: number;
}

// ── Saved Snippets ─────────────────────────────────────────────────────────

export interface SavedSnippet {
  id: number;
  owner_user_id: number | null;
  title: string;
  snippet_type: 'json' | 'xml';
  content: string;
  parse_result: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface SavedSnippetFilters extends PaginationParams {
  snippet_type?: string;
  search?: string;
}

export interface VisualizerNote {
  id: number;
  owner_user_id: number | null;
  snippet_id: number;
  node_id: number;
  row_index: number;
  node_path: string;
  node_title: string;
  field_key: string;
  content: string;
  created_at: string;
}

// ── Mail ────────────────────────────────────────────────────────────────────

export interface MailSetting {
  id: number;
  owner_user_id: number | null;
  imap_host: string;
  imap_port: number;
  imap_encryption: 'tls' | 'start-tls' | 'none';
  imap_login: string;
  imap_password: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface MailFolder {
  name: string;
  desc: string;
}

export interface MailEnvelope {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: string;
  folder: string;
  hasAttachment: boolean;
  flags: string[];
}

export interface MailEnvelopeList {
  envelopes: MailEnvelope[];
  page: number;
  pageSize: number;
}

export interface MailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  cc: string;
  date: string;
  body: string;
  folder: string;
  hasAttachment: boolean;
}

export interface MailAttachment {
  filename: string;
  size: number;
  downloadPath: string;
}

export interface MailFetchParams {
  folders: string[];
  dateFrom: string;
  dateTo: string;
  page?: number;
  pageSize?: number;
  query?: string;
}

// ── WhatsApp ───────────────────────────────────────────────────────────────

export interface WhatsAppSetting {
  id: number;
  owner_user_id: number | null;
  db_path: string;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppChat {
  jid: string;
  name: string;
  lastMessageTime: string;
  lastMessage: string;
  lastSender: string;
  lastIsFromMe: boolean;
  isGroup: boolean;
}

export interface WhatsAppChatList {
  chats: WhatsAppChat[];
  page: number;
  pageSize: number;
}

export interface WhatsAppMessage {
  id: string;
  chatJid: string;
  chatName: string;
  sender: string;
  senderName: string;
  content: string;
  timestamp: string;
  isFromMe: boolean;
  mediaType: string;
}

// ── Intelligence ───────────────────────────────────────────────────────────

export interface IdentityProfile {
  id: number;
  owner_user_id: number | null;
  display_name: string;
  email: string;
  phone: string;
  company: string;
  colleague: string;
  created_at: string;
  updated_at: string;
}

export type IdentityAliasField = 'email' | 'phone' | 'name' | 'company' | 'colleague';

export interface IdentityAlias {
  id: number;
  profile_id: number;
  field: IdentityAliasField;
  alias_value: string;
  created_at: string;
}

export interface LlmSetting {
  id: number;
  owner_user_id: number | null;
  base_url: string;
  model_name: string;
  max_tokens: number;
  context_window: number;
  created_at: string;
  updated_at: string;
}

export type BriefStatus = 'pending' | 'running' | 'completed' | 'failed';
export type BriefConnector = 'email' | 'whatsapp';

export interface Brief {
  id: number;
  owner_user_id: number | null;
  connectors: string; // JSON string of BriefConnector[]
  date_from: string;
  date_to: string;
  status: BriefStatus;
  thinking: string;
  summary: string;
  pending_items: string;
  error: string;
  created_at: string;
  updated_at: string;
}

// ── Validation ─────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}
