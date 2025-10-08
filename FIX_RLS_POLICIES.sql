-- Fix for infinite recursion in RLS policies
-- The problem: admin policies were trying to SELECT from users table within users table policies

-- Step 1: Drop all existing policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "admins_select_all_users" ON users;
DROP POLICY IF EXISTS "Anyone can view active candidates" ON candidates;
DROP POLICY IF EXISTS "admins_manage_candidates" ON candidates;
DROP POLICY IF EXISTS "Users can view own vote" ON votes;
DROP POLICY IF EXISTS "Users can insert own vote" ON votes;
DROP POLICY IF EXISTS "Users can update own vote" ON votes;
DROP POLICY IF EXISTS "admins_select_all_votes" ON votes;
DROP POLICY IF EXISTS "Anyone can view results" ON results;
DROP POLICY IF EXISTS "admins_manage_results" ON results;

-- Step 2: Create a security definer function to check if user is admin
-- This function runs with elevated privileges and breaks the recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Recreate all policies with the new function

-- Users policies
CREATE POLICY "users_select_own"
  ON users FOR SELECT
  USING (auth.uid() = id OR is_admin());

CREATE POLICY "users_insert_own"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON users FOR UPDATE
  USING (auth.uid() = id OR is_admin())
  WITH CHECK (
    auth.uid() = id AND
    is_admin = (SELECT is_admin FROM users WHERE id = auth.uid())
  );

-- Candidates policies
CREATE POLICY "candidates_select_all"
  ON candidates FOR SELECT
  USING (true);

CREATE POLICY "admins_manage_candidates"
  ON candidates FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "admins_update_candidates"
  ON candidates FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "admins_delete_candidates"
  ON candidates FOR DELETE
  USING (is_admin());

-- Votes policies
CREATE POLICY "votes_select_own"
  ON votes FOR SELECT
  USING (auth.uid() = user_id OR is_admin());

CREATE POLICY "votes_insert_own"
  ON votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "votes_update_own"
  ON votes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Results policies
CREATE POLICY "results_select_all"
  ON results FOR SELECT
  USING (true);

CREATE POLICY "admins_manage_results"
  ON results FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
