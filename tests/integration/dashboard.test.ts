process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import * as AccountModel from '../../src/models/account.model';
import * as CredentialModel from '../../src/models/credential.model';
import * as PennyTestLogModel from '../../src/models/penny-test-log.model';
import * as factory from '../helpers/factory';
import type { Knex } from 'knex';

let db: Knex;
let request: supertest.Agent;

beforeAll(async () => {
  db = await setupTestDb();
  const app = createApp(db);
  request = supertest.agent(app);
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('Dashboard', () => {
  it('GET / returns 200', async () => {
    const res = await request.get('/');
    expect(res.status).toBe(200);
  });

  it('GET / returns 200 after creating data', async () => {
    await AccountModel.create(db, factory.account({ name: 'Dashboard Account' }));
    await CredentialModel.create(db, factory.credential({ label: 'Dashboard Cred' }));
    await PennyTestLogModel.create(db, factory.pennyLog({ partner_name: 'DashPartner' }));

    const res = await request.get('/');
    expect(res.status).toBe(200);
  });
});
