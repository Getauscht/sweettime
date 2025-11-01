# Migration Progress: Remove Creator-based Management → Group-based Management

## ✅ COMPLETED STEPS

### 1. Database Schema Changes (`prisma/schema.prisma`)
- ✅ Removed `scanlationGroupId` field from `Webtoon` model
- ✅ Removed `scanlationGroup` relation from `Webtoon` model
- ✅ Made `scanlationGroupId` REQUIRED (non-nullable) in `Chapter` model
- ✅ Changed Chapter's `onDelete` to `Restrict` for scanlationGroup
- ✅ Added `WebtoonGroup` junction table with fields:
  - `id`, `webtoonId`, `groupId`, `claimedAt`
  - Unique constraint on `[webtoonId, groupId]`
  - Proper indexes and cascade delete
- ✅ Updated `ScanlationGroup` model:
  - Removed `webtoons` relation (replaced with `webtoonGroups`)
  - Added `webtoonGroups` relation to WebtoonGroup

### 2. RBAC Permission Changes (`src/lib/auth/permissions.ts`)
- ✅ Added `WEBTOONS_MANAGE: 'webtoons.manage'` permission
- ✅ Removed `WEBTOONS_EDIT` from AUTHOR role
- ✅ Removed `WEBTOONS_DELETE` from AUTHOR role (not explicitly in default, but clarified in description)
- ✅ Updated AUTHOR role description: "Can create webtoons and view credits (management by groups only)"
- ✅ Added `WEBTOONS_MANAGE` to MODERATOR role
- ✅ AUTHOR role now only has:
  - WEBTOONS_VIEW
  - WEBTOONS_CREATE
  - AUTHORS_VIEW
  - GENRES_VIEW
  - GROUPS_VIEW
  - GROUPS_UPLOAD

### 3. Data Migration Script (`scripts/migrate-creator-management.ts`)
- ✅ Created comprehensive migration script that:
  - Migrates existing `webtoon.scanlationGroupId` → `WebtoonGroup` table
  - Sets `scanlationGroupId` on chapters from their parent webtoon
  - Detects orphaned chapters (webtoons without groups)
  - Updates RBAC permissions via `initializeRBAC()`
  - Provides clear error messages and next steps
  - Prevents migration if orphaned data exists

## ⏳ REMAINING TASKS

### 4. API Changes - Webtoons

#### `pages/api/admin/webtoons/index.ts`
- [ ] **POST (Create)**: Remove all scanlationGroupId logic
  - Remove from schema validation
  - Remove group membership checks
  - Remove `assignGroupId` logic
  - Simply create webtoon without any group assignment
  - Authors can create freely; groups claim later

