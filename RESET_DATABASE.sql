-- Reset and recreate database with correct RLS policies
-- Run this ENTIRE script in Supabase SQL Editor to fix permissions

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Admin can view all users" ON users;
DROP POLICY IF EXISTS "Admin can view all votes" ON votes;
DROP POLICY IF EXISTS "Admin can manage candidates" ON candidates;
DROP POLICY IF EXISTS "Admin can manage results" ON results;

-- Drop existing policies with new names (in case they exist)
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "admins_select_all_users" ON users;
DROP POLICY IF EXISTS "admins_select_all_votes" ON votes;
DROP POLICY IF EXISTS "admins_manage_candidates" ON candidates;
DROP POLICY IF EXISTS "admins_manage_results" ON results;

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

-- Verify policies were created
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('users', 'votes', 'candidates', 'results')
ORDER BY tablename, policyname;
