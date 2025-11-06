# Guest Account Management Guide

## Overview

Guest accounts (non-Discord users) in WordHex are identified by usernames like **`Player-xxxx`** or **`Guest-xxxx`**. This guide explains how they work and how to manage their stats.

## How Guest Accounts Work

### Account Creation
When a user plays without Discord login:
1. A new **User** is created with a random username
2. No `discordId` is stored (remains NULL)
3. A **UserStats** record is created automatically
4. User is assigned a unique ID in the database

### Username Format
Guest accounts get auto-generated names:
- **Format**: `Guest-XXXX` (4 random characters)
- **Example**: `Guest-A7k2`, `Guest-F9xB`
- **Old format**: `Player-XXXX` (still supported)

### Session Storage
When logged in, the token is stored in **localStorage**:
```javascript
// Stored as JSON in browser's localStorage
{
  token: "user-id-uuid",
  username: "Guest-A7k2",
  discordId: null,
  ...
}
```

## Will the Account Stay Signed In?

### ✅ YES - Default Behavior
```
Guest logs in → Token stored in localStorage
                     ↓
            Closes browser/tab
                     ↓
            Opens app again
                     ↓
            Token still in localStorage
                     ↓
            ✅ User is still signed in
```

**Session persists until:**
- User manually clears browser cache/localStorage
- Browser's "Clear Site Data" is used
- 30+ days pass (optional expiration - currently not implemented)
- User explicitly logs out

### Example Timeline
```
Mon 10:00 AM - Guest creates account, plays 3 games
Mon 10:30 AM - Closes browser
Mon 3:00 PM  - Opens app again → ✅ Same account, same stats
Tue 9:00 AM  - Still signed in → ✅ Persistent session
```

## How to Reset Guest Stats

### Option 1: Database Query (Direct)

**Reset one guest user's stats:**
```sql
UPDATE "UserStats"
SET totalMatches = 0,
    totalWins = 0,
    totalScore = 0,
    totalWords = 0,
    bestScore = 0,
    winStreak = 0,
    bestWinStreak = 0
WHERE userId = 'USER_ID_HERE';
```

**Reset all guest users (non-Discord):**
```sql
UPDATE "UserStats"
SET totalMatches = 0,
    totalWins = 0,
    totalScore = 0,
    totalWords = 0,
    bestScore = 0,
    winStreak = 0,
    bestWinStreak = 0
WHERE userId IN (
  SELECT id FROM "User" WHERE "discordId" IS NULL
);
```

### Option 2: Using Prisma CLI

**Reset specific user:**
```bash
npx prisma studio
# 1. Navigate to UserStats
# 2. Find the user
# 3. Edit and save
```

### Option 3: Admin API Endpoint (Recommended)

Create a new endpoint for admin purposes:

```javascript
// In api/index.js
app.post('/api/admin/reset-stats/:userId', async (req, res) => {
  try {
    // Verify admin password/token
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { userId } = req.params;

    // Reset stats
    const stats = await prisma.userStats.update({
      where: { userId },
      data: {
        totalMatches: 0,
        totalWins: 0,
        totalScore: 0,
        totalWords: 0,
        bestScore: 0,
        winStreak: 0,
        bestWinStreak: 0,
      },
    });

    res.json({ message: 'Stats reset', stats });
  } catch (error) {
    console.error('Reset stats error:', error);
    res.status(500).json({ error: 'Failed to reset stats' });
  }
});
```

## How to Delete a Guest Account

### Option 1: Delete via Database
```sql
-- Find guest users
SELECT id, username FROM "User" WHERE "discordId" IS NULL ORDER BY "createdAt" DESC;

-- Delete specific user (this will cascade delete all related data)
DELETE FROM "User" WHERE id = 'USER_ID_HERE';
```

### Option 2: Delete via Prisma
```bash
npx prisma studio
# 1. Go to User
# 2. Find the guest account
# 3. Delete the record (cascades to UserStats, LobbyPlayer, etc.)
```

### What Gets Deleted (Cascade)
When you delete a User, these also get deleted:
- ✅ UserStats
- ✅ LobbyPlayer records
- ✅ MatchPlayer records
- ✅ Sessions
- ✅ MatchmakingEntry
- ❌ Lobbies (stays, but without the player)
- ❌ Matches (stays, but without the player)

## Viewing Guest Account Stats

### In Supabase Dashboard
1. Go to https://app.supabase.com
2. Project → SQL Editor
3. Run query:
```sql
SELECT
  u.id,
  u.username,
  u."discordId",
  u."createdAt",
  s.totalMatches,
  s.totalWins,
  s.bestScore,
  s.totalScore
FROM "User" u
LEFT JOIN "UserStats" s ON u.id = s."userId"
WHERE u."discordId" IS NULL
ORDER BY u."createdAt" DESC;
```

