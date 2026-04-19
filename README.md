# Astro Toolkit

Self-hosted workspace for payment operations — account records, credential vault, penny test logs, IBAN/BIC validation, JSON/XML tools, and a few optional integrations (IMAP mail, WhatsApp, AI brief generator).

## Getting started

```bash
git clone https://github.com/pengyikun/astro-toolkit.git
cd astro-toolkit
npm install
cp .env.example .env
```

Generate two secrets (they must be different):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Put the first in `VAULT_ENCRYPTION_KEY` and the second in `AUTH_SECRET`, then:

```bash
npm run migrate
npm run dev
```

Open http://localhost:3000. The first account you create becomes admin.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VAULT_ENCRYPTION_KEY` | Yes | — | 64-char hex. Encrypts vault credentials |
| `AUTH_SECRET` | Yes | — | Signs session cookies. Must differ from vault key |
| `DB_PATH` | No | `./db/toolkit.db` | SQLite database location |
| `UPLOAD_DIR` | No | `./storage/uploads` | File uploads (keep outside `./public`) |
| `MAX_FILE_SIZE_MB` | No | `10` | Max upload size |
| `APP_AUTH_DISABLED` | No | `false` | Skip auth entirely. Local dev only |
| `HIMALAYA_BIN` | No | `himalaya` | Path to Himalaya CLI binary |

## Integrations

All three are optional. Configure each from the Settings page (`/data`).

**Mail** — reads IMAP via [Himalaya CLI](https://github.com/pimalaya/himalaya). Install the binary, add your IMAP credentials in settings, done.

**WhatsApp** — reads a local `messages.db` in read-only mode. Works with [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp) or any compatible SQLite export.

**AI Brief** — pulls recent mail/WhatsApp messages and generates a structured daily brief with pending items. Point it at any OpenAI-compatible API:

- OpenAI, OpenRouter, NewAPI, OneAPI, LiteLLM — use your provider's base URL
- Anthropic — auto-detected by hostname, uses native protocol
- Thinking models (DeepSeek R1, Claude extended thinking, etc.) — reasoning streams live in the UI

## Scripts

```bash
npm run dev            # dev server
npm run build          # production build
npm run start          # production server
npm run migrate        # run pending migrations
npm run test           # run tests (vitest)
npm run lint           # eslint
npm run typecheck      # tsc --noEmit
```

## Project layout

```
app/           pages and API routes (Next.js app router)
actions/       server actions
components/    UI components, grouped by feature
lib/           pure logic — no DB, no framework deps
models/        data access (knex)
schemas/       zod validation
types/         shared types
db/migrations/ schema migrations
storage/       uploads, mail temp files (gitignored)
```

## Security

Vault values are AES-256 encrypted at rest. Uploads stay outside the web root. Auth middleware runs on every request. Sensitive responses (vault reveal, data export, brief stream) are marked `no-store`. Multi-step DB writes use transactions.

The database file, `.env`, and export files all contain secrets — treat accordingly.

## License

ISC
