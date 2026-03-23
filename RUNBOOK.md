# Runbook

Operational guide for Astro Toolkit.

## 1. First-run verification

After local setup and `npm run migrate`, confirm the app is healthy:

1. Open `http://localhost:3000`.
2. Check the dashboard loads without server errors.
3. Open `/accounts/new` and confirm region-specific fields load after choosing a region.
4. Open `/iban`, validate `GB29NWBK60161331926819`, and confirm the result is valid.
5. Open `/bic`, validate `NWBKGB2L`, and confirm the result is valid.
6. Open `/json-parser` and format a sample payload.
7. Open `/data` and confirm export/import controls render.

## 2. Daily developer workflow

```bash
npm install
npm run migrate
npm run dev
```

Useful checks before shipping:

```bash
npm run typecheck
npm run test
npm run build
```

Optional:

```bash
npm run seed
npm run test:coverage
```

## 3. Configuration checklist

Required:

- `VAULT_ENCRYPTION_KEY` must be set and must be a 64-character hex string.

Common local defaults:

- `DB_PATH=./db/toolkit.db`
- `UPLOAD_DIR=./public/uploads`
- `MAX_FILE_SIZE_MB=10`

Generate a new key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Database operations

Run migrations:

```bash
npm run migrate
```

Seed sample data:

```bash
npm run seed
```

Default database location:

- `db/toolkit.db`

Tests do not use the file-backed database. Vitest runs against in-memory SQLite.

## 5. Backups and restores

### File-level SQLite backup

```bash
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d-%H%M%S).db
```

### In-app export

Use `/data` to export any combination of:

- Accounts
- Credentials
- Penny test logs

Notes:

- Export files are named `fintech-toolkit-export-YYYY-MM-DD.json`.
- Exported credential values are decrypted in the JSON file.
- Import regenerates record IDs and re-encrypts credential values with the active `VAULT_ENCRYPTION_KEY`.
- Import can target selected modules or auto-detect modules present in the file.

## 6. Encryption-key rotation

To rotate `VAULT_ENCRYPTION_KEY` safely:

1. Export all modules from `/data`.
2. Store the export file securely.
3. Replace `VAULT_ENCRYPTION_KEY` with a new 64-character hex key.
4. Clear existing credential records from the database.
5. Re-import the export file.

If the key changes without export/import, existing encrypted vault items will become unreadable until the original key is restored.

## 7. Production startup

Build and start:

```bash
npm run build
npm run start
```

Before production deployment:

- Set `VAULT_ENCRYPTION_KEY`.
- Point `DB_PATH` at persistent storage.
- Ensure `UPLOAD_DIR` and `UPLOAD_DIR/certs` are writable.
- Back up the database file regularly.
- Treat export JSON and uploaded certificates as sensitive operational data.

## 8. Troubleshooting

| Problem | Likely cause | Action |
| --- | --- | --- |
| App fails on startup with missing env var | `VAULT_ENCRYPTION_KEY` is unset | Copy `.env.example`, generate a key, and restart |
| `VAULT_ENCRYPTION_KEY must be a 64-character hex string` | Invalid key format | Generate a fresh key and update `.env` |
| `SQLITE_CANTOPEN` | Missing or unwritable DB path | Create the parent directory and check permissions |
| Vault values cannot be decrypted | The encryption key changed | Restore the original key or perform an export/import rotation |
| Certificate upload fails | Upload directory missing or not writable | Create `public/uploads/certs` or set `UPLOAD_DIR` correctly |
| Import rejects a file | Invalid JSON or wrong export metadata | Re-export from Astro Toolkit and retry |
| Search returns nothing unexpectedly | Query too short | Search activates after 2+ characters |

## 9. Adding or updating a region schema

Region definitions live in `lib/region-schemas.ts`.

Each region should include:

- `name`
- `currency`
- `fields`

Each field should define:

- `key`
- `label`
- `type`
- `required`

Optional field metadata:

- `placeholder`
- `validation`
- `options`

After updating schemas:

1. Verify the region shows in `/accounts/new`.
2. Confirm field validation behaves as expected.
3. Add or update tests in `tests/unit/region-schemas.test.ts` if needed.

## 10. UI and localization notes

- The app supports English and Simplified Chinese.
- New copy should be added to both dictionary files:
  - `lib/i18n/dictionaries/en.ts`
  - `lib/i18n/dictionaries/zh-CN.ts`
- Shared UI primitives live in `components/ui/`.
- Prefer `PageHeader`, `FilterPanel`, `SummaryCard`, `DetailSectionCard`, `Button`, `Badge`, `FileUploadTrigger`, and `CodeOutput` over new one-off patterns.