### Using API
```bash
curl -H "Authorization: Bearer TOKEN" \
  https://wordhex-sigma.vercel.app/api/stats/USER_ID
```

## Managing Session Duration

### Current Implementation
- Sessions persist indefinitely in localStorage
- No automatic expiration

### Option: Add Session Expiration

**Add to User model (prisma/schema.prisma):**
```prisma
model User {
  // ... existing fields
  lastLoginAt DateTime @default(now()) @updatedAt
  sessionExpiresAt DateTime?
}
```

**Check on login (in frontend):**
```typescript
if (profile.sessionExpiresAt && new Date() > new Date(profile.sessionExpiresAt)) {
  // Session expired, clear localStorage and require re-login
  localStorage.removeItem('wordhex_profile');
  window.location.reload();
}
```

**Generate expiration on server:**
```javascript
app.post('/api/auth/guest', async (req, res) => {
  const user = await createGuestUser();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  res.json({
    token: user.id,
    user,
    sessionExpiresAt: expiresAt.toISOString()
  });
});
```

## Identifying Guest vs Discord Users

### In Database
```sql
-- Discord users
SELECT * FROM "User" WHERE "discordId" IS NOT NULL;

-- Guest users
SELECT * FROM "User" WHERE "discordId" IS NULL;
```

### In Code
```javascript
// Check if Discord user
if (user.discordId) {
  // Discord authenticated
} else {
  // Guest account
}
```

### In Frontend
```typescript
const isDis cordUser = !!user.discordId;
const isGuest = !user.discordId;
```

## Security Considerations

### Risks of Persistent Guest Sessions
⚠️ **Token Theft**: If device is compromised, attacker can use the token
⚠️ **No Re-authentication**: No password to re-verify identity
⚠️ **Data Loss**: Clearing cache loses session permanently

### Recommendations
✅ Display warning: "Guest account - not backed up"
✅ Suggest Discord login to save progress
✅ Option to set password later
✅ Regular backup prompts

### Implementation
```typescript
// Show warning for guest users
{isGuest && (
  <div className="alert alert-warning">
    ⚠️ Guest Account - Your progress is only saved locally.
    <a href="/auth/discord">Connect Discord</a> to backup your account.
  </div>
)}
```

## Bulk Operations

### Export all guest stats to CSV
```sql
COPY (
  SELECT
    u.id,
    u.username,
    u."createdAt",
    s.totalMatches,
    s.totalWins,
    s.bestScore
  FROM "User" u
  LEFT JOIN "UserStats" s ON u.id = s."userId"
  WHERE u."discordId" IS NULL
) TO STDOUT WITH CSV HEADER;
```

### Delete inactive guest accounts (90+ days)
```sql
DELETE FROM "User"
WHERE "discordId" IS NULL
AND "createdAt" < NOW() - INTERVAL '90 days';
```

## FAQ

### Q: Will a guest account be linked to Discord later?
**A**: Yes! When a guest user links Discord, the account is updated with `discordId`. The stats remain.

```javascript
// Linking example
const user = await prisma.user.update({
  where: { id: guestId },
  data: { discordId: discordId }
});
```

### Q: Can a guest account use the same username as Discord user?
**A**: Yes, usernames are NOT unique. Identification is by `id` (UUID).

### Q: What if localStorage is cleared?
**A**: User loses access to that account unless they save the User ID somewhere. No recovery mechanism currently.

**Solution**: Implement email backup option for guests:
```javascript
app.post('/api/guest/set-email', async (req, res) => {
  const { userId, email } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { email }
  });

  // Send email with recovery link
  // ...
});
```

### Q: Can a guest upgrade to Discord without losing stats?
**A**: Yes! Link Discord account to guest account:

```javascript
app.post('/api/auth/link-discord', async (req, res) => {
  const { userId, discordId } = req.body;

  const user = await prisma.user.update({
    where: { id: userId },
    data: { discordId }
  });

  res.json({ message: 'Account linked', user });
});
```

## Implementation Checklist

- [ ] Display "Guest Account" badge in UI
- [ ] Show persistent session status
- [ ] Implement session expiration (optional)
- [ ] Add "Link Discord" option for guests
- [ ] Create admin endpoint to reset stats
- [ ] Monitor guest account growth
- [ ] Implement email backup option
- [ ] Add account recovery system

---

**Last Updated**: November 6, 2024
**Status**: Production Ready
