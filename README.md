# FinTech PM Toolkit

A self-hosted toolkit for fintech product managers working on cross-border payment integrations. Keep your test accounts, sandbox credentials, IBAN/BIC validation, and penny test tracking in one place.

## Features

- **Test Account Registry** — Manage bank accounts across 12 regions with the right fields for each (PIX keys, ABA routing, CLABE, Sort Codes, and more)
- **IBAN Validator** — Validate and parse IBANs for 70+ countries
- **BIC/SWIFT Checker** — Validate BIC codes and look up the issuing institution via LEI
- **Credentials Vault** — Store sandbox API keys, secrets, and certificates with encryption at rest
- **Penny Test Log** — Record and search test payments, inspect request/response payloads
- **JSON / XML Parsers** — Paste or upload API payloads to format, validate, and visually explore them

All data can be exported and imported as JSON, so you can back up or move between machines easily.

## Getting started

You'll need [Node.js](https://nodejs.org/) 20 or later.

```bash
git clone https://github.com/pengyikun/fintech-pm-toolkit.git
cd fintech-pm-toolkit
npm install
```

Create your config file and generate an encryption key for the credentials vault:

```bash
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Paste the generated key into `.env` as the value for `VAULT_ENCRYPTION_KEY`.

Set up the database and start the app:

```bash
npm run migrate
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you're ready to go.

## Configuration

The only required setting is the vault encryption key. Everything else has sensible defaults.

| Setting | Required | Default | What it does |
|---|---|---|---|
| `VAULT_ENCRYPTION_KEY` | **Yes** | — | Encrypts credentials stored in the vault |
| `PORT` | No | `3000` | Port the app runs on |
| `DB_PATH` | No | `./db/toolkit.db` | Where the database file is stored |
| `UPLOAD_DIR` | No | `./public/uploads` | Where uploaded certificates are saved |
| `MAX_FILE_SIZE_MB` | No | `10` | Max upload size in MB |

## Security

- Vault secrets are encrypted at rest (AES-256-GCM) — they're never stored in plaintext
- All user inputs are validated before processing
- Database queries are parameterized to prevent injection
- Uploaded files are renamed and restricted by extension
- **Exported JSON files contain decrypted secrets** — treat them carefully and don't commit them to version control

## Running tests

```bash
npm test
```

Tests run against an in-memory database, so there's nothing extra to set up.

## License

ISC
