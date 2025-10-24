# Applied Zod Validation and Transaction Changes

This document summarizes the changes made across the `pages/api` handlers to improve input validation with Zod and to make multi-step database writes atomic using Prisma transactions. It also lists example schemas used and recommended next steps.

Date: 2025-10-13

## Goals
- Ensure endpoints that accept JSON payloads validate inputs with Zod and return consistent 400 responses with structured error details.
- Convert multi-step flows (create -> createMany -> activityLog, create favorite -> increment likes, update -> related deletes/creates) to use interactive Prisma transactions so partial writes cannot occur.
- Ensure activity logs are created in the same transaction and use the authenticated user ID provided by `withPermission`/`withAuth`.

---

## Files changed (high level)
- pages/api/admin/users/index.ts
  - Updated PATCH handler to accept the handler context `(req, { userId })` and use `userId` as `performedBy` inside `prisma.$transaction`.
  - Validation: Zod safeParse present and used.
  - Atomic update + activityLog.

- pages/api/admin/seed-admin.ts
  - Added Zod validation for optional seed payload (email, password, name).

- (Earlier work in this session — already applied)
  - pages/api/comments/index.ts — added Zod validation for comment creation.
  - pages/api/upload.ts — hardened upload handling (mime/type checks, temp cleanup, whitelist).
  - pages/api/webtoons/[webtoonId]/favorite.ts — made create/delete + increment/decrement atomic with transactions.
  - pages/api/admin/webtoons/index.ts — Zod validation and interactive transactions for POST/PATCH; created activity logs in transaction.
  - pages/api/notifications/index.ts — Zod validation for PATCH/DELETE.
  - pages/api/admin/roles/*, pages/api/admin/genres/*, pages/api/admin/authors/*, pages/api/admin/chapters/index.ts — added Zod and transaction patterns.

> Note: The above list is a high-level summary. The precise file diffs are in the Git working tree (edits applied during this session).

---

## Representative Zod schemas used

- Create webtoon (`pages/api/admin/webtoons/index.ts` POST):

```ts
const bodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  authorIds: z.array(z.string()).min(1),
  artistIds: z.array(z.string()).optional(),
  genreIds: z.array(z.string()).optional(),
  coverImage: z.string().optional(),
  status: z.string().optional(),
})
```

- Create chapter (`pages/api/admin/chapters/index.ts` POST):

```ts
const schema = z.object({
  webtoonId: z.string().min(1),
  number: z.number().int().positive(),
  title: z.string().optional(),
  content: z.any().optional(),
})
```

- Update user (admin PATCH):

```ts
const schema = z.object({
  userId: z.string().min(1),
  name: z.string().optional(),
  email: z.string().email().optional(),
  roleId: z.string().optional(),
  status: z.string().optional(),
})
```

- Seed admin payload:

```ts
const schema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  name: z.string().optional(),
})
```

- Notifications PATCH / DELETE (representative):

```ts
const patchSchema = z.object({ ids: z.array(z.string()).min(1) })
const deleteSchema = z.object({ ids: z.array(z.string()).min(1) })
```

---

## Transaction patterns used
- For flows where the newly created entity's id is used to create related rows and to write an activity log, we used an interactive transaction:

```ts
await prisma.$transaction(async (tx) => {
  const item = await tx.entity.create({ data: {...} })
  if (related && related.length) await tx.related.createMany({ data: ... })
  await tx.activityLog.create({ data: { action: 'created', entityId: item.id, performedBy: userId } })
  return item
})
```

- For toggle operations (favorite/unfavorite) that must update a related counter (likeCount), we used a transaction with either create + increment or delete + decrement.

---

## Verification performed
- Searched repository for `await req.json()` and `req.body` usages and applied Zod where needed.
- Confirmed `withPermission` passes `{ userId, session }` as the second parameter to handlers in `src/lib/auth/middleware.ts`.
- Replaced `(req as any).userId` with the context `userId` where appropriate.
- Ran static/type checks on changed files (get_errors) — no errors reported.

---

## Recommendations / Next steps
1. Run runtime integration tests locally (recommended):
   - Start the dev server and exercise endpoints with a seeded test DB.
   - Validate upload flow end-to-end (file conversion + storage) in a test environment.

2. Add automated tests:
   - Unit tests for small helpers and validation.
   - Integration tests for key admin flows (create webtoon, create chapter, update user).

3. Centralized error logging & monitoring for production (Sentry or similar) — ensure activity logging failures are non-fatal or handled per policy.

4. Consider extracting common request validation helpers to reduce boilerplate (small helper that wraps handler and zod schema to return 400 automatically).

5. Security improvements applied in this session

- TOTP secrets are no longer stored in plaintext. The application now uses AES-256-GCM encryption for totp secrets at rest. A new environment variable `APP_TOTP_KEY` (base64-encoded 32 bytes) is required in production; prefer a KMS-backed key for automatic rotation.
- The TOTP setup flow was changed to use a temporary encrypted secret (`totpTempSecretEncrypted`) with a short expiry (10 minutes). The secret is promoted to permanent (`totpSecretEncrypted`) only after successful verification. This prevents orphaned plaintext secrets in the database.
- Password reset tokens are no longer stored in plaintext. The server stores a sha256 token hash (`tokenHash`) and sends the raw token via email. Reset verification computes sha256(token) and looks up the hashed value.

Migration note: Prisma schema was extended with `totpSecretEncrypted`, `totpTempSecretEncrypted`, `totpTempExpires` on `User` and `tokenHash` on `PasswordReset`. Apply `prisma migrate dev` or `prisma db push` and ensure environment variable `APP_TOTP_KEY` is set before enabling TOTP functionality.

---

If you want, I can now:
- Create a small test suite to validate the most critical endpoints (seed + create webtoon + create chapter + update user) using a test DB (I can scaffold tests and run them locally if you give me permission to create a temporary test DB or use sqlite). 
- Or prepare a PR-style diff / commit message with the changes grouped.

Let me know which follow-up you'd prefer and I'll proceed.
