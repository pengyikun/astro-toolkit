# Astro Toolkit

Astro Toolkit is a self-hosted workspace for payment operations. It keeps a few day-to-day tools in one place: account records, credential storage, penny test logs, validation utilities, and a couple of optional local integrations.

## What it includes

- Account and partner record tracking
- Encrypted credential and certificate storage
- Penny test logging
- IBAN and BIC / SWIFT validation
- JSON and XML formatting tools
- Import and export for core workspace data
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

Mail support uses the [Himalaya CLI](https://github.com/pimalaya/himalaya). If it is installed, you can add IMAP settings from `/data`.

WhatsApp support reads a local `messages.db` file. If you use [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp), point Astro Toolkit to that database from `/data`.

## Common scripts

```bash
npm run dev
npm run build
npm run start
npm run migrate
npm run seed
npm run test
npm run lint
npm run typecheck
```

`npm run seed` only does anything if you add seed files under `db/seeds/`.

## Security notes

- Vault values are encrypted at rest.
- Uploaded files are stored outside the public web root.
- The database, `.env` file, exports, and uploaded files should all be treated as sensitive.
- With app auth enabled, admins can access the full workspace. Operators only see their own records.

## Before shipping

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## License

ISC
