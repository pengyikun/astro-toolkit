# Runbook

Day-to-day operations, recovery procedures, and troubleshooting.

## Local setup

```bash
npm install
npm run migrate
npm run dev
```

Smoke test after startup:
1. http://localhost:3000 loads
2. Create admin at `/auth` (first user = admin)
3. `/accounts/new`, `/vault/new`, `/iban`, `/bic`, `/data` all render
4. `/mail` and `/whatsapp` show setup prompts if not configured
5. `/intelligence` shows the brief generator

## Configuration

Two secrets are required — generate each separately:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`VAULT_ENCRYPTION_KEY` — 64-char hex, encrypts credential vault.
`AUTH_SECRET` — signs session cookies. Must be a different value.

Everything else has sane defaults. See `.env.example`.

## Pre-deploy checklist

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Backups

```bash
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d-%H%M%S).db
```

You can also export accounts/credentials/logs from `/data` in the UI. Export files contain plaintext secrets — handle with care.

## Vault key rotation

1. Export from `/data`
2. Save the file somewhere safe
3. Set a new `VAULT_ENCRYPTION_KEY`
4. Delete old credential records
5. Re-import

If you change the key without exporting first, existing encrypted values become unreadable.

## Mail (Himalaya)

Install [Himalaya](https://github.com/pimalaya/himalaya), add IMAP settings at `/data`. Attachments download to `storage/` as temp files.

## WhatsApp

Point `/data` at a local `messages.db` (read-only). Compatible with [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp).

## AI Brief

Configure LLM settings at `/data` — base URL, API key, model name. Hit "Verify" to test the connection, then go to `/intelligence` to generate a brief.

Works with OpenAI, Anthropic (auto-detected), OpenRouter, NewAPI, LiteLLM, or any endpoint that serves `/v1/chat/completions`. Reasoning models (DeepSeek R1, Claude extended thinking) stream thinking tokens live.

You need at least one connector (mail or WhatsApp) with recent data for the brief to produce anything useful.

## Migrations

```bash
npm run migrate            # run pending
npx knex migrate:status    # check state
npx knex migrate:rollback  # undo last batch
```

## Production

- Database on persistent storage
- `UPLOAD_DIR` writable, not under `./public`
- Both secrets set before first start
- Behind a reverse proxy? The brief SSE endpoint sends `X-Accel-Buffering: no` — make sure your proxy respects it

## Troubleshooting

**App won't start, missing env var** — copy `.env.example` to `.env`, generate fresh secrets, restart.

**`VAULT_ENCRYPTION_KEY must be a 64-character hex string`** — regenerate the key. It needs to be exactly 64 hex characters.

**`AUTH_SECRET must differ from VAULT_ENCRYPTION_KEY`** — use two different values.

**Can't log in** — check that the DB exists, an admin account was created, and `.env` is correct.

**`SQLITE_CANTOPEN`** — the DB directory doesn't exist or isn't writable. Create it, fix permissions.

**Vault decryption fails** — the key changed. Restore the old key or do a full export/re-import rotation.

**Mail unavailable** — Himalaya not installed or IMAP settings wrong. Check `/data`.

**WhatsApp unavailable** — wrong DB path or file doesn't exist. Re-select at `/data`.

**Brief fails with HTTP error** — bad base URL, wrong API key, or invalid model. Use "Verify" at `/data` to debug.

**Brief returns empty** — no connectors configured, or no messages in the selected date range.

**Brief stream buffers behind nginx** — disable proxy buffering for `/api/intelligence/brief`, or confirm `X-Accel-Buffering: no` is being passed through.
