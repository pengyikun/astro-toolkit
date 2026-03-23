# Astro Toolkit

Astro Toolkit is a self-hosted operations workspace for cross-border payment teams. It combines account registry management, credential storage, validation tools, penny-test tracking, payload parsers, and data portability in one local-first Next.js app.

The repository name is still `fintech-pm-toolkit`, but the current in-app product name and metadata are `Astro Toolkit`.

## What the app includes

- Dashboard with recent transaction activity, issue queues, and workspace totals
- Account registry with region-specific banking schemas for 12 markets and rails
- Credential vault with encrypted secret values and certificate uploads
- Penny test log with status tracking, payload inspection, and search
- IBAN checker and BIC / SWIFT checker
- JSON and XML parser tools with formatted output and visualizer overlays
- Data export/import for accounts, credentials, and penny test logs
- Global search across accounts, credentials, and transactions
- English and Simplified Chinese UI dictionaries

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS + Radix UI primitives
- SQLite via `better-sqlite3` and `knex`
- Vitest for unit and integration coverage

## Requirements

- Node.js 20+
- npm

## Local setup

```bash
git clone https://github.com/pengyikun/fintech-pm-toolkit.git
cd fintech-pm-toolkit
npm install
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated key into `.env` as `VAULT_ENCRYPTION_KEY`, then initialize the database:

```bash
npm run migrate
npm run dev
```

Open `http://localhost:3000`.

## Environment variables

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VAULT_ENCRYPTION_KEY` | Yes | — | 64-character hex key used to encrypt vault secret values |
| `PORT` | No | `3000` | App port |
| `NODE_ENV` | No | `development` | Runtime environment |
| `DB_PATH` | No | `./db/toolkit.db` | SQLite database path |
| `UPLOAD_DIR` | No | `./public/uploads` | Base directory for uploaded files |
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum upload size for certificate/data imports |

## Available scripts

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

## Route map

### App routes

- `/` dashboard
- `/accounts`, `/accounts/new`, `/accounts/[id]`, `/accounts/[id]/edit`
- `/vault`, `/vault/new`, `/vault/[id]`, `/vault/[id]/edit`
- `/penny-log`, `/penny-log/new`, `/penny-log/[id]`, `/penny-log/[id]/edit`
- `/iban`
- `/bic`
- `/json-parser`
- `/xml-parser`
- `/data`

### API routes

- `/api/search`
- `/api/regions`
- `/api/regions/[code]/fields`
- `/api/iban/validate`
- `/api/bic/validate`
- `/api/data/export`
- `/api/data/import`

## Architecture notes

- Pages are server components by default under `app/`.
- Interactive surfaces live in `components/`.
- Shared UI primitives live in `components/ui/`.
- The current design system centers on `PageHeader`, `FilterPanel`, `SummaryCard`, `DetailSectionCard`, `Button`, `Badge`, `FileUploadTrigger`, and `CodeOutput`.
- Locale selection is cookie-backed and provided through `lib/i18n`.
- Database access runs through `lib/db.ts`, `knexfile.ts`, and model modules under `models/`.

## Data and security

- Vault item values are encrypted at rest with AES-256-GCM.
- Export files contain decrypted secret values so they can be re-imported on another machine.
- Imports validate the app signature in the export metadata and re-encrypt credential values with the current vault key.
- Uploaded certificate files are stored under `public/uploads/certs/`.

Treat export JSON files and uploaded certificate material as sensitive.

## Testing

```bash
npm run test
```

Vitest runs in a Node environment and uses an in-memory SQLite database for test execution. The suite covers unit behavior and integration routes for accounts, vault, dashboard, validators, data import/export, and parser endpoints.

## Development conventions

- Add new user-facing copy to both `lib/i18n/dictionaries/en.ts` and `lib/i18n/dictionaries/zh-CN.ts`.
- Prefer existing shared primitives before introducing page-local styling.
- Keep new list pages on the shared responsive table pattern in `components/ui/table.tsx`.
- Use `npm run migrate` whenever schema changes land.

## License

ISC
