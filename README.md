# Astro Toolkit

Astro Toolkit is a self-hosted workspace for payment operations. It keeps a few day-to-day tools in one place: account records, credential storage, penny test logs, validation utilities, and a couple of optional local integrations.

## What it includes

- Account and partner record tracking
- Encrypted credential and certificate storage
- Penny test logging
- IBAN and BIC / SWIFT validation
- JSON and XML formatting tools with save and annotation
- Import and export for core workspace data
- AI-powered daily brief generator (OpenAI, Anthropic, OpenRouter, NewAPI, or any OpenAI-compatible endpoint)
- Optional IMAP mail browsing
- Optional WhatsApp database browsing
- English and Simplified Chinese UI

## Requirements

- Node.js 20 or later
- npm

## Quick start

1. Clone the repo and install dependencies.
2. Copy `.env.example` to `.env`.
3. Generate two different secrets.
4. Run the database migrations.
5. Start the app.

```bash
git clone https://github.com/pengyikun/astro-toolkit.git
cd astro-toolkit
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run migrate
npm run dev
```

Use the first generated value for `VAULT_ENCRYPTION_KEY` and the second for `AUTH_SECRET`. They must not be the same.

Then open `http://localhost:3000`. On a fresh install, the first user created at `/auth` becomes the admin account.

## Environment

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `VAULT_ENCRYPTION_KEY` | Yes | — | 64-character hex key for vault encryption |
| `AUTH_SECRET` | Yes | — | Secret used for session and download-token signing; must differ from `VAULT_ENCRYPTION_KEY` |
| `DB_PATH` | No | `./db/toolkit.db` | SQLite database path |
| `UPLOAD_DIR` | No | `./storage/uploads` | Private upload directory |
| `MAX_FILE_SIZE_MB` | No | `10` | Upload size limit |
| `APP_AUTH_DISABLED` | No | `false` | Turns off app auth; use only in a trusted private environment |
| `HIMALAYA_BIN` | No | `himalaya` | Optional path to the Himalaya CLI |

Keep `UPLOAD_DIR` outside `./public`.

## Optional integrations

### Mail

Mail support uses the [Himalaya CLI](https://github.com/pimalaya/himalaya). If it is installed, you can add IMAP settings from `/data`.

### WhatsApp

WhatsApp support reads a local `messages.db` file. If you use [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp), point Astro Toolkit to that database from `/data`.

### AI Brief Generator

The brief generator summarises recent mail and WhatsApp messages into a structured daily brief with pending action items. It works with any OpenAI-compatible LLM API.

Configure from `/data`:

- **Base URL** — your provider's API endpoint (e.g. `https://openrouter.ai/api`, `https://api.anthropic.com`, or a self-hosted proxy like NewAPI / LiteLLM / OneAPI)
- **API Key** — optional; required for hosted providers
- **Model Name** — the model identifier (e.g. `gpt-4o`, `anthropic/claude-sonnet-4`, `deepseek/deepseek-r1`)
- **Max Tokens / Context Window** — adjust based on your model

Supported features:
- Streaming response with live output
- Thinking / reasoning model support (DeepSeek R1, Claude with extended thinking, etc.)
- Automatic Anthropic native API detection (by hostname or `/v1/messages` path)
- Batch processing for large context windows

## Common scripts

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run migrate      # Run database migrations
npm run seed         # Run seed files (if any exist under db/seeds/)
npm run test         # Run all tests
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint         # Lint the codebase
npm run typecheck    # Type-check without emitting
```

## Project structure

```
app/             Next.js app router pages and API routes
actions/         Server actions (form submissions, mutations)
components/      React components by feature
lib/             Pure logic (no DB, no framework)
models/          Knex-based data access layer
schemas/         Zod validation schemas
types/           Shared TypeScript types
db/migrations/   Database migration files
storage/         Private file storage (uploads, mail temp)
```

## Security notes

- Vault values are AES-256 encrypted at rest.
- Uploaded files are stored outside the public web root.
- Sensitive API responses (vault reveal, data export, brief stream) include `Cache-Control: no-store`.
- Middleware enforces auth on all routes except static assets and `/auth`.
- The database, `.env` file, exports, and uploaded files should all be treated as sensitive.
- With app auth enabled, admins can access the full workspace. Operators only see their own records.
- Singleton settings tables have unique constraints to prevent duplicate rows.
- Account and credential updates use database transactions to prevent partial writes.

## Before shipping

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

ISC
