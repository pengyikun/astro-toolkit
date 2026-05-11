import type { AccessScope } from '@/types';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import * as PennyTestLogModel from '@/models/penny-test-log.model';
import * as CredentialModel from '@/models/credential.model';
import * as TodoModel from '@/models/todo.model';
import * as BriefModel from '@/models/brief.model';

// ── Tool definitions (OpenAI function calling format) ─────────────────────

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export const CHAT_TOOLS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_accounts',
      description: 'List bank/settlement accounts. Returns account name, region, currency, status, and type.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['active', 'archived'], description: 'Filter by status' },
          region: { type: 'string', description: 'Filter by region code' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_account',
      description: 'Get detailed information about a specific account by ID.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Account ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_transactions',
      description: 'List recent transactions (penny test logs). Returns partner, amount, currency, direction, status, and reference.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['success', 'failed', 'pending', 'timeout', 'returned'], description: 'Filter by status' },
          direction: { type: 'string', enum: ['inbound', 'outbound'], description: 'Filter by direction' },
          limit: { type: 'number', description: 'Max results (default 10)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_transaction',
      description: 'Get detailed information about a specific transaction by ID, including error details and payloads.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Transaction ID' },
        },
        required: ['id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_todos',
      description: 'List open and in-progress todo/action items.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_latest_brief',
      description: 'Get the most recent completed intelligence brief summary.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_credentials',
      description: 'List credential vault entries (partner name, environment, label). Does NOT reveal secrets.',
      parameters: {
        type: 'object',
        properties: {
          partner_name: { type: 'string', description: 'Filter by partner name' },
        },
        required: [],
      },
    },
  },
];

// ── Anthropic tool format conversion ──────────────────────────────────────

export interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export function toAnthropicTools(): AnthropicToolDefinition[] {
  return CHAT_TOOLS.map((t) => ({
    name: t.function.name,
    description: t.function.description,
    input_schema: t.function.parameters,
  }));
}

// ── Tool execution ────────────────────────────────────────────────────────

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  scope: AccessScope | null,
): Promise<unknown> {
  switch (name) {
    case 'list_accounts': {
      const filters: Record<string, unknown> = { perPage: 20 };
      if (args.status) filters.status = args.status;
      if (args.region) filters.region_code = args.region;
      const result = await AccountModel.findAll(db, filters, scope);
      return result.data.map((a) => ({
        id: a.id,
        name: a.name,
        region: a.region_code,
        currency: a.currency,
        status: a.status,
        account_type: a.account_type,
      }));
    }

    case 'get_account': {
      const account = await AccountModel.findById(db, Number(args.id), scope);
      if (!account) return { error: 'Account not found' };
      const { created_at: _ca, updated_at: _ua, owner_user_id: _ou, ...safe } = account;
      return safe;
    }

    case 'list_transactions': {
      const limit = Math.min(Number(args.limit) || 10, 20);
      const filters: Record<string, unknown> = { page: '1' };
      if (args.status) filters.status = args.status;
      if (args.direction) filters.direction = args.direction;
      const result = await PennyTestLogModel.findAll(db, filters, scope);
      return result.data.slice(0, limit).map((t) => ({
        id: t.id,
        partner_name: t.partner_name,
        amount: t.amount,
        currency: t.currency,
        direction: t.direction,
        status: t.status,
        reference_id: t.reference_id,
        tested_at: t.tested_at,
      }));
    }

    case 'get_transaction': {
      const log = await PennyTestLogModel.findById(db, Number(args.id), scope);
      if (!log) return { error: 'Transaction not found' };
      const { owner_user_id: _ou, ...safe } = log;
      return safe;
    }

    case 'list_todos': {
      const todos = await TodoModel.listByOwner(db, scope, 50);
      return todos.filter((t) => t.status !== 'done').map((t) => ({
        id: t.id,
        title: t.title,
        urgency: t.urgency,
        status: t.status,
        source: t.source,
      }));
    }

    case 'get_latest_brief': {
      const brief = await BriefModel.findLatestCompleted(db, scope);
      if (!brief) return { message: 'No completed briefs found' };
      return {
        id: brief.id,
        date_from: brief.date_from,
        date_to: brief.date_to,
        summary: brief.summary,
        pending_items: brief.pending_items,
      };
    }

    case 'list_credentials': {
      const filters: Record<string, unknown> = { perPage: 20 };
      if (args.partner_name) filters.partner_name = args.partner_name;
      const result = await CredentialModel.findAll(db, filters, scope);
      return result.data.map((c) => ({
        id: c.id,
        partner_name: c.partner_name,
        environment: c.environment,
        label: c.label,
      }));
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}
