process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Knex } from 'knex';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as factory from '../helpers/factory';
import * as AccountModel from '../../models/account.model';
import * as CredentialModel from '../../models/credential.model';
import * as PennyTestLogModel from '../../models/penny-test-log.model';
import * as SnippetModel from '../../models/snippet.model';
import * as NoteModel from '../../models/visualizer-note.model';
import { buildExportData } from '../../lib/export-import';
import type { AccessScope, AuthUser } from '../../types';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});

afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

async function createUser(email: string, role: AuthUser['role']): Promise<AuthUser> {
  const now = new Date().toISOString();
  const [id] = await db('auth_users').insert({
    email,
    role,
    password_hash: 'hash',
    password_salt: 'salt',
    created_at: now,
    updated_at: now,
  });

  return {
    id: Number(id),
    email,
    role,
    password_hash: 'hash',
    password_salt: 'salt',
    created_at: now,
    updated_at: now,
  };
}

function scopeFor(user: AuthUser): AccessScope {
  return {
    userId: user.id,
    role: user.role,
  };
}

describe('Access Control Integration', () => {
  it('restricts operators to their own records and allows admins to see all records', async () => {
    const admin = await createUser('admin@example.com', 'admin');
    const operatorA = await createUser('operator-a@example.com', 'operator');
    const operatorB = await createUser('operator-b@example.com', 'operator');

    const accountA = await AccountModel.create(db, {
      ...factory.account({ name: 'A Account' }),
      owner_user_id: operatorA.id,
    });
    await AccountModel.create(db, {
      ...factory.account({ name: 'B Account' }),
      owner_user_id: operatorB.id,
    });

    await CredentialModel.create(db, {
      ...factory.credential({ label: 'A Credential' }),
      owner_user_id: operatorA.id,
    });
    const credentialB = await CredentialModel.create(db, {
      ...factory.credential({ label: 'B Credential' }),
      owner_user_id: operatorB.id,
    });

    await PennyTestLogModel.create(db, {
      ...factory.pennyLog({ reference_id: 'A-REF', account_id: accountA.id }),
      owner_user_id: operatorA.id,
    });
    await PennyTestLogModel.create(db, {
      ...factory.pennyLog({ reference_id: 'B-REF' }),
      owner_user_id: operatorB.id,
    });

    const snippetA = await SnippetModel.create(db, {
      title: 'A Snippet',
      snippet_type: 'json',
      content: '{"a":1}',
      parse_result: '{"a":1}',
      owner_user_id: operatorA.id,
    });
    const snippetB = await SnippetModel.create(db, {
      title: 'B Snippet',
      snippet_type: 'json',
      content: '{"b":1}',
      parse_result: '{"b":1}',
      owner_user_id: operatorB.id,
    });

    await NoteModel.create(db, {
      snippet_id: snippetA.id,
      node_id: 1,
      row_index: -1,
      node_path: '$',
      node_title: 'Root',
      field_key: '',
      content: 'A note',
      owner_user_id: operatorA.id,
    });
    await NoteModel.create(db, {
      snippet_id: snippetB.id,
      node_id: 1,
      row_index: -1,
      node_path: '$',
      node_title: 'Root',
      field_key: '',
      content: 'B note',
      owner_user_id: operatorB.id,
    });

    const operatorScope = scopeFor(operatorA);
    const adminScope = scopeFor(admin);

    const operatorAccounts = await AccountModel.findAll(db, {}, operatorScope);
    const operatorCredentials = await CredentialModel.findAll(db, {}, operatorScope);
    const operatorLogs = await PennyTestLogModel.findAll(db, {}, operatorScope);
    const operatorSnippets = await SnippetModel.findAll(db, {}, operatorScope);
    const operatorNotes = await NoteModel.findBySnippetId(db, snippetA.id, operatorScope);

    expect(operatorAccounts.data.map((record) => record.name)).toEqual(['A Account']);
    expect(operatorCredentials.data.map((record) => record.label)).toEqual(['A Credential']);
    expect(operatorLogs.data.map((record) => record.reference_id)).toEqual(['A-REF']);
    expect(operatorSnippets.data.map((record) => record.title)).toEqual(['A Snippet']);
    expect(operatorNotes.map((record) => record.content)).toEqual(['A note']);

    await expect(CredentialModel.findById(db, credentialB.id, operatorScope)).resolves.toBeNull();
    await expect(
      CredentialModel.revealItem(db, credentialB.items[0]?.id ?? 0, credentialB.id, operatorScope),
    ).resolves.toBeNull();

    const adminAccounts = await AccountModel.findAll(db, {}, adminScope);
    const adminCredentials = await CredentialModel.findAll(db, {}, adminScope);
    const adminLogs = await PennyTestLogModel.findAll(db, {}, adminScope);
    const adminSnippets = await SnippetModel.findAll(db, {}, adminScope);

    expect(adminAccounts.data).toHaveLength(2);
    expect(adminCredentials.data).toHaveLength(2);
    expect(adminLogs.data).toHaveLength(2);
    expect(adminSnippets.data).toHaveLength(2);
  });

  it('blocks operators from mutating another operator record and scopes exports', async () => {
    const operatorA = await createUser('operator-a@example.com', 'operator');
    const operatorB = await createUser('operator-b@example.com', 'operator');

    const ownAccount = await AccountModel.create(db, {
      ...factory.account({ name: 'Own Account' }),
      owner_user_id: operatorA.id,
    });
    const otherAccount = await AccountModel.create(db, {
      ...factory.account({ name: 'Other Account' }),
      owner_user_id: operatorB.id,
    });

    await CredentialModel.create(db, {
      ...factory.credential({ label: 'Own Credential' }),
      owner_user_id: operatorA.id,
    });
    await CredentialModel.create(db, {
      ...factory.credential({ label: 'Other Credential' }),
      owner_user_id: operatorB.id,
    });

    const operatorScope = scopeFor(operatorA);

    await expect(AccountModel.remove(db, otherAccount.id, operatorScope)).resolves.toBe(0);
    await expect(AccountModel.remove(db, ownAccount.id, operatorScope)).resolves.toBe(1);

    const exportData = await buildExportData(
      db,
      ['accounts', 'credentials'],
      Buffer.from('a'.repeat(64), 'hex'),
      operatorScope,
    );

    expect(exportData.accounts?.map((record) => record.name)).toEqual(['Own Account']);
    expect(exportData.credentials?.map((record) => record.label)).toEqual(['Own Credential']);
  });
});
