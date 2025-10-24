# TOTP Secret Migration

This document explains how to migrate existing `User.totpSecret` values (stored in plaintext) to the new encrypted field `totpSecretEncrypted`.

Prerequisites
- Set `APP_TOTP_KEY` in environment to a base64 32-byte key (or use the same key used to encrypt previously, if any).
- Ensure you have a current DB backup.

Steps
1. Run the migration script locally (will only run where `APP_TOTP_KEY` is set):

```bash
# from repo root
APP_TOTP_KEY=... npx tsx scripts/migrate-totp-secrets.ts
```

2. Verify a sample of users in the DB have `totpSecretEncrypted` populated and `totpSecret` set to `NULL`.

3. If everything looks good, deploy the new code to staging/production and monitor logs.

Notes
- If you do not know the previous encryption key used for any stored plaintext secrets, those secrets cannot be recovered; instead you should clear them and require users to re-enroll for TOTP.
- This script will attempt to encrypt and null the plaintext field. It logs failures per user and continues.
