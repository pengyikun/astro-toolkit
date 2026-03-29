# Runbook

Operational notes for Astro Toolkit.

## 1. First run

After `npm install` and `npm run migrate`, confirm the app is healthy:

1. Open `http://localhost:3000`.
2. If this is a fresh install, create the first operator at `/auth`. Otherwise sign in with an existing operator account.
3. Confirm the dashboard renders without server errors after sign-in.
4. Open `/accounts/new` and verify region-specific fields load after selecting a region.
5. Open `/vault/new` and verify the form accepts a certificate file selection.
6. Open `/iban`, validate `GB29NWBK60161331926819`, and confirm the result is marked valid.
7. Open `/bic`, validate `NWBKGB2L`, and confirm identity and registry details render.
8. Open `/json-parser` and `/xml-parser` and confirm both tools format input.
9. Open `/data` and confirm export and import controls render.

## 2. Daily workflow

```bash
npm install
npm run migrate
npm run dev
```

Checks worth running before shipping:

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

`npm run seed` only does work if you add seed files under `db/seeds/`.

## 3. Configuration

Required:

- `VAULT_ENCRYPTION_KEY` must be set to a 64-character hex string.

Defaults:

- `DB_PATH=./db/toolkit.db`
- `UPLOAD_DIR=./storage/uploads`
- `MAX_FILE_SIZE_MB=10`
- `APP_AUTH_DISABLED=false`
- `AUTH_SECRET` falls back to `VAULT_ENCRYPTION_KEY` if you leave it unset

Production auth:

- Set `AUTH_SECRET` to a dedicated random value
- Leave `APP_AUTH_DISABLED=false` unless the deployment is fully private and you are choosing to bypass auth deliberately

Generate a new key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`UPLOAD_DIR` must stay outside `./public`. The app rejects public upload directories.

Auth bootstrap:

- Visit `/auth` on a fresh install to create the first operator.
- After the first operator exists, unauthenticated users can only sign in.
- Signed-in operators can create another operator at `/auth?mode=register`.

## 4. Database

Run migrations:

```bash
npm run migrate
```

Default database file:

- `db/toolkit.db`

Tests use in-memory SQLite, not the file-backed development database.

## 5. Backup and restore

File-level backup:

```bash
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d-%H%M%S).db
```

In-app export from `/data` can include:

- Accounts
- Credentials
- Penny test logs

Important:

- Export files are named `fintech-toolkit-export-YYYY-MM-DD.json`.
- Exported text secrets are decrypted in the JSON file.
- Uploaded certificate binaries are not bundled into the export.
- Import regenerates record IDs and re-encrypts text secrets with the active `VAULT_ENCRYPTION_KEY`.

## 6. Validator smoke checks

IBAN:

1. Open `/iban`.
2. Validate `GB29NWBK60161331926819`.
3. Confirm the result shows a valid verdict, a formatted IBAN, and routing details.
4. Validate an invalid value and confirm the error remains readable.

BIC / SWIFT:

1. Open `/bic`.
2. Validate `NWBKGB2L`.
3. Confirm the result shows identity, network profile, and registry enrichment.
4. Validate an invalid value and confirm the error remains readable.

## 7. Encryption key rotation

To rotate `VAULT_ENCRYPTION_KEY` safely:

1. Export all modules from `/data`.
2. Store the export file securely.
3. Replace `VAULT_ENCRYPTION_KEY` with a new 64-character hex key.
4. Clear existing credential records from the database.
5. Re-import the export file.

If the key changes without export and re-import, existing encrypted vault items become unreadable until the original key is restored.

## 8. Production startup

```bash
npm run build
npm run start
```

Before deploying:

- Set `VAULT_ENCRYPTION_KEY`.
- Set `AUTH_SECRET`.
- Put `DB_PATH` on persistent storage.
- Make sure `UPLOAD_DIR` and `UPLOAD_DIR/certs` are writable.
- Back up the database regularly.
- Treat export JSON, uploaded certificates, and `.env` files as sensitive.

## 9. Troubleshooting

| Problem | Likely cause | Action |
| --- | --- | --- |
| App fails on startup with missing env var | `VAULT_ENCRYPTION_KEY` is unset | Copy `.env.example`, generate a key, and restart |
| `VAULT_ENCRYPTION_KEY must be a 64-character hex string` | Invalid key format | Generate a fresh key and update `.env` |
| Login keeps failing | Wrong email or password | Verify the operator account exists in the current database file and try again |
| Registration is unavailable | An operator already exists and you are not signed in | Sign in first, then open `/auth?mode=register` |
| `UPLOAD_DIR must be outside ./public` | Upload path points into the web root | Set `UPLOAD_DIR` to a private directory such as `./storage/uploads` |
| `Certificate file exceeds the 10 MB limit` | Uploaded file is too large | Increase `MAX_FILE_SIZE_MB` or upload a smaller file |
| `Import file exceeds the 10 MB limit` | Import file is too large | Increase `MAX_FILE_SIZE_MB` or split the import |
| `SQLITE_CANTOPEN` | Missing or unwritable DB path | Create the parent directory and check permissions |
| Vault values cannot be decrypted | The encryption key changed | Restore the original key or perform an export/import rotation |
| Uploaded file is missing | The certificate was moved or deleted on disk | Re-upload the file for that vault entry |
| Search returns nothing unexpectedly | Query too short | Search activates after 2+ characters |

## 10. Region schemas

Region definitions live in `lib/region-schemas.ts`.

After updating a region:

1. Verify the region appears in `/accounts/new`.
2. Confirm field validation behaves as expected.
3. Update `tests/unit/region-schemas.test.ts` when behavior changes.

## 11. UI and localization

- The app supports English and Simplified Chinese.
- Add new copy to both dictionary files:
  - `lib/i18n/dictionaries/en.ts`
  - `lib/i18n/dictionaries/zh-CN.ts`
- Shared UI primitives live in `components/ui/`.
- Keep validator pages concise and explanation-first.
