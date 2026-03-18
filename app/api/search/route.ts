import { NextResponse } from 'next/server';
import db from '@/lib/db';
import * as AccountModel from '@/models/account.model';
import * as CredentialModel from '@/models/credential.model';
import * as PennyTestLogModel from '@/models/penny-test-log.model';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').replace(/\s+/g, ' ').trim().slice(0, 120);

    if (query.length < 2) {
      return NextResponse.json({ query, results: { accounts: [], credentials: [], transactions: [] }, total: 0 });
    }

    const [accounts, credentials, transactions] = await Promise.all([
      AccountModel.searchQuick(db, query, 4),
      CredentialModel.searchQuick(db, query, 4),
      PennyTestLogModel.searchQuick(db, query, 4),
    ]);

    const results = {
      accounts: accounts.map((a) => ({
        id: a.id, type: 'account', title: a.name,
        meta: `${a.region_code} · ${a.currency} · ${a.account_type}`,
        url: `/accounts/${a.id}`,
      })),
      credentials: credentials.map((c) => ({
        id: c.id, type: 'credential', title: c.label,
        meta: `${c.partner_name} · ${c.environment}`,
        url: `/vault/${c.id}`,
      })),
      transactions: transactions.map((t) => ({
        id: t.id, type: 'transaction', title: t.reference_id || `${t.partner_name} run`,
        meta: `${t.partner_name} · ${t.amount} ${t.currency} · ${t.status}`,
        url: `/penny-log/${t.id}`,
      })),
    };

    return NextResponse.json({
      query, results,
      total: results.accounts.length + results.credentials.length + results.transactions.length,
    });
  } catch {
    return NextResponse.json(
      { error: { message: 'Search failed', status: 500 } },
      { status: 500 },
    );
  }
}
