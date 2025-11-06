# Quick: Reset Guest Stats

## TL;DR

### Reset ALL Guest Accounts
```sql
UPDATE "UserStats"
SET totalMatches = 0, totalWins = 0, totalScore = 0, totalWords = 0, bestScore = 0, winStreak = 0, bestWinStreak = 0
WHERE "userId" IN (SELECT id FROM "User" WHERE "discordId" IS NULL);
```

### Reset ONE Guest Account
```sql
UPDATE "UserStats"
SET totalMatches = 0, totalWins = 0, totalScore = 0, totalWords = 0, bestScore = 0, winStreak = 0, bestWinStreak = 0
WHERE "userId" = 'USER_ID_HERE';
```

### List All Guest Accounts
```sql
SELECT id, username, "createdAt", "totalMatches"
FROM "User" u
LEFT JOIN "UserStats" s ON u.id = s."userId"
WHERE u."discordId" IS NULL
ORDER BY u."createdAt" DESC;
```

### Delete a Guest Account
```sql
DELETE FROM "User" WHERE id = 'USER_ID_HERE';
```

## How to Run These

### Using Supabase Dashboard
1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. Paste query above
5. Click **Run**

### Using Prisma Studio
```bash
npx prisma studio
# GUI opens at http://localhost:5555
# Edit UserStats directly
```

### Using psql (Command Line)
```bash
psql "postgresql://user:password@db.supabase.co:5432/postgres"
# Then paste SQL commands
```

## Session Persistence

### ✅ YES - Guest sessions persist in browser localStorage

**Stays signed in until:**
- User clears browser cache
- Browser's "Clear Site Data" used
- Manual logout
- 30+ days (if you implement expiration)

### Test This
1. Guest logs in and plays
2. Close browser completely
3. Open browser again
4. ✅ Still signed in with same account!

## Find User ID

### If You Have Username
```sql
SELECT id, username FROM "User" WHERE username = 'Guest-A7k2';
```

### If You Have Email (if set)
```sql
SELECT id, username FROM "User" WHERE email = 'user@example.com';
```

### Last 10 Guests
```sql
SELECT id, username, "createdAt" FROM "User"
WHERE "discordId" IS NULL
ORDER BY "createdAt" DESC
LIMIT 10;
```

## One-Liners

```bash
# Reset all guests via psql
psql "postgresql://..." -c "UPDATE \"UserStats\" SET totalMatches=0, totalWins=0, totalScore=0, totalWords=0, bestScore=0, winStreak=0, bestWinStreak=0 WHERE \"userId\" IN (SELECT id FROM \"User\" WHERE \"discordId\" IS NULL);"

# Count guest accounts
psql "postgresql://..." -c "SELECT COUNT(*) as guest_accounts FROM \"User\" WHERE \"discordId\" IS NULL;"

# Show stats
psql "postgresql://..." -c "SELECT username, totalMatches, totalWins, bestScore FROM \"User\" u LEFT JOIN \"UserStats\" s ON u.id=s.\"userId\" WHERE \"discordId\" IS NULL;"
```

## Danger Zone ⚠️

### Delete ALL Guest Data
```sql
-- This deletes all guest accounts and their data!
DELETE FROM "User" WHERE "discordId" IS NULL;
```

### Reset Everything
```sql
-- Nuclear option: reset ALL users (including Discord)
UPDATE "UserStats" SET totalMatches=0, totalWins=0, totalScore=0, totalWords=0, bestScore=0, winStreak=0, bestWinStreak=0;
```

---

**Full guide**: See `GUEST_ACCOUNT_MANAGEMENT.md`
