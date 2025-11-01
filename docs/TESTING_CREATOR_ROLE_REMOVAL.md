# Testing Guide - Creator Role Removal

## Prerequisites
- Development server running: `npm run dev`
- Database populated with test data: `npm run db:seed`
- Two test accounts: one in a group, one not in any group

## Test Scenarios

### Test 1: Author Creation by Group Member

**Setup**
1. Create or use an existing user account that is a member of a ScanlationGroup
2. Authenticate (login)

**Execute**
```bash
# Test creating an author as a group member
curl -X POST http://localhost:3000/api/authors/create \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "name": "Test Author",
    "bio": "A test author biography",
    "avatar": "https://ui-avatars.com/api/?name=Test+Author",
    "socialLinks": {
      "twitter": "https://twitter.com/testauthor",
      "instagram": "https://instagram.com/testauthor"
    }
  }'
```

**Expected Result**
```json
{
  "message": "Author created successfully",
  "author": {
    "id": "cuid-string",
    "name": "Test Author",
    "slug": "test-author",
    "bio": "A test author biography",
    "avatar": "https://ui-avatars.com/api/?name=Test+Author",
    "socialLinks": {
      "twitter": "https://twitter.com/testauthor",
      "instagram": "https://instagram.com/testauthor"
    },
    "createdAt": "2025-10-30T...",
    "updatedAt": "2025-10-30T..."
  }
}
```

### Test 2: Author Creation Denied for Non-Group Members

**Setup**
1. Create or use an existing user account that is NOT a member of any ScanlationGroup
2. Authenticate (login)

**Execute**
```bash
# Same API call as Test 1
curl -X POST http://localhost:3000/api/authors/create \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "name": "Another Test Author",
    "bio": "Should fail"
  }'
```

**Expected Result**
```json
{
  "error": "Forbidden - only members of ScanlationGroups can create authors"
}
```
**Status Code**: 403

### Test 3: Creator Studio Access - Group Member

**Setup**
1. Login with a user that is a member of a ScanlationGroup

**Execute**
1. Navigate to `http://localhost:3000/creator`
2. Should load creator dashboard

**Expected Result**
- ✅ Creator studio dashboard loads
- ✅ Navigation menu visible
- ✅ Stats displayed
- ✅ Quick actions available

### Test 4: Creator Studio Access - Non-Group Member

**Setup**
1. Login with a user that is NOT a member of any ScanlationGroup

**Execute**
1. Navigate to `http://localhost:3000/creator`

**Expected Result**
- ❌ 404 Not Found page
- ❌ No access to creator studio

### Test 5: Creator Studio Access - Admin

**Setup**
1. Login with an admin account (regardless of group membership)

**Execute**
1. Navigate to `http://localhost:3000/creator`

**Expected Result**
- ✅ Creator studio dashboard loads (admin override)
- ✅ Full access to creator features

### Test 6: Get Creator Webtoons - Group Member

**Setup**
1. Group member account authenticated
2. User is member of at least one group with associated webtoons

**Execute**
```bash
curl -X GET http://localhost:3000/api/creator/webtoons \
  -H "Cookie: [your-session-cookie]"
```

**Expected Result**
```json
{
  "webtoons": [
    {
      "id": "webtoon-id",
      "title": "Webtoon Title",
      "slug": "webtoon-slug",
      "description": "...",
      "authors": [
        {
          "id": "author-id",
          "name": "Author Name",
          "slug": "author-slug",
          "avatar": "..."
        }
      ],
      "webtoonGroups": [
        {
          "group": {
            "id": "group-id",
            "name": "Group Name"
          }
        }
      ],
      // ... other fields
    }
  ],
  "author": null
}
```

### Test 7: Get Creator Webtoons - Non-Group Member

**Execute**
```bash
curl -X GET http://localhost:3000/api/creator/webtoons \
  -H "Cookie: [your-session-cookie]"
```

