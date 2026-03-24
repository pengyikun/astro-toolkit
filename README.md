# Astro Toolkit

Astro Toolkit is a self-hosted operations workspace for cross-border payment teams. It combines account registry management, encrypted credential storage, penny-test tracking, banking validators, payload tools, and data portability in one local-first Next.js app.

The repository name remains `fintech-pm-toolkit`, but the in-app product name and package metadata are `Astro Toolkit`.

## Product surface

- Dashboard with recent activity and workspace totals
- Account registry with region-specific banking schemas
- Encrypted vault for credentials, secrets, and certificate uploads
- Penny-test log with status tracking and payload inspection
- IBAN validator with categorized format and routing output
- BIC / SWIFT validator with identity, network profile, and LEI enrichment
- JSON and XML parser tools with formatted output and a visualizer overlay
- Data export/import for accounts, vault records, and penny-test logs
- Global search across accounts, credentials, and transactions
- English and Simplified Chinese UI dictionaries

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS plus Radix UI primitives
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

Paste the generated value into `.env` as `VAULT_ENCRYPTION_KEY`, then initialize the database and start the app:

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
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum upload size for certificate and import uploads |

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

- `/`
- `/accounts`
- `/accounts/new`
- `/accounts/[id]`
- `/accounts/[id]/edit`
- `/vault`
- `/vault/new`
- `/vault/[id]`
- `/vault/[id]/edit`
- `/penny-log`
- `/penny-log/new`
- `/penny-log/[id]`
- `/penny-log/[id]/edit`
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
- `/api/vault/[id]/reveal/[itemId]`

## Architecture

- `app/` contains App Router pages and route handlers.
- `components/` contains feature components for accounts, vault, penny log, validators, parsers, and layout.
- `components/ui/` contains shared primitives and reusable product patterns.
- `lib/i18n/` contains dictionaries, locale helpers, and client/server translation utilities.
- `lib/db.ts`, `knexfile.ts`, `models/`, and `scripts/migrate.ts` handle persistence and schema changes.

## Current design system

The app is built around a shared operational UI layer instead of page-local markup.

Core primitives and patterns:

- `PageHeader`
- `FilterPanel`
- `Button`
- `Badge`
- `Card` and `CardContent`
- `SummaryCard`
- `DetailSectionCard`, `DetailMetadata`, and `DetailItem`
- `FileUploadTrigger`
- `CodeOutput`
- shared responsive table behavior in `components/ui/table.tsx`

Current UI conventions:

- CRUD list pages use the shared responsive table pattern rather than separate desktop/mobile markup.
- Detail routes use the extracted detail-card system.
- Validator pages are intentionally streamlined: title, input, result, enrichment.
- New copy must be added to both `lib/i18n/dictionaries/en.ts` and `lib/i18n/dictionaries/zh-CN.ts`.

## Data and security

- Vault values are encrypted at rest with AES-256-GCM.
- Export files contain decrypted vault values so they can be re-imported on another machine.
- Import validates export metadata and re-encrypts credential values with the active `VAULT_ENCRYPTION_KEY`.
- Uploaded certificates are stored under `public/uploads/certs/`.

Treat export JSON files, uploaded certificate material, and local database files as sensitive operational data.

## Testing

```bash
npm run test
```

Vitest runs against an in-memory SQLite setup for tests. Coverage includes accounts, vault flows, dashboard data, validators, parser endpoints, and data import/export behavior.

## Development conventions

- Prefer existing shared primitives before adding page-local styling.
- Keep list pages on the shared responsive table system.
- Keep detail views on the detail-card system.
- Keep validators concise: no repeated page copy, no duplicated summary facts, and inline explanations instead of tooltip-only meaning.
- Run `npm run migrate` whenever schema changes land.

## License

ISC
