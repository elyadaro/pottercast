-- Grant permissions to anon and authenticated roles
-- Run this in Supabase SQL Editor

-- Schema access
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Candidates table - anonymous read access
GRANT SELECT ON candidates TO anon;
GRANT SELECT ON candidates TO authenticated;

-- Results table - anonymous read access (for future use)
GRANT SELECT ON results TO anon;
GRANT SELECT ON results TO authenticated;

-- Users table - authenticated users can read and insert their own profiles
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Votes table - authenticated users can read, insert, and update their own votes
GRANT SELECT, INSERT, UPDATE ON votes TO authenticated;

-- Allow authenticated users to read from auth.users (needed for joins)
-- Note: This might require superuser privileges, handle carefully
-- If this fails, the app should still work with the RLS policies