**Expected Result**
```json
{
  "webtoons": [],
  "author": null
}
```

### Test 8: Validation - Invalid Author Data

**Execute**
```bash
curl -X POST http://localhost:3000/api/authors/create \
  -H "Content-Type: application/json" \
  -H "Cookie: [your-session-cookie]" \
  -d '{
    "name": "",
    "bio": "x".repeat(3000),
    "avatar": "not-a-url"
  }'
```

**Expected Result**
```json
{
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "message": "String must contain at least 1 character(s)",
      "path": ["name"]
    },
    {
      "code": "too_big",
      "message": "String must contain at most 2000 character(s)",
      "path": ["bio"]
    },
    {
      "code": "invalid_url",
      "message": "Invalid url",
      "path": ["avatar"]
    }
  ]
}
```
**Status Code**: 400

### Test 9: Slug Generation - Uniqueness

**Execute**
1. Create first author with name "John Doe"
2. Create second author with name "John Doe"

**Expected Result**
- First author: slug = "john-doe"
- Second author: slug = "john-doe-abc12" (with random suffix)
- Both authors exist without conflict

### Test 10: Authentication Required

**Execute**
```bash
# No authentication cookie
curl -X POST http://localhost:3000/api/authors/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Author"
  }'
```

**Expected Result**
```json
{
  "error": "Unauthorized - login required"
}
```
**Status Code**: 401

## Database Verification

### Verify Schema Changes
```sql
-- Check Author table structure
DESCRIBE Author;
-- Should NOT have: scanlationGroupId column
```

### Verify Author Independence
```sql
-- Find all authors and their webtoon credits
SELECT 
  a.id, 
  a.name, 
  a.slug, 
  COUNT(wc.id) as credit_count
FROM Author a
LEFT JOIN WebtoonCredit wc ON a.id = wc.authorId
GROUP BY a.id
ORDER BY a.name;
```

### Verify No Group Association
```sql
-- Authors should have no direct relationship with ScanlationGroup
-- This query should return empty if schema change is correct
SELECT a.* 
FROM Author a 
WHERE a.scanlationGroupId IS NOT NULL;
-- Should return: (empty result)
```

## Rollback Testing (if needed)

If you need to test rollback:

1. **Backup current data**
   ```bash
   npm run db:studio  # Export webtoons and authors if needed
   ```

2. **Revert schema**
   ```bash
   git checkout prisma/schema.prisma
   npm run db:push
   ```

3. **Restore AUTHOR role**
   ```bash
   git checkout src/lib/auth/permissions.ts
   npm run db:seed
   ```

## Automation (Jest Testing - Optional)

If you want to set up automated tests:

```typescript
describe('Creator Role Removal', () => {
  describe('POST /api/authors/create', () => {
    it('should create author for group member', async () => {
      // Test implementation
    })

    it('should deny non-group members', async () => {
      // Test implementation
    })

    it('should validate author data', async () => {
      // Test implementation
    })
  })

  describe('Creator Studio Access', () => {
    it('should allow group members', async () => {
      // Test implementation
    })

    it('should deny non-members', async () => {
      // Test implementation
    })

    it('should allow admins', async () => {
      // Test implementation
    })
  })
})
```

## Performance Checks

After deployment, verify:

1. **Author Creation Response Time**
   - Should be < 500ms for typical requests
   - Check database query logs

2. **Creator Dashboard Load Time**
   - Should be < 1s for typical loads
   - Monitor network requests

3. **Group Membership Checks**
   - Cache `isUserInAnyGroup()` result if called frequently
   - Monitor database query count

## Cleanup

After testing, consider:

1. Removing test authors from database
2. Removing test user accounts
3. Resetting database with `npm run db:reset` if needed
4. Verifying no broken references

---

**Test Coverage**: All critical paths
**Estimated Testing Time**: 30-45 minutes
**Last Updated**: October 30, 2025
