process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import * as AccountModel from '../../models/account.model';
import * as CredentialModel from '../../models/credential.model';
import * as PennyTestLogModel from '../../models/penny-test-log.model';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;

beforeAll(async () => {
  db = await setupTestDb();
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('Dashboard Data', () => {
  it('returns counts when data exists', async () => {
    await AccountModel.create(db, factory.account({ name: 'Dashboard Account' }));
    await CredentialModel.create(db, factory.credential({ label: 'Dashboard Cred' }));
    await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'DashPartner' }));

    const accountResult = await AccountModel.findAll(db, {});
    const credResult = await CredentialModel.findAll(db, {});
    const logResult = await PennyTestLogModel.findAll(db, {});

    expect(accountResult.total).toBe(1);
    expect(credResult.total).toBe(1);
    expect(logResult.total).toBe(1);
  });
});
