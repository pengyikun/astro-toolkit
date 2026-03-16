# FinTech PM Toolkit

A toolkit for fintech product managers managing cross-border payment integrations. One place for test accounts, IBAN/BIC validation, sandbox credentials, and penny test tracking.

## What's in the box

- **Test Account Manager** — Bank accounts across 12 regions with region-specific fields (PIX keys, ABA routing, CLABE, Sort Codes, etc.)
- **IBAN Validator** — ISO 13616 validation + parsing for 70+ countries
- **BIC/SWIFT Validator** — ISO 9362 validation with optional LEI cross-reference
- **Credentials Vault** — AES-256-GCM encrypted storage for sandbox API keys, secrets, and certificates
- **Penny Test Log** — Track test payments with filters, search, and payload inspection
- **JSON / XML Parsers** — Format, validate, and explore API payloads

Everything is exportable/importable as JSON for portability.

## Quick start

```bash
git clone https://github.com/pengyikun/fintech-pm-toolkit.git
cd fintech-pm-toolkit
npm install
cp .env.example .env
```

Generate a vault encryption key and paste it into `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Migrations run automatically on startup.

## Stack

Express 5 · TypeScript · SQLite (better-sqlite3) · Knex · EJS · Tailwind CSS 3 · Zod · Vitest

## Environment

| Variable | Required | Description |
|---|---|---|
| `VAULT_ENCRYPTION_KEY` | **Yes** | 64-char hex string for AES-256-GCM |
| `SESSION_SECRET` | Production | Express session secret |
| `PORT` | No | Default `3000` |
| `DB_PATH` | No | Default `./db/toolkit.db` |
| `UPLOAD_DIR` | No | Default `./public/uploads` |
| `MAX_FILE_SIZE_MB` | No | Default `10` |

## Scripts

```bash
npm run dev           # Dev server (tsx watch, auto-migrates)
npm run build         # CSS + TypeScript → dist/
npm start             # Production server (run build first)
npm test              # All tests
npm run test:coverage # Coverage report
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
```

## Testing

```bash
npm test                                # All tests
npx vitest run tests/unit/              # Unit only
npx vitest run tests/integration/       # Integration only
npx vitest run tests/unit/iban.test.ts  # Single file
```

Tests use in-memory SQLite — no setup needed.

## Project layout

```
src/
  lib/            Pure logic (IBAN, BIC, encryption, region schemas) — no Express
  models/         Data access (Knex queries, plain objects in/out)
  routes/         Thin handlers: validate → model → render
  schemas/        Zod schemas
  middleware/     Error handler, validation, CSRF, uploads
  views/          EJS templates
db/migrations/    Knex migrations (auto-run on startup)
tests/
  unit/           Lib function tests
  integration/    Route tests via Supertest
  helpers/        DB setup, factories
```

## Security notes

- Vault secrets are AES-256-GCM encrypted at rest with random IV per operation
- CSRF tokens on all mutating routes
- Zod validation on all inputs
- SQL injection prevention via Knex parameterized queries
- File uploads: extension whitelist, UUID filenames, size limits
- **Export files contain plaintext secrets** — handle with care, don't commit them

## BIC/LEI mapping (optional)

Place `lei-bic-20260227T000000.csv` in the project root before running migrations to enable LEI cross-referencing in the BIC checker. The app works fine without it.

## License

ISC
