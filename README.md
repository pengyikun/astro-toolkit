# FinTech PM Toolkit

An internal Node.js web application for fintech product managers who manage cross-border payment integrations. Consolidates core workflows into one unified interface.

## Features

| Module | Description |
|---|---|
| **Penny Test Account Manager** | Create, store, and manage bank accounts across 12+ regions with region-specific field schemas (PIX keys for Brazil, ABA routing for the US, CLABE for Mexico, Sort Codes for the UK, etc.) |
| **IBAN Validator & Parser** | ISO 13616 validation with MOD-97 check, country-specific BBAN format validation, and structured decomposition (bank, branch, account) for 70+ countries |
| **BIC/SWIFT Validator & Parser** | ISO 9362 validation with institution, country, location, and branch parsing. Detects test BICs, passive participants, and reverse billing. Includes LEI lookup integration |
| **Sandbox Credentials Vault** | Store and organize sandbox API keys, secrets, tokens, and certificate files per partner integration. All secrets encrypted at rest with AES-256-GCM |
| **Penny Test Log** | Record, search, filter, and review penny test payment transactions with structured metadata, status tracking, and linked accounts |
| **JSON Parser** | Paste, format, validate, and explore JSON payloads with syntax highlighting |
| **XML Parser** | Paste, format, validate, and explore XML documents with tree visualization |

All modules share a **universal JSON export/import system** for data portability.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language | TypeScript (strict mode) | 5.9 |
| Runtime | Node.js | ≥ 18 (recommended ≥ 20 LTS) |
| Framework | Express.js | 5.2 |
| Database | SQLite via better-sqlite3 | 12 |
| Query Builder | Knex.js | 3.1 |
| Frontend | EJS templates + Tailwind CSS 3.4 + Vanilla JS | — |
| Validation | Zod | 4.3 |
| Testing | Vitest + Supertest | 4.0 / 7.2 |
| Security | Helmet, AES-256-GCM encryption, CSRF tokens | — |

## Quick Start

```bash
# 1. Clone & install
git clone <repo-url> fintech-pm-toolkit
cd fintech-pm-toolkit
npm install

# 2. Configure environment
cp .env.example .env

# 3. Generate vault encryption key (REQUIRED)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Paste the output into .env as VAULT_ENCRYPTION_KEY=<generated-key>

# 4. Build CSS (first time only — already committed but regenerate if needed)
npm run css:build

# 5. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

> **Note:** Migrations run automatically on server startup — no separate `npm run migrate` step needed.

## Project Structure

```
fintech-pm-toolkit/
├── db/migrations/              # Knex migration files (TypeScript)
│   ├── 001_create_accounts.ts
│   ├── 002_create_credentials.ts
│   ├── 003_create_penny_test_logs.ts
│   └── 004_create_bic_lei_mappings.ts
├── public/                     # Static assets
│   ├── css/app.css             # Compiled Tailwind CSS
│   ├── images/                 # Logo and images
│   └── js/                     # Client-side JS (region fields, search, parsers, etc.)
├── scripts/                    # CLI scripts (migrate, seed)
├── src/
│   ├── app.ts                  # Express app factory (no listen — used by tests)
│   ├── server.ts               # Entry point — migrations + app.listen()
│   ├── config.ts               # Centralized config from env vars
│   ├── lib/                    # Pure logic (no Express dependency)
│   │   ├── iban.ts             # IBAN validation & parsing (ISO 13616)
│   │   ├── bic.ts              # BIC/SWIFT validation & parsing (ISO 9362)
│   │   ├── encryption.ts       # AES-256-GCM encrypt/decrypt
│   │   ├── region-schemas.ts   # Region field definitions (12 regions)
│   │   ├── export-import.ts    # JSON export/import logic
│   │   ├── json-parser.ts      # JSON formatting/validation
│   │   ├── xml-parser.ts       # XML formatting/validation
│   │   └── lei-lookup.ts       # LEI ↔ BIC cross-reference
│   ├── models/                 # Data access layer (Knex queries)
│   │   ├── account.model.ts
│   │   ├── credential.model.ts
│   │   └── penny-test-log.model.ts
│   ├── routes/                 # Express route handlers
│   ├── middleware/             # Error handler, Zod validator, CSRF, Multer, ID parser
│   ├── schemas/                # Zod validation schemas
│   ├── styles/                 # Tailwind CSS source
│   ├── types/                  # TypeScript type definitions
│   └── views/                  # EJS templates
├── tests/
│   ├── unit/                   # Pure function tests (10 files)
│   ├── integration/            # Route tests via Supertest (11 files)
│   └── helpers/                # Test DB setup & factories
├── .env.example                # Environment variable template
├── knexfile.ts                 # Knex configuration
├── tsconfig.json               # TypeScript configuration
├── tailwind.config.js          # Tailwind CSS configuration
├── postcss.config.js           # PostCSS configuration
└── vitest.config.ts            # Vitest configuration
```

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch). Builds CSS first. |
| `npm start` | Start production server (requires `npm run build` first) |
| `npm run build` | Build CSS + compile TypeScript to `dist/` |
| `npm run css:build` | Build Tailwind CSS only |
| `npm run css:watch` | Watch and rebuild CSS on changes |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with V8 coverage report |
| `npm run migrate` | Run database migrations manually |
| `npm run seed` | Run database seeds |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint source and test files |
| `npm run lint:fix` | Lint and auto-fix |
| `npm run clean` | Remove `dist/` directory |

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `DB_PATH` | No | `./db/toolkit.db` | SQLite database file path |
| `VAULT_ENCRYPTION_KEY` | **Yes** | — | 64-character hex string for AES-256-GCM encryption |
| `SESSION_SECRET` | Prod only | Auto-generated in dev | Express session secret |
| `UPLOAD_DIR` | No | `./public/uploads` | File upload directory |
| `MAX_FILE_SIZE_MB` | No | `10` | Max upload file size in MB |

## Routes

### HTML Routes (Server-Rendered)

```
GET    /                    Dashboard (summary cards, recent activity)

