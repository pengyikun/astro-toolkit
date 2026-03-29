# Astro Toolkit

Astro Toolkit is a self-hosted workspace for payment operations and integration testing. It combines account tracking, an encrypted credential vault, penny-test logging, IBAN and BIC validation, parser utilities, and data portability in one local-first Next.js app.

The repository name is `fintech-pm-toolkit`. The app label used in the UI is `Astro Toolkit`.

## What it does

- Track partner accounts with region-specific banking fields
- Store text secrets encrypted at rest
- Store certificate and key files outside the web root
- Log penny tests with request and response payloads
- Validate IBAN and BIC / SWIFT codes
- Format and visualize JSON and XML payloads
- Export and import accounts, vault records, and penny-test logs
- Support English and Simplified Chinese UI copy

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS and Radix UI primitives
- SQLite via `better-sqlite3` and `knex`
- Vitest for unit and integration tests

## Requirements

- Node.js 20+
- npm

## Quick start

```bash
git clone https://github.com/pengyikun/fintech-pm-toolkit.git
cd fintech-pm-toolkit
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the generated value as `VAULT_ENCRYPTION_KEY` in `.env`, then run:

```bash
npm run migrate
npm run dev
```

Open `http://localhost:3000`.

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VAULT_ENCRYPTION_KEY` | Yes | — | 64-character hex key used for vault encryption |
| `PORT` | No | `3000` | App port |
| `NODE_ENV` | No | `development` | Runtime environment |
| `DB_PATH` | No | `./db/toolkit.db` | SQLite database path |
| `UPLOAD_DIR` | No | `./storage/uploads` | Private upload directory for certificate material |
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum size for certificate uploads and import files |
| `BASIC_AUTH_USERNAME` | Production | — | HTTP basic auth username for the whole app |
| `BASIC_AUTH_PASSWORD` | Production | — | HTTP basic auth password for the whole app |
| `APP_AUTH_DISABLED` | No | `false` | Explicitly disables app auth; only use in trusted private environments |

`UPLOAD_DIR` must stay outside `./public`. The app rejects public upload paths so certificate files cannot be served directly by Next.js.
In production, the app requires basic auth unless `APP_AUTH_DISABLED=true` is set explicitly.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run migrate
npm run seed
npm run test
npm run test:watch
npm run test:coverage
npm run lint
npm run typecheck
npm run clean
```

`npm run seed` is a no-op unless you add seed files under `db/seeds/`.

## Security notes

- Vault text values are encrypted at rest with AES-256-GCM.
- The app is protected with HTTP basic auth in production unless you opt out explicitly.
- Uploaded certificates and private keys are stored under `UPLOAD_DIR/certs`, not under `public/`.
- Export files include decrypted text secrets so they can be re-imported elsewhere.
- Export files do not include uploaded certificate binaries.
- SQLite database files, export JSON, uploaded certificates, and `.env` files should be treated as sensitive.

## Testing

```bash
npm run test
npm run typecheck
npm run build
```

Tests run against in-memory SQLite. Coverage includes validators, data import/export, dashboard flows, parser endpoints, accounts, vault behavior, and penny-test logs.

## Project layout

- `app/`: pages, layouts, and API routes
- `actions/`: server actions
- `components/`: feature components and shared UI primitives
- `lib/`: config, encryption, parsing, i18n, helpers
- `models/`: database access
- `db/migrations/`: schema changes
- `tests/`: unit and integration tests

## License

ISC
