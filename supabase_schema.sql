-- WordHex Database Schema Setup
-- This file contains all SQL statements to set up the Supabase database

-- 1. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  display_name TEXT,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  rating INTEGER DEFAULT 1000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(user_id)
);

-- 3. Create match_history table
CREATE TABLE IF NOT EXISTS match_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  opponent_id UUID,
  result TEXT CHECK (result IN ('win', 'loss', 'draw')),
  score INTEGER DEFAULT 0,
  opponent_score INTEGER DEFAULT 0,
  word_guessed TEXT,
  guesses_count INTEGER DEFAULT 0,
  game_mode TEXT DEFAULT 'practice',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT fk_opponent_id FOREIGN KEY (opponent_id) REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 4. Create words table
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  value TEXT NOT NULL,
  hint TEXT,
  difficulty TEXT DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  category TEXT DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(value)
);

-- 5. Create leaderboard table (view based on player_stats)
-- Using a materialized view for better performance
CREATE OR REPLACE VIEW leaderboard_view AS
SELECT
  ROW_NUMBER() OVER (ORDER BY rating DESC, wins DESC) as rank,
  id,
  user_id,
  display_name,
  wins,
  losses,
  total_games,
  rating,
  created_at,
  updated_at
FROM player_stats
WHERE total_games > 0
ORDER BY rating DESC, wins DESC;

-- 6. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_player_stats_user_id ON player_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_user_id ON match_history(user_id);
CREATE INDEX IF NOT EXISTS idx_match_history_opponent_id ON match_history(opponent_id);
CREATE INDEX IF NOT EXISTS idx_match_history_created_at ON match_history(created_at);
CREATE INDEX IF NOT EXISTS idx_words_difficulty ON words(difficulty);
CREATE INDEX IF NOT EXISTS idx_words_category ON words(category);

-- 7. Create functions for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_player_stats_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create trigger for player_stats updated_at
DROP TRIGGER IF EXISTS player_stats_update_timestamp ON player_stats;
CREATE TRIGGER player_stats_update_timestamp
  BEFORE UPDATE ON player_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_player_stats_timestamp();

-- 9. Insert sample words for testing
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
  ('FUNCTION', 'Reusable block of code that performs a task', 'medium', 'programming')
ON CONFLICT (value) DO NOTHING;

-- 10. Create Row Level Security (RLS) policies
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE words ENABLE ROW LEVEL SECURITY;

-- Players can only read all player stats (for leaderboard)
CREATE POLICY "Anyone can view player_stats"
  ON player_stats
  FOR SELECT
  USING (true);

-- Players can only update their own stats
CREATE POLICY "Users can update own player_stats"
  ON player_stats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Players can create their own stats
CREATE POLICY "Users can create own player_stats"
  ON player_stats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Players can view their own match history
CREATE POLICY "Users can view own match_history"
  ON match_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- Players can insert their own match history
CREATE POLICY "Users can insert own match_history"
  ON match_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Anyone can view words
CREATE POLICY "Anyone can view words"
  ON words
  FOR SELECT
  USING (true);

-- Authenticated users can insert words (optional, for testing)
-- Remove this if only admin should insert words
CREATE POLICY "Authenticated users can insert words"
  ON words
  FOR INSERT
  WITH CHECK (true);

-- Authenticated users can update words (optional, for testing)
-- Remove this if only admin should update words
CREATE POLICY "Authenticated users can update words"
  ON words
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Print success message
SELECT 'WordHex Supabase Schema Setup Complete!' as status;
