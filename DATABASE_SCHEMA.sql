-- Database schema for Pottercast voting system

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
  user_name TEXT NOT NULL,
  user_email TEXT,
  predictions JSONB NOT NULL, -- {"אילור": 5.5, "מיכאל": 7.0, ...}
  client_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  server_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
CREATE INDEX idx_votes_predictions ON votes USING gin(predictions);
CREATE INDEX idx_candidates_active ON candidates(is_active) WHERE is_active = true;

-- Row Level Security (RLS)
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;

-- Public read access for candidates
CREATE POLICY "Anyone can view active candidates"
  ON candidates FOR SELECT
  USING (is_active = true);

-- Public insert for votes
CREATE POLICY "Anyone can insert votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Public read for results
CREATE POLICY "Anyone can view results"
  ON results FOR SELECT
  USING (true);

-- Admin policies (you'll need to set up admin role in Supabase)
-- For now, allowing all operations - secure this in Supabase dashboard
CREATE POLICY "Admin can manage candidates"
  ON candidates FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admin can manage results"
  ON results FOR ALL
  USING (true)
  WITH CHECK (true);
