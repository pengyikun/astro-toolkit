# Runbook

Short operational notes for Astro Toolkit.

## 1. First run

Start the app:

```bash
npm install
npm run migrate
npm run dev
```

Then do a quick smoke check:

1. Open `http://localhost:3000`.
2. On a fresh install, create the first admin at `/auth`.
3. Confirm the main pages load: `/accounts/new`, `/vault/new`, `/iban`, `/bic`, and `/data`.
4. Open `/mail` and `/whatsapp` and confirm they either load or show the expected setup prompt.

## 2. Daily workflow

```bash
npm run dev
```

Before shipping:

```bash
npm run typecheck
npm run test
npm run build
```

## 3. Configuration

- `VAULT_ENCRYPTION_KEY` must be set to a 64-character hex string.
- `DB_PATH=./db/toolkit.db`
- `UPLOAD_DIR=./storage/uploads`
- Set `AUTH_SECRET` for public or shared deployments.
- Keep `UPLOAD_DIR` outside `./public`.
- Mail and WhatsApp settings are saved from `/data`, not from environment variables.

Generate a new key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Database

- Default database file: `db/toolkit.db`
- Run migrations with `npm run migrate`
- Keep the database on persistent storage in production

## 5. Backup and restore

Back up the database file:

```bash
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d-%H%M%S).db
```

- `/data` export/import covers accounts, credentials, and penny test logs.
- File backups also preserve app settings, including Mail and WhatsApp configuration.
- Export files should be handled carefully because they can contain sensitive data.

## 6. Validator smoke checks

1. Open `/iban`.
2. Validate `GB29NWBK60161331926819`.
3. Open `/bic` and validate `NWBKGB2L`.
4. Also try an invalid value on both pages and confirm the error stays readable.

## 7. Encryption key rotation

1. Export all modules from `/data`.
2. Store the export file securely.
3. Replace `VAULT_ENCRYPTION_KEY` with a new 64-character hex key.
4. Clear existing credential records from the database.
5. Re-import the export file.

If the key changes without export and re-import, existing encrypted vault items will no longer be readable.

## 8. Mail (IMAP)

1. Install the [Himalaya CLI](https://github.com/pimalaya/himalaya).
2. If needed, set `HIMALAYA_BIN` to the binary path.
3. Open `/data` and enter the IMAP settings.
4. Click "Test Connection".
5. Open `/mail`.

Keep in mind:

- Mail credentials are stored in the app database.
- Downloaded attachments are temporary files under `storage/`.

## 9. WhatsApp

1. Run the [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp) bridge.
2. Open `/data` and select its `messages.db` file.
3. Click "Test Connection" to verify.
4. Open `/whatsapp`.

- Astro Toolkit reads the WhatsApp database in read-only mode.

## 10. Production startup

```bash
npm run build
npm run start
```

Before deploying:

- Set `VAULT_ENCRYPTION_KEY`.
- Set `AUTH_SECRET`.
- Put `DB_PATH` on persistent storage.
- Make sure `UPLOAD_DIR` is writable and private.
- If `/mail` is enabled, install Himalaya on the host.
- If `/whatsapp` is enabled, make sure the host can read the synced `messages.db` file.
- Back up the database regularly.

## 11. Troubleshooting

| Problem | Likely cause | Action |
| --- | --- | --- |
| App fails on startup with missing env var | `VAULT_ENCRYPTION_KEY` is unset | Copy `.env.example`, generate a key, and restart |
| `VAULT_ENCRYPTION_KEY must be a 64-character hex string` | Invalid key format | Generate a fresh key and update `.env` |
| Login or registration is not working | Wrong account, missing admin access, or wrong database | Check the current database and sign in as an admin if you need to manage users |
| `UPLOAD_DIR must be outside ./public` | Upload path points into the web root | Set `UPLOAD_DIR` to a private directory such as `./storage/uploads` |
| `SQLITE_CANTOPEN` | Missing or unwritable DB path | Create the parent directory and check permissions |
| Vault values cannot be decrypted | The encryption key changed | Restore the original key or perform an export/import rotation |
| Mail is unavailable | Himalaya is missing or the IMAP settings are wrong | Install Himalaya, re-check `/data`, and run "Test Connection" |
| WhatsApp is unavailable | Wrong `messages.db` file or the sync bridge is not ready | Re-select the database file and confirm whatsapp-mcp is running |
