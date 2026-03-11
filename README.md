# FinTech PM Toolkit

An internal Node.js web application for fintech product managers who manage cross-border payment integrations. Consolidates five core workflows into one unified interface.

## Features

| Module | Description |
|---|---|
| **Penny Test Account Manager** | Create, store, and manage bank accounts across 12+ regions with region-specific field schemas (PIX keys for Brazil, ABA routing for the US, CLABE for Mexico, Sort Codes for the UK, etc.) |
| **IBAN Validator & Parser** | ISO 13616 validation with MOD-97 check, country-specific BBAN format validation, and structured decomposition (bank, branch, account) for 70+ countries |
| **BIC/SWIFT Validator & Parser** | ISO 9362 validation with institution, country, location, and branch parsing. Detects test BICs, passive participants, and reverse billing |
| **Sandbox Credentials Vault** | Store and organize sandbox API keys, secrets, tokens, and certificate files per partner integration. All secrets encrypted at rest with AES-256-GCM |
| **Penny Test Log** | Record, search, filter, and review penny test payment transactions with structured metadata, status tracking, and linked accounts |

All modules share a **universal JSON export/import system** for data portability.

## Tech Stack

| Layer | Technology |
|---|---|
| Language | TypeScript (strict mode) |
| Runtime | Node.js ≥ 20 LTS |
| Framework | Express.js 5 |
| Database | SQLite via better-sqlite3 |
| Query Builder | Knex.js |
| Frontend | EJS templates + Tailwind CSS (CDN) + Vanilla JS |
| Validation | Zod |
| Testing | Vitest + Supertest |
| Security | Helmet, AES-256-GCM encryption |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — generate a vault key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. Run database migrations
npm run migrate

# 4. Start the development server
npm run dev
```

The app will be available at **http://localhost:3000**.

## Project Structure

```
fintech-pm-toolkit/
├── db/migrations/           # Knex migration files (TypeScript)
├── public/                  # Static assets (CSS, JS, uploads)
├── scripts/                 # CLI scripts (migrate, seed)
├── src/
│   ├── lib/                 # Pure logic (no Express dependency)
│   │   ├── iban.ts          # IBAN validation & parsing
│   │   ├── bic.ts           # BIC/SWIFT validation & parsing
│   │   ├── encryption.ts    # AES-256-GCM encrypt/decrypt
│   │   ├── region-schemas.ts# Region field definitions (12 regions)
│   │   └── export-import.ts # JSON export/import logic
│   ├── models/              # Data access layer (Knex queries)
│   ├── routes/              # Express route handlers
│   ├── middleware/           # Error handler, Zod validator, Multer
│   ├── schemas/             # Zod validation schemas
│   ├── types/               # TypeScript type definitions
│   └── views/               # EJS templates
├── tests/
│   ├── unit/                # Pure function tests
│   ├── integration/         # Route tests via Supertest
│   └── helpers/             # Test DB setup & factories
├── .env.example             # Environment variable template
├── knexfile.ts              # Knex configuration
├── tsconfig.json            # TypeScript configuration
└── vitest.config.ts         # Vitest configuration
```

## NPM Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload (tsx watch) |
| `npm start` | Start production server (requires `npm run build` first) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run migrate` | Run database migrations |
| `npm run seed` | Run database seeds |
| `npm run typecheck` | Type-check without emitting |
| `npm run lint` | Lint source and test files |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Server port (default: `3000`) |
| `NODE_ENV` | No | `development` or `production` (default: `development`) |
| `DB_PATH` | No | SQLite database file path (default: `./db/toolkit.db`) |
| `VAULT_ENCRYPTION_KEY` | **Yes** | 64-character hex string for AES-256-GCM encryption |
| `SESSION_SECRET` | No | Express session secret (default: `change-me-in-production`) |
| `UPLOAD_DIR` | No | File upload directory (default: `./public/uploads`) |
| `MAX_FILE_SIZE_MB` | No | Max upload file size in MB (default: `10`) |

## API Endpoints

### HTML Routes (Server-Rendered)

```
GET    /                    Dashboard
GET    /accounts            List accounts
POST   /accounts            Create account
GET    /accounts/:id        View account
PUT    /accounts/:id        Update account
DELETE /accounts/:id        Archive account
GET    /iban                IBAN checker page
POST   /iban/check          Validate & parse IBAN
GET    /bic                 BIC checker page
POST   /bic/check           Validate & parse BIC
GET    /vault               List credential sets
POST   /vault               Create credential set
GET    /vault/:id           View credential set
PUT    /vault/:id           Update credential set
DELETE /vault/:id           Delete credential set
GET    /penny-log           List penny test logs
POST   /penny-log           Create log entry
GET    /penny-log/:id       View log entry
PUT    /penny-log/:id       Update log entry
DELETE /penny-log/:id       Delete log entry
GET    /data                Export/import page
POST   /data/export         Export as JSON download
POST   /data/import         Import JSON file
```

### JSON API Routes

```
GET    /api/regions                     List available regions
GET    /api/regions/:code/fields        Field schema for a region
POST   /api/iban/validate               Validate IBAN (JSON)
POST   /api/bic/validate                Validate BIC (JSON)
GET    /api/vault/:id/reveal/:itemId    Decrypt a single secret
```

## Supported Regions

Brazil (BR), United States (US), United Kingdom (GB), Mexico (MX), Nigeria (NG), Singapore (SG), Vietnam (VN), SEPA Zone (EUR), Australia (AU), New Zealand (NZ), India (IN), Kenya (KE)

## Testing

```bash
# Run all 353 tests
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

| Suite | Tests | Coverage |
|---|---|---|
| Unit — IBAN | 41 | 100% |
| Unit — BIC | 44 | 100% |
| Unit — Encryption | 32 | 100% |
| Unit — Region Schemas | 159 | 100% |
| Unit — Export/Import | 12 | 98% |
| Integration — Accounts | 14 | — |
| Integration — Vault | 11 | — |
| Integration — Penny Log | 14 | — |
| Integration — IBAN Routes | 8 | — |
| Integration — BIC Routes | 9 | — |
| Integration — Data Routes | 9 | — |

## Security

- **Vault secrets encrypted at rest** — AES-256-GCM with random IV per encryption
- **Input validation** — Zod schemas on every route
- **SQL injection prevention** — All queries via Knex parameterized queries
- **File upload safety** — Extension whitelist, UUID filenames, size limits
- **HTTP security headers** — Helmet middleware
- **Export files contain plaintext secrets** — Handle export JSON files with care

## License

ISC
