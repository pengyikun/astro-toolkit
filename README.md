# Astro Toolkit

Astro Toolkit is a self-hosted workspace for payment operations and integration testing. It brings account tracking, secure credential storage, validator tools, and lightweight data utilities into one local-first app.

## Features

- Track partner accounts
- Store secrets and certificate files
- Log penny tests
- Validate IBAN and BIC / SWIFT codes
- Format JSON and XML
- Export and import core workspace data
- Optionally browse IMAP mail and WhatsApp chat history
- Support English and Simplified Chinese

## Requirements

- Node.js 20+
- npm

## Quick start

```bash
git clone https://github.com/pengyikun/astro-toolkit.git
cd astro-toolkit
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
On a fresh install, create the first admin account at `/auth`.

## Optional integrations

- Mail: install the [Himalaya CLI](https://github.com/pimalaya/himalaya), then configure IMAP in `/data`
- WhatsApp: run [whatsapp-mcp](https://github.com/lharries/whatsapp-mcp), then point Astro Toolkit to its `messages.db` file in `/data`

## Environment

| Variable | Required | Default | Purpose |
| --- | --- | --- | --- |
| `VAULT_ENCRYPTION_KEY` | Yes | — | 64-character hex key used for vault encryption |
| `DB_PATH` | No | `./db/toolkit.db` | SQLite database path |
| `UPLOAD_DIR` | No | `./storage/uploads` | Private upload directory for certificate material |
| `MAX_FILE_SIZE_MB` | No | `10` | Maximum size for certificate uploads and import files |
| `AUTH_SECRET` | No | `VAULT_ENCRYPTION_KEY` | Session signing secret; set a dedicated value in production |
| `APP_AUTH_DISABLED` | No | `false` | Disable app auth in trusted private environments only |
| `HIMALAYA_BIN` | No | `himalaya` | Optional path to the Himalaya binary |

Keep `UPLOAD_DIR` outside `./public`.
With auth enabled, the first user created at `/auth` becomes an admin.
Mail and WhatsApp settings are saved from `/data`.

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

## Notes

- Secrets are encrypted at rest.
- Admins can access the full workspace. Operators only see their own records.
- Uploaded files stay outside the public web root.
- The database, `.env` files, exports, and uploaded files should be treated as sensitive.

## Testing

```bash
npm run test
npm run typecheck
npm run build
```

Run these before shipping changes.

## License

ISC
