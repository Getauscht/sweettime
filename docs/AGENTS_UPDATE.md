# Creator Role Removal Update - AGENTS.md Addition

## New Information for Project Agents

### Recent Changes (October 30, 2025)

The **"AUTHOR" role and creator/author function have been completely removed** from the permission system. Instead of a dedicated role:

- **Any user who is a member of a ScanlationGroup can now create and manage authors**
- Authors are now **independent entities** not tied to any specific group
- Access to Creator Studio is controlled by group membership + admin override

### Key Changes for Development

#### 1. **Author Creation**
- **Old**: Required `role.name === 'author'`
- **New**: Requires `isGroupMember(userId)` check
- **API**: `POST /api/authors/create` (new endpoint, group members only)

#### 2. **Creator Studio Access**
- **Old**: Check for role = 'author' or 'admin'
- **New**: Check `isUserInAnyGroup(userId)` OR role = 'admin'
- **Location**: `src/app/creator/layout.tsx`

#### 3. **Database Schema**
- **Removed**: `scanlationGroupId` field from Author model (Prisma)
- **Kept**: All author-to-webtoon relationships via WebtoonCredit
- **Impact**: No data loss, authors remain usable across all webtoons

#### 4. **Helper Functions**
Use these functions in `src/lib/auth/groups.ts` for permission checks:
```typescript
import { isUserInAnyGroup, isGroupMember, getUserGroups } from '@/lib/auth/groups'

// Check if user can access creator features
const isMember = await isUserInAnyGroup(userId)

// Get all groups a user belongs to
const groups = await getUserGroups(userId)
```

#### 5. **Removed from Codebase**
- `DEFAULT_ROLES.AUTHOR` from permissions.ts
- Permissions: `AUTHORS_CREATE`, `AUTHORS_EDIT`, `AUTHORS_DELETE`
- Auto-author creation logic from `/api/creator/webtoons`

### When Building New Features

**Author Creation/Management**:
- ✅ Use `isGroupMember(userId)` for authorization
- ✅ Call `POST /api/authors/create` endpoint
- ❌ Don't check for role = 'author'
- ❌ Don't expect authors to have scanlationGroupId

**Creator Features**:
- ✅ Require `isUserInAnyGroup(userId) || isAdmin(userId)`
- ✅ Fetch webtoons for user's groups
- ❌ Don't require specific 'author' role
- ❌ Don't check DEFAULT_ROLES.AUTHOR

**Documentation Update**:
- Authors can be created by any group member
- No "Creator Role" anymore - it's now group-based
- Refer users to CREATOR_ROLE_REMOVAL.md for details

### Testing New Features

See `docs/TESTING_CREATOR_ROLE_REMOVAL.md` for comprehensive testing guide.

Quick tests:
```bash
# Create author as group member (should succeed)
POST /api/authors/create

# Access creator studio as group member (should succeed)
GET /creator

# Try to create author as non-member (should return 403)
POST /api/authors/create

# Access creator studio as non-member (should return 404)
GET /creator
```

### Migration Scripts

If modifying author data:
```bash
# Run after schema changes to verify author independence
tsx scripts/migrate-authors-remove-group-link.ts
```

### Related Files

- `docs/CREATOR_ROLE_REMOVAL.md` - Full implementation details
- `CREATOR_ROLE_REMOVAL_QUICK_REF.md` - Quick reference
- `docs/TESTING_CREATOR_ROLE_REMOVAL.md` - Comprehensive testing guide
- `pages/api/authors/create.ts` - New author creation API
- `src/lib/auth/groups.ts` - Group membership helpers

---

**This replaces the older "creator management" system with a more flexible, group-based approach.**
