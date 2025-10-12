-- =====================================================
-- PERFORMANCE INDEXES FOR POTTERCAST
-- =====================================================
-- Purpose: Optimize database queries for 300 concurrent users
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- Index for votes by user_id
-- Used in: /api/votes GET (getUserVote)
-- Benefit: Fast lookup of existing votes when users return
CREATE INDEX IF NOT EXISTS idx_votes_user_id
ON votes(user_id);

-- Index for votes by client_timestamp
-- Used in: /api/admin/winner (finding first accurate prediction)
-- Benefit: Fast sorting by timestamp to determine winner
CREATE INDEX IF NOT EXISTS idx_votes_client_timestamp
ON votes(client_timestamp DESC);

-- Index for active candidates
-- Used in: /api/candidates (loading candidate list)
-- Benefit: Fast filtering of active candidates only
CREATE INDEX IF NOT EXISTS idx_candidates_active
ON candidates(is_active, display_order)
WHERE is_active = true;

-- Index for admin users
-- Used in: Admin dashboard queries
-- Benefit: Fast filtering of admin operations
CREATE INDEX IF NOT EXISTS idx_users_admin
ON users(is_admin)
WHERE is_admin = true;

-- Composite index for votes with user info
-- Used in: /api/admin/votes (fetching all votes with user details)
-- Benefit: Optimizes JOIN between votes and users
CREATE INDEX IF NOT EXISTS idx_votes_user_composite
ON votes(user_id, client_timestamp DESC, server_timestamp DESC);

-- =====================================================
-- VERIFY INDEXES
-- =====================================================
-- Run this to see all indexes on the votes table:
-- SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'votes';

-- Run this to see query performance:
-- EXPLAIN ANALYZE SELECT * FROM votes WHERE user_id = 'some-uuid';
