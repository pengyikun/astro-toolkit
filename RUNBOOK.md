# Runbook

This file is for routine setup, checks, and recovery work.

## Bring up a local instance

```bash
npm install
npm run migrate
npm run dev
```

After startup:

1. Open `http://localhost:3000`.
2. Create the first admin account at `/auth` if the database is new.
3. Check that `/accounts/new`, `/vault/new`, `/iban`, `/bic`, and `/data` load.
4. Open `/mail` and `/whatsapp` and make sure they either work or show the expected setup prompt.

## Required configuration

- `VAULT_ENCRYPTION_KEY` must be a 64-character hex string.
- `AUTH_SECRET` must be set and must not match `VAULT_ENCRYPTION_KEY`.
- `UPLOAD_DIR` should stay outside `./public`.
- `DB_PATH` defaults to `./db/toolkit.db`.

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Run it twice and use different values.

## Before shipping

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Backups

The SQLite database is the main backup target.

```bash
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d-%H%M%S).db
```

The `/data` export covers accounts, credentials, and penny test logs. Treat export files as sensitive.

## Vault key rotation

If you need to replace `VAULT_ENCRYPTION_KEY`:

1. Export data from `/data`.
2. Store the export securely.
3. Set a new vault key.
4. Clear the old encrypted credential records.
5. Re-import the export.

Changing the vault key without exporting first will make existing encrypted values unreadable.

## Optional services

### Mail

Mail support depends on the [Himalaya CLI](https://github.com/pimalaya/himalaya). Install it on the host, then add IMAP settings from `/data`. Attachment downloads are temporary files under `storage/`.

### WhatsApp

WhatsApp support reads a local `messages.db` file in read-only mode. If you use [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp), select that database from `/data` and test the connection there.

## Production notes

- Keep the database on persistent storage.
- Make sure `UPLOAD_DIR` is writable and private.
- Set both `VAULT_ENCRYPTION_KEY` and `AUTH_SECRET` before startup.
- Install Himalaya only if mail support is needed.
- Make the WhatsApp database available on the host only if that feature is needed.
- Back up the database regularly.

## Troubleshooting

| Problem | Likely cause | Action |
| --- | --- | --- |
| App fails on startup because an env var is missing | `VAULT_ENCRYPTION_KEY` or `AUTH_SECRET` is not set | Copy `.env.example`, generate fresh values, and restart |
| `VAULT_ENCRYPTION_KEY must be a 64-character hex string` | Invalid vault key format | Generate a new 64-character hex string and update `.env` |
| `AUTH_SECRET must differ from VAULT_ENCRYPTION_KEY` | The same secret was reused for both settings | Generate a separate `AUTH_SECRET` and restart |
| Login is not working | Wrong database, missing admin account, or auth config problem | Check `.env`, confirm the database in use, and verify the admin account exists |
| `UPLOAD_DIR must be outside ./public` | Uploads are configured inside the web root | Point `UPLOAD_DIR` to a private directory such as `./storage/uploads` |
| `SQLITE_CANTOPEN` | Database path does not exist or is not writable | Create the parent directory and fix permissions |
| Vault values cannot be decrypted | The vault key changed | Restore the old key or complete a proper export and re-import rotation |
| Mail is unavailable | Himalaya is missing or IMAP settings are wrong | Install Himalaya, review `/data`, and test the connection again |
| WhatsApp is unavailable | Wrong `messages.db` file or the sync source is not ready | Re-select the database file and confirm the source is available |