- [ ] **PATCH (Edit)**: Change authorization model
  - Remove check for `webtoon.scanlationGroupId`
  - Instead check if user is member of ANY group that has claimed the webtoon (via WebtoonGroup)
  - Use `WEBTOONS_MANAGE` or `GROUPS_UPLOAD` permission
  - Remove ability to change `scanlationGroupId` (doesn't exist anymore)

- [ ] **DELETE**: Update authorization
  - Check WebtoonGroup membership instead of webtoon.scanlationGroupId
  - Require user to be member of at least one group that claimed the webtoon

### 5. API Changes - Chapters

#### `pages/api/admin/chapters/index.ts`
- [ ] **POST (Create)**: Make scanlationGroupId required
  - Get user's group membership
  - Require user to belong to at least one group
  - Set chapter.scanlationGroupId from user's group (or allow selection)
  - Remove dependency on webtoon.scanlationGroupId (doesn't exist)
  - Check if group has claimed the webtoon via WebtoonGroup

- [ ] **PATCH (Edit)**: Restrict to chapter's group
  - Check if user is member of `chapter.scanlationGroupId` (not webtoon's group)
  - Use GROUPS_UPLOAD or WEBTOONS_MANAGE permission

- [ ] **DELETE**: Same as PATCH
  - Restrict to members of chapter.scanlationGroupId

### 6. New API Endpoint

#### `pages/api/admin/webtoons/claim.ts` (NEW FILE)
- [ ] Create POST endpoint for groups to claim webtoons
- [ ] Authorization: User must be member of the group they're claiming for
- [ ] Create WebtoonGroup entry linking group to webtoon
- [ ] Handle duplicate claims (unique constraint)
- [ ] Optionally notify webtoon authors
- [ ] Log activity

#### `pages/api/admin/webtoons/unclaim.ts` (NEW FILE - optional)
- [ ] Allow groups to unclaim webtoons
- [ ] Check permissions (group leaders only?)
- [ ] Delete WebtoonGroup entry

### 7. Upload API Changes

#### `pages/api/upload.ts`
- [ ] Update chapter upload logic (lines 94-125)
- [ ] Remove check for `webtoon.scanlationGroupId` (doesn't exist)
- [ ] Instead check WebtoonGroup to verify group has claimed the webtoon
- [ ] Or allow if user has GROUPS_ASSIGN permission

### 8. UI Components (Creator Studio)

#### `src/app/creator/*` pages
- [ ] Remove webtoon editing UI (buttons, forms)
- [ ] Keep only: creation form, credits list, view mode
- [ ] Show message: "Webtoons are managed by ScanlationGroups. Contact a group to manage this webtoon."
- [ ] Optionally show which groups have claimed each webtoon

### 9. UI Components (Admin Panel)

#### Admin webtoon management
- [ ] Add "Claim Webtoon" button/interface for group members
- [ ] Show list of groups that have claimed each webtoon
- [ ] Allow unclaiming (with proper permissions)

#### Chapter upload UI
- [ ] Add group selector (for users in multiple groups)
- [ ] Show user's available groups
- [ ] Require group selection before chapter upload

### 10. Database Migration Execution

- [ ] **CRITICAL**: Run migration script FIRST
  ```bash
  npx tsx scripts/migrate-creator-management.ts
  ```
- [ ] Fix any orphaned chapters reported by the script
- [ ] Re-run migration script to verify clean state
- [ ] Generate Prisma migration:
  ```bash
  npx prisma migrate dev --name remove-creator-management
  ```
- [ ] Apply to local database:
  ```bash
  npm run db:push
  ```
- [ ] Verify in Prisma Studio:
  ```bash
  npm run db:studio
  ```

### 11. Testing

- [ ] Run linting: `npm run lint`
- [ ] Run typecheck: `npm run typecheck` (will likely show errors until all APIs updated)
- [ ] Manual testing scenarios:
  - [ ] Author creates webtoon (should work)
  - [ ] Author tries to edit webtoon (should fail 403)
  - [ ] Group member claims webtoon
  - [ ] Group member edits claimed webtoon (should work)
  - [ ] Group member creates chapter (with group ID)
  - [ ] Different group member tries to edit chapter (should fail)
  - [ ] Group A tries to edit Group B's chapter (should fail)

### 12. Documentation Updates

- [ ] Update `AGENTS.md` with new management model
- [ ] Create `docs/WEBTOON_MANAGEMENT.md` explaining the new flow
- [ ] Update `docs/TESTING_GUIDE.md` with new test scenarios
- [ ] Update API documentation (if exists)
- [ ] Add migration rollback guide

## CRITICAL DEPENDENCIES

The changes must be done in this order:

1. ✅ Schema + Permission changes (DONE)
2. ✅ Migration script creation (DONE)
3. ⏳ Run migration script on existing data
4. ⏳ Update all APIs to remove scanlationGroupId from Webtoon
5. ⏳ Update all APIs to require scanlationGroupId on Chapter
6. ⏳ Create claim/unclaim APIs
7. ⏳ Generate and apply Prisma migration
8. ⏳ Update UI components
9. ⏳ Testing and validation

## ROLLBACK PLAN

If migration fails or issues are discovered:

1. Revert schema changes in `prisma/schema.prisma`
2. Revert permission changes in `src/lib/auth/permissions.ts`
3. Run `npx prisma migrate dev` to create a rollback migration
4. Or restore database from backup
5. Revert API changes via git

## CURRENT STATE SUMMARY

- Schema is UPDATED but migration NOT applied to database
- Permissions are UPDATED but RBAC not re-initialized
- APIs still use OLD model (will break after migration)
- Migration script is READY to run

## NEXT IMMEDIATE STEPS

1. **Before running migration**: Update all API files to use new model
2. **Then**: Run migration script
3. **Then**: Apply Prisma migration
4. **Then**: Test thoroughly
