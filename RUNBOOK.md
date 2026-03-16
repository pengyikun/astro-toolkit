# Runbook

Operational guide for the FinTech PM Toolkit.

## Fresh install

Requires Node.js ≥ 18 (recommended 20 LTS).

```bash
git clone <repo-url> && cd fintech-pm-toolkit
npm install
cp .env.example .env
```

Generate a vault key and paste it into `.env` as `VAULT_ENCRYPTION_KEY`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then start:

```bash
npm run dev
```

Migrations run automatically via `lib/db.ts`. No separate step needed.

### Verify it works

1. Dashboard at http://localhost:3000
2. IBAN Checker → `GB29NWBK60161331926819` → valid
3. BIC Checker → `NWBKGB2L` → valid
4. Accounts → Create → select a region → fields appear

## Database

SQLite at `DB_PATH` (default `./db/toolkit.db`). Single file — back up by copying.

```bash
# Backup
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d).db

# Inspect
sqlite3 db/toolkit.db ".tables"

# Manual migration
npm run migrate
```

Tables: `accounts`, `account_fields`, `credentials`, `credential_items`, `penny_test_logs`, `bic_lei_mappings`

## Production deployment

```bash
npm run build
npm start
```

**Checklist:**
- `VAULT_ENCRYPTION_KEY` set
- `DB_PATH` on a persistent, backed-up volume
- `public/uploads/certs/` exists and is writable

## Export / Import

Export via the UI at `/data` or:

```bash
curl -X POST http://localhost:3000/api/data/export \
  -H "Content-Type: application/json" \
  -d '{"accounts":true,"credentials":true,"penny_test_logs":true}' \
  -o export.json
```

⚠️ Export files contain **plaintext secrets**. Don't commit them.

Import is additive — IDs are regenerated, secrets re-encrypted with the current vault key, cross-references remapped.

## Vault encryption

AES-256-GCM. Key from `VAULT_ENCRYPTION_KEY` (32 bytes / 64 hex chars). Random IV per operation. Stored as `{ct, iv, tag}` JSON in the database.

**Key rotation:**
1. Export all data (decrypts on export)
2. Generate new key, update `.env`
3. Clear credential tables
4. Import the export file (re-encrypts with new key)

**If the key changes without rotation**, existing secrets won't decrypt. Restore the original key, export, then rotate.

Certificate files are stored on disk at `public/uploads/certs/` with UUID filenames. Not encrypted on disk.

## Troubleshooting

| Problem | Fix |
|---|---|
| `Missing required environment variable: VAULT_ENCRYPTION_KEY` | `cp .env.example .env` and set the key |
| `VAULT_ENCRYPTION_KEY must be a 64-character hex string` | Regenerate with the node command above |
| `SQLITE_CANTOPEN` | `mkdir -p db` |
| Vault decrypt fails after key change | Restore original key → export → set new key → import |
| LEI lookup returns nothing | Needs `lei-bic-*.csv` in root before migration 004 runs |

## Adding a region

Edit `lib/region-schemas.ts`:

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

Every region needs at least `beneficiary_name` and one account identifier. Field keys are `snake_case` and must never be renamed (breaks existing data). Tests auto-cover new regions.

## Testing

```bash
npm test
npm run test:coverage
```

`VAULT_ENCRYPTION_KEY` is set automatically in `vitest.config.ts` — no manual env setup needed for tests.
