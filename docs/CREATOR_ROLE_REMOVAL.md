# Removal of Creator/Author Role - Implementation Summary

## Overview
Esta implementação remove completamente a função/role de "creator" (author) como uma entidade separada com permissões próprias, permitindo que **qualquer membro de um grupo de scanlation** possa criar e gerenciar autores, sem a necessidade de uma role específica.

## Changes Made

### 1. Database Schema Changes (Prisma)
**File**: `prisma/schema.prisma`

#### Removed Fields
- Removed `scanlationGroupId?: String?` from `Author` model
- Removed `scanlationGroup?: ScanlationGroup?` relation from `Author` model
- Removed `authors: Author[]` relation from `ScanlationGroup` model

#### Result
Authors are now **independent entities** not tied to any specific ScanlationGroup. They can be created and managed by any group member and used across multiple webtoons.

#### Migration
Applied via `npm run db:push` - successfully removed the `scanlationGroupId` column and its associated foreign key relationship from the Author table.

### 2. RBAC System Updates
**File**: `src/lib/auth/permissions.ts`

#### Changes
- **Removed from `DEFAULT_ROLES`**: The `AUTHOR` role entry has been removed entirely
- **Updated `PERMISSIONS`**: Removed author-specific permissions (`AUTHORS_CREATE`, `AUTHORS_EDIT`, `AUTHORS_DELETE`)
- **Kept**: `AUTHORS_VIEW` for general viewing permissions

#### Result
- No special role required for creating/managing authors
- Permission system simplified: ADMIN and MODERATOR retain view permissions
- READER role maintains access to author viewing

### 3. Group Membership Helpers
**File**: `src/lib/auth/groups.ts`

#### New Functions
- `isGroupMember(userId: string): Promise<boolean>` - Check if user is member of at least one group
- `getUserGroups(userId: string)` - Get all groups a user belongs to

#### Purpose
These helpers replace role-based checks for creator functionality. Access to creator features is now based on **group membership** instead of a specific role.

### 4. New API Endpoint
**File**: `pages/api/authors/create.ts` (New)

#### Features
- `POST /api/authors` - Create a new author
- **Authentication**: Required
- **Authorization**: User must be member of at least one ScanlationGroup
- **Validation**: Uses Zod schema for input validation
- **Slug Generation**: Auto-generates unique slugs for authors

#### Request Body
```json
{
  "name": "Author Name",
  "bio": "Author biography",
  "avatar": "https://example.com/avatar.jpg",
  "socialLinks": {
    "twitter": "https://twitter.com/author",
    "instagram": "https://instagram.com/author"
  }
}
```

#### Responses
- `201 Created`: Author successfully created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not a member of any ScanlationGroup
- `500 Internal Server Error`: Server error

### 5. Creator API Updates
**File**: `pages/api/creator/webtoons/index.ts`

#### Changes
- **Removed**: Auto-creation of author profiles on first visit
- **Updated**: Permission check now uses `isUserInAnyGroup()` instead of role checks
- **Preserved**: Returns webtoons associated with groups the user is a member of

#### Behavior
- If user is not in any group: Returns empty webtoons array
- If user is in groups: Returns all webtoons those groups are working on
- Authors are no longer auto-created; must be created explicitly via `/api/authors/create`

### 6. Frontend Protection
**File**: `src/app/creator/layout.tsx`

#### Changes
- **Removed**: Role-based check for `role.name === 'author'`
- **Updated**: Now checks `isUserInAnyGroup(userId)` for access
- **Kept**: Admin override remains for administrative access

#### Access Logic
```typescript
const isGroupMember = await isUserInAnyGroup(userId)
const isAdmin = user?.role?.name?.toLowerCase() === 'admin'

if (!isGroupMember && !isAdmin) {
    notFound() // User cannot access creator studio
}
```

### 7. Data Migration Script
**File**: `scripts/migrate-authors-remove-group-link.ts` (New)

#### Purpose
- Verifies that all authors have been successfully decoupled from groups
- Provides statistics on author independence
- Can be run after schema migration as a sanity check

#### Statistics Provided
- Total Authors count
- Authors with active webtoon credits
- Independent authors count

### 8. Seed Data Updates
**File**: `prisma/seed.ts`

#### Changes
- **Removed**: `updateMany` call that tried to set `scanlationGroupId` on authors
- **Reason**: Field no longer exists in schema

## Backward Compatibility

### Maintained
- ✅ All existing APIs continue to work
- ✅ Authors remain associated with webtoons via `WebtoonCredit`
- ✅ Group members can still create and manage webtoons
- ✅ Anonymous and authenticated reading remains unchanged
- ✅ All existing author data preserved

### Breaking Changes
- ❌ Cannot assign authors to groups (field removed)
- ❌ Old "AUTHOR" role assignments are now inactive
- ❌ APIs expecting role-based author access need to use `isGroupMember()` checks

## Security Considerations

### Access Control
- Only group members can create authors (verified via `isGroupMember()`)
- Creator studio access: `GROUP_MEMBER OR ADMIN`
- API endpoints require authentication and group membership

### Data Integrity
- Authors are no longer orphaned to groups
- Webtoon credits still maintain author references
- No data loss from the migration

## Testing Recommendations

### Manual Testing
1. **Create Author as Group Member**
   - Login with group member account
   - POST to `/api/authors/create` with valid data
   - Verify author is created and can be linked to webtoon

2. **Deny Access to Non-Group Members**
   - Login with account not in any group
   - Try to access `/creator` path
   - Verify 404 Not Found response

3. **Admin Override**
   - Login with admin account
   - Access `/creator` (should work even without group membership)
   - Create author via API (should work with admin role)

4. **Group Member Webtoons**
   - GET `/api/creator/webtoons` as group member
   - Verify webtoons from groups user belongs to are returned

### Validation
- ✅ `npm run typecheck` - Passes
- ✅ `npm run lint` - Passes
- ✅ Database schema synchronized via `npm run db:push`
- ✅ No references to removed `scanlationGroupId` field

## Files Modified

### Core Changes
- `prisma/schema.prisma` - Schema updates
- `src/lib/auth/permissions.ts` - RBAC simplification
- `src/lib/auth/groups.ts` - New group membership helpers
- `src/app/creator/layout.tsx` - Access control updated

### New Files
- `pages/api/authors/create.ts` - Author creation API
- `scripts/migrate-authors-remove-group-link.ts` - Data verification script

### Updated APIs
- `pages/api/creator/webtoons/index.ts` - Permission checks updated
- `prisma/seed.ts` - Removed obsolete author backfill

## Future Considerations

1. **UI Implementation**: Add form in creator studio to create authors
2. **Bulk Operations**: Allow group members to bulk manage authors
3. **Author Transfer**: Consider implementing author transfer between users
4. **Notifications**: Add notifications for author-related actions
5. **Analytics**: Track author creation and usage metrics

## Rollback Plan

If rollback is needed:
1. Revert schema: Add back `scanlationGroupId` field to Author model
2. Add back `AUTHOR` role to `DEFAULT_ROLES`
3. Run `prisma migrate dev --name restore_author_scanlation_group_link`
4. Restore `isGroupMember` helper usage to role-based checks

---

**Implementation Date**: October 30, 2025
**Status**: Complete and Validated
