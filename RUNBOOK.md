# FinTech PM Toolkit — Runbook

Operational guide for setup, deployment, maintenance, troubleshooting, and recovery.

---

## Table of Contents

1. [Initial Setup](#1-initial-setup)
2. [Development Workflow](#2-development-workflow)
3. [Database Operations](#3-database-operations)
4. [Deployment](#4-deployment)
5. [Backup & Recovery](#5-backup--recovery)
6. [Export / Import](#6-export--import)
7. [Vault & Encryption](#7-vault--encryption)
8. [Troubleshooting](#8-troubleshooting)
9. [Adding a New Region](#9-adding-a-new-region)
10. [Testing Procedures](#10-testing-procedures)
11. [Architecture Reference](#11-architecture-reference)

---

## 1. Initial Setup

### Prerequisites

- **Node.js** ≥ 20 LTS ([download](https://nodejs.org/))
- **npm** ≥ 10

### Step-by-Step

```bash
# Clone the repository
git clone <repo-url> fintech-pm-toolkit
cd fintech-pm-toolkit

# Install dependencies
npm install

# Create environment config
cp .env.example .env

# Generate vault encryption key (REQUIRED)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output into .env as VAULT_ENCRYPTION_KEY=<generated-key>

# Run database migrations
npm run migrate

# Start the development server
npm run dev
```

### Verifying the Setup

1. Open **http://localhost:3000** — you should see the Dashboard.
2. Navigate to **IBAN Checker** → enter `GB29NWBK60161331926819` → should show valid with parsed fields.
3. Navigate to **Accounts** → **Create Account** → select a region → dynamic fields should appear.

---

## 2. Development Workflow

### Daily Development

```bash
# Start dev server with hot reload
npm run dev

# In another terminal, run tests in watch mode
npm run test:watch
```

### Before Committing

```bash
# Type-check
npm run typecheck

# Run all tests
npm test

# Run with coverage (target ≥ 82%)
npm run test:coverage
```

### Code Conventions

- **TypeScript strict mode** — all source in `src/`, all tests in `tests/`
- **Pure lib functions** — `src/lib/` has zero Express dependencies; independently testable
- **Thin route handlers** — validate → call model/lib → render/redirect
- **Zod schemas** — define shape in `src/schemas/`, enforce in middleware
- **No dead code** — delete, don't comment out
- **No `console.log`** — use `console.error` for actual errors only

### Adding a New Feature

1. Write failing test(s) first in `tests/unit/` or `tests/integration/`.
2. Implement the minimum code to pass.
3. Refactor while keeping tests green.
4. Run `npm run typecheck && npm test` before committing.

---

## 3. Database Operations

### Database Location

The SQLite database file location is configured via `DB_PATH` in `.env` (default: `./db/toolkit.db`).

### Running Migrations

```bash
# Apply pending migrations
npm run migrate

# Migrations are also auto-applied on server start
```

### Creating a New Migration

```bash
# Create a new migration file
npx knex migrate:make <migration_name> --knexfile knexfile.ts -x ts
```

Write the migration in `db/migrations/` following the existing pattern:

```typescript
import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('table_name', (table) => {
    table.increments('id').primary();
    // ... columns
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('table_name');
}
```

### Rolling Back

```bash
npx knex migrate:rollback --knexfile knexfile.ts
```

### Inspecting the Database

```bash
# Open SQLite CLI
sqlite3 db/toolkit.db

# List tables
.tables

# View schema
.schema accounts

# Count records
SELECT COUNT(*) FROM accounts WHERE status = 'active';

# Exit
.quit
```

### Schema Overview

| Table | Description |
|---|---|
| `accounts` | Bank accounts with region, currency, type, status |
| `account_fields` | Dynamic fields per account (region-specific + custom) |
| `credentials` | Credential sets per partner/environment |
| `credential_items` | Individual secrets (AES-256-GCM encrypted) and cert files |
| `penny_test_logs` | Penny test payment records with metadata |

---

## 4. Deployment

### Build for Production

```bash
# Compile TypeScript
npm run build

# Set production environment
export NODE_ENV=production

# Start
npm start
```

### Production Checklist

- [ ] `NODE_ENV=production` is set
- [ ] `VAULT_ENCRYPTION_KEY` is set to a securely generated 64-char hex string
- [ ] `SESSION_SECRET` is changed from the default
- [ ] `DB_PATH` points to a persistent, backed-up location
- [ ] `UPLOAD_DIR` points to a persistent directory with write permissions
- [ ] The `public/uploads/certs/` directory exists and is writable
- [ ] Export JSON files are **not** stored in version control (they contain plaintext secrets)

### Process Management

For production, use a process manager:

```bash
# With PM2
npm install -g pm2
pm2 start dist/server.js --name fintech-toolkit

# View logs
pm2 logs fintech-toolkit

# Restart
pm2 restart fintech-toolkit

# Stop
pm2 stop fintech-toolkit
```

---

## 5. Backup & Recovery

### Database Backup

The database is a single SQLite file — back it up by copying:

```bash
# Manual backup
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d-%H%M%S).db

# Automated daily backup (add to crontab)
0 2 * * * cp /path/to/db/toolkit.db /path/to/backups/toolkit-$(date +\%Y\%m\%d).db
```

### Full Data Export

The app's built-in export is the recommended backup method:

1. Go to **http://localhost:3000/data**
2. Select all modules (Accounts, Credentials, Penny Test Logs)
3. Click **Export Selected**
4. Store the JSON file securely — **it contains decrypted secrets**

### Recovery from Export

1. Start a fresh instance with `npm install && npm run migrate`
2. Go to **http://localhost:3000/data**
3. Upload the export JSON file
4. Click **Import**
5. Secrets are re-encrypted with the current `VAULT_ENCRYPTION_KEY`

### Recovery from Database Backup

```bash
# Stop the server
# Replace the database file
cp db/toolkit-backup-20250312.db db/toolkit.db
# Restart the server
npm run dev
```

> **Note:** If restoring to a different environment, the `VAULT_ENCRYPTION_KEY` must match the key used when the data was created. If the key differs, credential secrets will fail to decrypt. Use the JSON export/import flow instead — it decrypts with the old key on export and re-encrypts with the new key on import.

---

## 6. Export / Import

### Export

```bash
# Via CLI (curl)
curl -X POST http://localhost:3000/data/export \
  -d "accounts=1&credentials=1&penny_test_logs=1" \
  -o export.json
```

**What gets exported:**
- Accounts with all fields (region-specific and custom)
- Credentials with **decrypted** secret values
- Certificate files as base64-encoded data
- Penny test logs with all metadata

### Import

```bash
# Via CLI (curl)
curl -X POST http://localhost:3000/data/import \
  -F "file=@export.json"
```

**Import behavior:**
- IDs from the JSON file are **ignored** — new IDs are auto-generated
- Credential secrets are **re-encrypted** with the current `VAULT_ENCRYPTION_KEY`
- `penny_test_logs.account_id` references are **remapped** if accounts were also imported
- Existing data is **not** overwritten — imports are additive

### Security Warning

Export JSON files contain **plaintext secrets** (API keys, tokens). Handle them with care:
- Do not commit to version control
- Delete after use
- Transfer over encrypted channels only

---

## 7. Vault & Encryption

### Encryption Details

- **Algorithm:** AES-256-GCM
- **Key:** 32-byte key derived from `VAULT_ENCRYPTION_KEY` env var (64 hex chars)
- **IV:** Random 12 bytes per encryption operation
- **Storage format:** `JSON.stringify({ ct, iv, tag })` in the `credential_items.item_value` column

### Key Rotation

There is no automated key rotation. To rotate:

1. **Export all data** via the Export page (secrets are decrypted on export)
2. Generate a new key: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
3. Update `VAULT_ENCRYPTION_KEY` in `.env`
4. Clear the credentials tables: `sqlite3 db/toolkit.db "DELETE FROM credential_items; DELETE FROM credentials;"`
5. **Import the export file** (secrets are re-encrypted with the new key)

### Revealing Secrets in the UI

- Secrets are masked by default in the Vault detail view
- Click **Reveal** to decrypt and display for 10 seconds
- The reveal calls `GET /api/vault/:id/reveal/:itemId` which decrypts server-side

### Certificate Files

- Stored on disk in `public/uploads/certs/` with UUID filenames
- Original filename preserved in `credential_items.file_name`
- **Not encrypted on disk** in Phase 1 (noted for Phase 2)
- Allowed extensions: `.pem`, `.crt`, `.cer`, `.p12`, `.pfx`, `.key`, `.jks`

---

## 8. Troubleshooting

### App Won't Start

| Symptom | Cause | Fix |
|---|---|---|
| `Missing required environment variable: VAULT_ENCRYPTION_KEY` | `.env` file missing or key not set | Copy `.env.example` to `.env` and generate a key |
| `VAULT_ENCRYPTION_KEY must be a 64-character hex string` | Key is wrong length or not hex | Regenerate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `SQLITE_CANTOPEN` | DB directory doesn't exist | Create it: `mkdir -p db` |
| Port already in use | Another process on port 3000 | Change `PORT` in `.env` or kill the other process |

### Vault Decryption Fails

| Symptom | Cause | Fix |
|---|---|---|
| `Unsupported state or unable to authenticate data` | `VAULT_ENCRYPTION_KEY` changed after data was encrypted | Restore the original key, export data, set new key, re-import |
| `Invalid encrypted payload` | Corrupted `item_value` in database | Delete the affected credential item and re-create it |

### Migration Errors

```bash
# Check migration status
npx knex migrate:status --knexfile knexfile.ts

# Force rollback and re-run
npx knex migrate:rollback --all --knexfile knexfile.ts
npm run migrate
```

### Test Failures

```bash
# Run a specific test file
npx vitest run tests/unit/iban.test.ts

# Run with verbose output
npx vitest run --reporter=verbose

# Debug a specific test
npx vitest run -t "validates GB IBAN"
```

### Common Issues

| Issue | Solution |
|---|---|
| Dynamic form fields don't load | Check browser console for errors on `GET /api/regions/:code/fields`. Ensure JavaScript is enabled. |
| Export file is empty | Verify there is data in the selected modules. Check server logs for errors. |
| Import shows 0 records | The JSON meta.app must be `fintech-pm-toolkit`. Check the file is valid JSON. |
| Uploaded certificate not found | Verify `public/uploads/certs/` directory exists and is writable. |

---

## 9. Adding a New Region

1. **Edit `src/lib/region-schemas.ts`** — add the new region to `REGION_SCHEMAS`:

   ```typescript
   PH: {
     name: 'Philippines',
     currency: 'PHP',
     fields: [
       { key: 'bank_code', label: 'Bank Code', type: 'text', required: true },
       { key: 'account_number', label: 'Account Number', type: 'text', required: true },
       { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
     ],
   },
   ```

2. **Add test coverage** in `tests/unit/region-schemas.test.ts` — the dynamic tests auto-cover new regions.

3. **Run tests** to verify:
   ```bash
   npm test
   ```

4. **Rules:**
   - Every region MUST have at least `beneficiary_name` and one account identifier field
   - `key` values must be `snake_case`, unique within the region, and **never renamed** (breaks existing data)
   - Add test fixtures in `tests/fixtures/region-accounts.json` if applicable

---

## 10. Testing Procedures

### Test Structure

```
tests/
├── unit/                    # Pure function tests (no DB, no HTTP)
│   ├── iban.test.ts         # 41 tests
│   ├── bic.test.ts          # 44 tests
│   ├── encryption.test.ts   # 32 tests
│   ├── region-schemas.test.ts # 159 tests
│   └── export-import.test.ts  # 12 tests
├── integration/             # Route tests via Supertest
│   ├── accounts.test.ts     # 14 tests
│   ├── vault.test.ts        # 11 tests
│   ├── penny-log.test.ts    # 14 tests
│   ├── iban-routes.test.ts  # 8 tests
│   ├── bic-routes.test.ts   # 9 tests
│   └── data-routes.test.ts  # 9 tests
└── helpers/
    ├── setup.ts             # In-memory SQLite DB setup/teardown
    └── factory.ts           # Test data factories
```

### Running Tests

```bash
npm test                     # All 353 tests
npm run test:watch           # Watch mode
npm run test:coverage        # With coverage report
npx vitest run tests/unit/   # Unit tests only
npx vitest run tests/integration/ # Integration tests only
```

### Writing New Tests

**Unit tests** (for `src/lib/` functions):
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/lib/my-module';

describe('myFunction', () => {
  it('handles the happy path', () => {
    expect(myFunction('input')).toEqual({ expected: 'output' });
  });
});
```

**Integration tests** (for routes):
```typescript
process.env.VAULT_ENCRYPTION_KEY = 'a'.repeat(64);

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import supertest from 'supertest';
import { setupTestDb, teardownTestDb, cleanTables } from '../helpers/setup';
import createApp from '../../src/app';
import type { Knex } from 'knex';

let db: Knex;
let request: supertest.Agent;

beforeAll(async () => {
  db = await setupTestDb();
  request = supertest.agent(createApp(db));
});
afterAll(() => teardownTestDb());
beforeEach(() => cleanTables(db));

describe('GET /my-route', () => {
  it('returns 200', async () => {
    const res = await request.get('/my-route');
    expect(res.status).toBe(200);
  });
});
```

> **Important:** Integration test files must set `process.env.VAULT_ENCRYPTION_KEY` as the **very first line**, before any imports.

### Test Data Factories

Use `tests/helpers/factory.ts` to generate valid test data:

```typescript
import * as factory from '../helpers/factory';

const accountData = factory.account({ name: 'Custom Name' });
const credData = factory.credential({ partner_name: 'Stripe' });
const logData = factory.pennyLog({ status: 'success' });
```

---

## 11. Architecture Reference

### Request Flow

```
Client Request
  → Helmet (security headers)
  → Express body parser
  → Session / Flash middleware
  → Route handler
    → Zod validation middleware
    → Model (Knex query)
    → EJS template render
  → Error handler (catch-all)
```

### Layer Responsibilities

| Layer | Directory | Rules |
|---|---|---|
| **Lib** | `src/lib/` | Pure functions. No Express, no DB, no side effects. |
| **Models** | `src/models/` | Data access only. Accept `Knex` instance + plain objects. Return plain objects. |
| **Routes** | `src/routes/` | Orchestration only. Validate → call model/lib → render/redirect. |
| **Schemas** | `src/schemas/` | Shape definitions only. Imported by middleware and (future) client validation. |
| **Middleware** | `src/middleware/` | Cross-cutting concerns. Error handling, validation, file uploads. |
| **Types** | `src/types/` | TypeScript interfaces. No runtime code. |

### Database Access Pattern

All model functions accept a `Knex` instance as the first parameter. This enables:
- **Test isolation** — each test suite gets its own in-memory database
- **Future migration** — swap SQLite for PostgreSQL by changing Knex config only
- **No global state** — no module-level DB connection

```typescript
// ✅ Correct
export async function findById(db: Knex, id: number) { ... }

// ❌ Wrong — no global DB imports in models
import db from '../db';
```
