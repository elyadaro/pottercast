-- Database schema for Pottercast voting system

-- Users table (authenticated users)
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  phone TEXT,
  full_name TEXT NOT NULL,
  auth_provider TEXT NOT NULL CHECK (auth_provider IN ('google', 'email', 'phone')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT email_or_phone_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
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

-- Votes table
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) NOT NULL,
  predictions JSONB NOT NULL, -- {"אילור": 5.5, "מיכאל": 7.0, ...}
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id) -- Each user can only have one vote
);

-- Results table (actual results set by admin)
CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_name TEXT NOT NULL UNIQUE,
  actual_score NUMERIC(3,1) CHECK (actual_score >= 1 AND actual_score <= 10.5),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_votes_client_timestamp ON votes(client_timestamp);
CREATE INDEX idx_votes_user_id ON votes(user_id);
CREATE INDEX idx_votes_predictions ON votes USING gin(predictions);
CREATE INDEX idx_candidates_active ON candidates(is_active) WHERE is_active = true;
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
  ON users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Public read access for active candidates
CREATE POLICY "Anyone can view active candidates"
  ON candidates FOR SELECT
  USING (is_active = true);

-- Votes policies
CREATE POLICY "Users can view their own votes"
  ON votes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own votes"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own votes"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id);

-- Public read for results
CREATE POLICY "Anyone can view results"
  ON results FOR SELECT
  USING (true);

-- Admin policies (requires admin role metadata in auth.users)
-- Admin can view all users (for admin dashboard)
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Admin can manage candidates
CREATE POLICY "Admins can manage candidates"
  ON candidates FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Admin can view all votes
CREATE POLICY "Admins can view all votes"
  ON votes FOR SELECT
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Admin can manage results
CREATE POLICY "Admins can manage results"
  ON results FOR ALL
  USING ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true)
  WITH CHECK ((auth.jwt() -> 'user_metadata' ->> 'is_admin')::boolean = true);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update updated_at on votes
CREATE TRIGGER update_votes_updated_at BEFORE UPDATE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
