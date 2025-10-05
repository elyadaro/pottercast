-- Database schema for Pottercast voting system

-- NOTE: auth.users table is managed automatically by Supabase Auth
-- We'll extend it with metadata for first_name and last_name

-- Users profile extension (optional, for additional fields)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT,
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
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Public read access for candidates
CREATE POLICY "Anyone can view active candidates"
  ON candidates FOR SELECT
  USING (is_active = true);

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

-- Admin policies (you'll need to set up admin role in Supabase dashboard)
-- For now, allowing all operations via service role
CREATE POLICY "Admin can view all votes"
  ON votes FOR SELECT
  USING (true);

CREATE POLICY "Admin can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage candidates"
  ON candidates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage results"
  ON results FOR ALL
  USING (true)
  WITH CHECK (true);