GET    /accounts            List accounts (with filters)
GET    /accounts/new        Create account form
POST   /accounts            Create account
GET    /accounts/:id        View account detail
GET    /accounts/:id/edit   Edit account form
PUT    /accounts/:id        Update account
DELETE /accounts/:id        Archive account

GET    /iban                IBAN checker page
POST   /iban/check          Validate & parse IBAN

GET    /bic                 BIC checker page
POST   /bic/check           Validate & parse BIC

GET    /vault               List credential sets
GET    /vault/new           Create credential set form
POST   /vault               Create credential set
GET    /vault/:id           View credential set (masked)
GET    /vault/:id/edit      Edit credential set form
PUT    /vault/:id           Update credential set
DELETE /vault/:id           Delete credential set

GET    /penny-log           List penny test logs (with filters/search/sort)
GET    /penny-log/new       Create log entry form
POST   /penny-log           Create log entry
GET    /penny-log/:id       View log entry detail
GET    /penny-log/:id/edit  Edit log entry form
PUT    /penny-log/:id       Update log entry
DELETE /penny-log/:id       Delete log entry

GET    /json-parser         JSON parser/formatter page
GET    /xml-parser          XML parser/formatter page

GET    /data                Export/import page
POST   /data/export         Export as JSON download
POST   /data/import         Import JSON file
GET    /settings            Settings (alias for /data)
```

### JSON API Routes

```
GET    /api/regions                     List available regions
GET    /api/regions/:code/fields        Field schema for a region
POST   /api/iban/validate               Validate IBAN (JSON)
POST   /api/bic/validate                Validate BIC (JSON)
GET    /api/vault/:id/reveal/:itemId    Decrypt a single secret
GET    /api/search?q=...                Global search across all modules
```

## Supported Regions

Brazil (BR), United States (US), United Kingdom (GB), Mexico (MX), Nigeria (NG), Singapore (SG), Vietnam (VN), SEPA Zone (EUR), Australia (AU), New Zealand (NZ), India (IN), Kenya (KE)

## Testing

```bash
# Run all 503 tests (21 test files)
npm test

# Watch mode
npm run test:watch

# With coverage report (target ≥ 90%)
npm run test:coverage
```

### Test Breakdown

| Suite | File | Tests |
|---|---|---|
| Unit — IBAN | `iban.test.ts` | 41 |
| Unit — BIC | `bic.test.ts` | 44 |
| Unit — Encryption | `encryption.test.ts` | 32 |
| Unit — Region Schemas | `region-schemas.test.ts` | 159 |
| Unit — Export/Import | `export-import.test.ts` | 12 |
| Unit — JSON Parser | `json-parser.test.ts` | 25 |
| Unit — XML Parser | `xml-parser.test.ts` | 24 |
| Unit — Middleware | `middleware.test.ts` | 30 |
| Unit — LEI Lookup | `lei-lookup.test.ts` | 12 |
| Unit — Config | `config.test.ts` | 9 |
| Integration — Accounts | `accounts.test.ts` | 23 |
| Integration — Vault | `vault.test.ts` | 22 |
| Integration — Penny Log | `penny-log.test.ts` | 21 |
| Integration — IBAN Routes | `iban-routes.test.ts` | 8 |
| Integration — BIC Routes | `bic-routes.test.ts` | 9 |
| Integration — Data Routes | `data-routes.test.ts` | 9 |
| Integration — API Routes | `api-routes.test.ts` | 8 |
| Integration — Dashboard | `dashboard.test.ts` | 2 |
| Integration — Error Handling | `error-handling.test.ts` | 5 |
| Integration — JSON Parser Routes | `json-parser-routes.test.ts` | 4 |
| Integration — XML Parser Routes | `xml-parser-routes.test.ts` | 4 |
| **Total** | **21 files** | **503** |

**Line coverage: 92.43%**

## Security

- **Vault secrets encrypted at rest** — AES-256-GCM with random IV per encryption
- **CSRF protection** — Token-based CSRF on all POST/PUT/DELETE routes
- **Input validation** — Zod schemas on every route
- **SQL injection prevention** — All queries via Knex parameterized queries
- **File upload safety** — Extension whitelist (`.pem`, `.crt`, `.cer`, `.p12`, `.pfx`, `.key`, `.jks`), UUID filenames, size limits
- **HTTP security headers** — Helmet middleware
- **Compression** — gzip/deflate via compression middleware
- **Export files contain plaintext secrets** — Handle export JSON files with care

## Optional: BIC/LEI Mapping

The BIC checker supports LEI (Legal Entity Identifier) cross-referencing. To enable:

1. Place a `lei-bic-20260227T000000.csv` file in the project root
2. Run migrations (or restart the server) — the CSV is loaded into the `bic_lei_mappings` table
3. This is optional — the app works without it

## License

ISC
