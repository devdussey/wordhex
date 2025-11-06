# WordHex Supabase Setup Instructions

## Current Status
- ✅ Tables exist: `player_stats`, `words`, `match_history`
- ❌ Tables are missing columns (need to run full schema script)
- ❌ Sample data needs to be added

## How to Complete Setup (Automated)

### Method 1: Use Supabase Dashboard (RECOMMENDED - 5 minutes)

1. **Go to Supabase Dashboard**
   - Visit: https://app.supabase.com
   - Login with your account

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Copy & Paste the Schema**
   - Open file: `C:\Users\Main User\wordhex\supabase_schema.sql`
   - Copy entire contents
   - Paste into the SQL Editor

4. **Execute**
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for success message: "WordHex Supabase Schema Setup Complete!"

5. **Verify**
   - Run this query in SQL Editor:
     ```sql
     SELECT * FROM words LIMIT 5;
     ```
   - You should see 10+ sample words

---

## How to Complete Setup (Manual Alternative)

If you prefer to set up individual parts:

### Step 1: Recreate the Words Table with Full Schema

In Supabase SQL Editor, run:

```sql
-- Drop old words table
DROP TABLE IF EXISTS words CASCADE;

-- Create new words table with all columns
CREATE TABLE words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  value TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(value)
);

-- Enable RLS
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Anyone can view words"
  ON words
  FOR SELECT
  USING (true);

-- Add sample words
INSERT INTO words (value, hint, difficulty, category) VALUES
  ('PYTHON', 'A popular programming language or a large snake', 'easy', 'programming'),
  ('DATABASE', 'Organized collection of structured data', 'medium', 'technology'),
  ('ALGORITHM', 'Step-by-step procedure for solving a problem', 'hard', 'computer-science'),
  ('JAVASCRIPT', 'Programming language for web browsers', 'medium', 'programming'),
  ('HEXAGON', 'Six-sided polygon shape', 'easy', 'geometry'),
  ('ENCRYPTION', 'Process of encoding data for security', 'hard', 'security'),
  ('VARIABLE', 'Named storage location for data values', 'medium', 'programming'),
  ('LOCALHOST', 'Default network name for your own computer', 'easy', 'networking'),
  ('DEBUGGING', 'Process of finding and fixing code errors', 'hard', 'programming'),
  ('FUNCTION', 'Reusable block of code that performs a task', 'medium', 'programming');
```

### Step 2: Verify Setup

Run this query:
```sql
SELECT COUNT(*) as word_count FROM words;
SELECT * FROM words LIMIT 3;
```

---

## What's in the Full Schema

When you run `supabase_schema.sql`, you get:

**Tables Created:**
- `player_stats` - User game statistics (wins, losses, rating)
- `match_history` - Records of individual matches
- `words` - Word bank for the game (10+ sample words pre-loaded)
- `leaderboard_view` - Auto-ranked player list

**Features Included:**
- UUID primary keys
- Foreign key relationships
- Row Level Security (RLS) policies
- Auto-updating timestamps
- Performance indexes
- Auto-generated leaderboard ranking

**Sample Data:**
- 10 pre-loaded words across multiple categories
- Ready-to-use difficulty levels

---

## Word Bank Table for Gameplay Validation

The front-end now reads the dictionary from a dedicated `word_bank` table (separate from the curated `words` table). To seed it:

1. Open **Table Editor → word_bank → Insert** and add a few sample rows (`word` column only) to confirm access.
2. For quick batches, run:

   ```sql
   INSERT INTO word_bank (word) VALUES
     ('example'),
     ('hexagon'),
     ('victory')
   ON CONFLICT (word) DO NOTHING;
   ```

3. For large dictionaries, use Supabase’s **Import data** flow with a CSV containing a single `word` column, or hit the REST endpoint with batched inserts from a script.

Row Level Security allows anonymous `SELECT` access, while inserts/updates/deletes are restricted to the service role by default. Adjust the policies if you want authenticated players to contribute new words.

---

## After Setup is Complete

Once you've executed the schema:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Visit the app:**
   - Open: http://localhost:5173

3. **Test the features:**
   - ✅ Login with Discord OAuth
   - ✅ View your Dashboard
   - ✅ Play a game (words will load from database)
   - ✅ Check the Leaderboard

---

## Troubleshooting

**If you get "permission denied" errors:**
- Make sure you're logged into Supabase with the correct account

**If words table is empty:**
- Run the INSERT statement from Step 1 above

**If the app still shows errors:**
- Clear browser cache (Ctrl+Shift+Delete)
- Hard refresh (Ctrl+F5)
- Check browser console for error messages

---

## Support

For more help:
- Supabase Docs: https://supabase.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs/

---

**Status:** Ready for manual schema setup in Supabase dashboard
**Time to complete:** ~5 minutes
