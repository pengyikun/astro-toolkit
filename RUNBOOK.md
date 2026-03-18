# Runbook

Day-to-day operations guide for the FinTech PM Toolkit.

## Verify your setup

After starting the app for the first time, try these to confirm everything is working:

1. Open http://localhost:3000 — you should see the dashboard
2. Go to **IBAN Checker** → enter `GB29NWBK60161331926819` → should show "valid"
3. Go to **BIC Checker** → enter `NWBKGB2L` → should show "valid"
4. Go to **Accounts** → click **Create** → pick a region → region-specific fields should appear

## Backing up your data

The database is a single file at `db/toolkit.db`. To back it up, just copy it:

```bash
cp db/toolkit.db db/toolkit-backup-$(date +%Y%m%d).db
```

You can also use the **Export** feature in the app (under `/data`) to download all your data as JSON.

## Deploying to production

Build and start:

```bash
npm run build
npm start
```

Before going live, make sure:

- `VAULT_ENCRYPTION_KEY` is set in your environment
- The database path (`DB_PATH`) points to a persistent, backed-up location
- The upload directory (`public/uploads/certs/`) exists and is writable

## Export and Import

You can export your data from the **Data** page in the app. The export includes accounts, credentials, and penny test logs in a single JSON file.

When importing, data is added alongside existing records — nothing is overwritten. IDs are regenerated automatically, and credentials are re-encrypted with your current vault key.

⚠️ **Export files contain decrypted secrets.** Don't share them or check them into version control.

## Rotating your encryption key

If you need to change your vault encryption key:

1. Export all your data from the app (this decrypts everything)
2. Update `VAULT_ENCRYPTION_KEY` in your `.env` with a new key
3. Clear the existing credentials from the database
4. Import the export file — secrets will be re-encrypted with the new key

**Important:** If you change the key without doing this process first, existing secrets won't be readable. If that happens, restore the original key, export, then rotate.

## Troubleshooting

| Problem | Solution |
|---|---|
| App won't start — "missing VAULT_ENCRYPTION_KEY" | Run `cp .env.example .env` and add your key |
| "VAULT_ENCRYPTION_KEY must be a 64-character hex string" | Generate a new key with the command in the README |
| Database error — "SQLITE_CANTOPEN" | Make sure the `db/` directory exists: `mkdir -p db` |
| Can't decrypt vault secrets | You probably changed the encryption key — see "Rotating your encryption key" above |
| BIC checker doesn't show institution info | Run `npm run migrate` to load the BIC→LEI mapping data |

## Adding a new region

Edit `lib/region-schemas.ts` and add an entry like this:

```typescript
PH: {
  name: 'Philippines',
  currency: 'PHP',
  fields: [
    { key: 'bank_code', label: 'Bank Code', type: 'text', required: true },
    { key: 'account_number', label: 'Account Number', type: 'text', required: true },
    { key: 'beneficiary_name', label: 'Beneficiary Name', type: 'text', required: true },
  ],
},
```

Every region needs at least a `beneficiary_name` field and one account identifier. Once added, it will appear in the region dropdown on the account creation form.
