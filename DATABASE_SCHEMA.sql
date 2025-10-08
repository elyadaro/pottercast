-- Database schema for Pottercast voting system

-- NOTE: auth.users table is managed automatically by Supabase Auth
-- We'll extend it with metadata for first_name and last_name

-- Users profile extension (optional, for additional fields)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Candidates table (which candidates are active)
CREATE TABLE candidates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default candidates
INSERT INTO candidates (name, is_active, display_order) VALUES
  ('אילור', true, 1),
  ('מיכאל', true, 2),
  ('רוני', true, 3),
  ('שני', true, 4),
  ('ורד', true, 5);

-- Votes table (one vote per user)
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL UNIQUE, -- one vote per user
  predictions JSONB NOT NULL, -- {"אילור": 5.5, "מיכאל": 7.0, ...}
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL, -- when user clicked submit (before auth)
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Results table (actual results set by admin)
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL UNIQUE,
  actual_score NUMERIC(3,1) CHECK (actual_score >= 1 AND actual_score <= 10.5),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger to auto-update timestamps on vote edit
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_votes_updated_at
  BEFORE UPDATE ON votes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Indexes for performance
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_client_timestamp ON votes(client_timestamp);
CREATE INDEX idx_votes_predictions ON votes USING gin(predictions);
CREATE INDEX idx_candidates_active ON candidates(is_active) WHERE is_active = true;
CREATE INDEX idx_users_id ON users(id);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Users policies
-- 1. Users can view their own profile (including is_admin field)
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- 2. Users can insert their own profile when signing up
-- They can set is_admin during signup (controlled in the app with admin code)
CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 3. Users can update their own profile but cannot change is_admin after creation
CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    is_admin = (SELECT is_admin FROM users WHERE id = auth.uid())
  );

-- Public read access for candidates (including anonymous users)
CREATE POLICY "Anyone can view active candidates"
  ON candidates FOR SELECT
  USING (true);

-- Votes policies
CREATE POLICY "Users can view own vote"
  ON votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vote"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vote"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for results
CREATE POLICY "Anyone can view results"
  ON results FOR SELECT
  USING (true);

-- Admin policies (check is_admin field in users table)
-- 4. Admins can view all users (for admin dashboard)
CREATE POLICY "admins_select_all_users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admins_select_all_votes"
  ON votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admins_manage_candidates"
  ON candidates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "admins_manage_results"
  ON results FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND is_admin = true
    )
  );
