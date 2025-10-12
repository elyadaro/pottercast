# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Pottercast** is a real-time voting/prediction system built with Next.js 15, React 19, TypeScript, and Supabase. Users predict scores (1-10.5) for candidates, with timestamps tracking the first accurate prediction. The system includes basic authentication (email/phone without verification) and an admin dashboard.

**⚡ Performance**: Optimized to handle **300 concurrent users** on free-tier Vercel and Supabase. See [OPTIMIZATION_GUIDE.md](OPTIMIZATION_GUIDE.md) for details.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm lint
```

## Architecture

### Authentication System

**Simple, non-verified authentication** - designed for low-security environments:

- **Email signup**: Uses dummy auto-generated passwords (users don't know them)
- **Phone signup**: Converts phone numbers to email format (`{phone}@pottercast.local`) as a workaround
- **Critical**: Supabase "Confirm Email" setting **must be disabled** for auth to work
- Users can't easily log back in after initial signup (would need to remember auto-generated password)
- "Already voted" login option available for returning users who know their credentials

### Database Schema

The database uses Supabase PostgreSQL with Row Level Security (RLS):

**Key tables:**
- `users` - User profiles (extends `auth.users` with first_name, last_name, phone)
- `candidates` - Candidates available for voting (with is_active flag)
- `votes` - One vote per user containing predictions JSON, client_timestamp (when submit clicked), and server_timestamp
- `results` - Actual scores set by admins (actual_score can be NULL for inactive/empty candidates)

**Vote editing**: The `update_votes_updated_at` trigger automatically updates `updated_at` when votes are modified.

**RLS Policies**: Users can only view/edit their own votes and profiles. Admin operations use the `is_admin()` security definer function to bypass RLS recursion issues (see Database Setup section).

### API Architecture

The app uses Next.js 15 Route Handlers (not Pages Router API routes):

**API routes structure:**
```
app/api/
  auth/
    signin/route.ts      # Email/password login
    signup/route.ts      # User registration with optional admin code
    logout/route.ts      # Sign out
    user/route.ts        # Get current user
    profile/route.ts     # User profile CRUD
  admin/
    check/route.ts       # Verify if user is admin
    candidates/route.ts  # Manage candidates (admin only)
    results/route.ts     # Manage actual scores (admin only)
    votes/route.ts       # View all votes (admin only)
    winner/route.ts      # Find first accurate prediction
  candidates/route.ts    # Public: fetch active candidates
  votes/route.ts         # User's own vote CRUD
```

**Pattern**: All admin routes check `is_admin` field from users table. They use the anon key with RLS policies (not service role).

### Client-Server Architecture

**Supabase clients:**
- `lib/supabase.ts` - Client-side Supabase client
- `lib/supabase-server.ts` - Server-side Supabase client with cookie handling
- `middleware.ts` - Refreshes auth sessions on all routes

**Key pattern**: Vote timestamp is captured **before** authentication modal appears to ensure accurate "first to predict" tracking.

### User Flow

1. User fills predictions on main page
2. Clicks submit → `client_timestamp` saved immediately
3. If not authenticated → `AuthModal` appears
4. User signs up/logs in
5. Vote saved to database with the pre-captured timestamp
6. If user returns → existing vote loaded, edit mode enabled

### Admin Dashboard

Located at `/admin`:
- Toggle candidate active status
- Enter actual results (fields can be left empty - will be saved as NULL)
- Inactive candidates automatically get NULL results
- Find first accurate prediction (compares all votes against non-NULL results)
- View all votes with user contact information

## File Structure

```
app/
   page.tsx           # Main voting page (client component)
   admin/page.tsx     # Admin dashboard (client component)
   login/page.tsx     # Login/signup page with admin code support
   layout.tsx         # Root layout
   api/               # Next.js Route Handlers (see API Architecture)

components/
   AuthModal.tsx      # Multi-mode auth modal (signup/login)
   AuthGuard.tsx      # Route protection component

lib/
   supabase.ts        # Client-side Supabase client
   supabase-server.ts # Server-side Supabase client with connection pooling
   supabase-config.ts # Supabase configuration
   auth.ts            # Auth helper functions
   rate-limit.ts      # Rate limiting utilities
   error-handler.ts   # Error handling with retry logic
   logger.ts          # Monitoring and logging
   vote-queue.ts      # Client-side queue system for vote submissions

middleware.ts                # Session refresh + rate limiting
DATABASE_SCHEMA.sql          # Complete database schema with RLS
FIX_RLS_POLICIES.sql         # RLS policy fixes for infinite recursion
ALLOW_NULL_RESULTS.sql       # Migration to allow NULL in results table
PERFORMANCE_INDEXES.sql      # Performance indexes for 300 users
OPTIMIZATION_GUIDE.md        # Complete optimization guide
DEPLOYMENT_CHECKLIST.md      # Pre-deployment checklist
```

## Important Implementation Details

### Vote Timestamp Handling

The `client_timestamp` is set **before** the auth modal appears (in `handleSubmit`) to preserve the exact moment the user clicked submit. This is critical for determining the winner.

### Queue System for High Load

To handle 300 concurrent users submitting votes simultaneously, the app implements a sophisticated queue system:

**Implementation** (`lib/vote-queue.ts`):
- **Client-side Queue**: Manages vote submissions with intelligent retry logic
- **Persistent Storage**: Queue survives page refresh (stored in localStorage)
- **Exponential Backoff**: Retry delays increase progressively (1s → 2s → 5s → 10s → 30s)
- **Concurrent Management**: Limits to 3 parallel requests to avoid overwhelming the server
- **Real-time Feedback**: Event-driven status updates with Hebrew messages
- **Background Processing**: Queue continues working even if user closes the tab

**User Experience during high load:**
1. Timestamp is captured immediately (before any delays)
2. User sees friendly message: "כולם שולחים עכשיו! הרגע המדויק שלך נשמר..."
3. System automatically retries in background with visual progress indicator
4. No data loss - everything is backed up in localStorage
5. User can close the page - queue continues processing on next visit

### Phone Authentication Workaround

Since there's no SMS provider configured, phone numbers are converted to email addresses:
```typescript
const phoneEmail = `${phone.replace(/\D/g, '')}@pottercast.local`
```

### Predictions Data Structure

Predictions are stored as JSONB in the format:
```json
{
  "אילור": 5.5,
  "מיכאל": 7.0,
  "רוני": 6.5
}
```

### Admin Access

To become an admin, users must visit `/login?code=POTTER2025` and create a new account. The admin code `POTTER2025` is validated during signup, and the user's `is_admin` field is set to `true` upon account creation.

**Important:** Existing users cannot be promoted to admin through the app - only new signups with the correct code.

### Admin Winner Detection

The admin page finds the first accurate prediction by:
1. Fetching all votes ordered by `client_timestamp`
2. Comparing each vote's predictions against results
3. Returning the first vote where all predictions exactly match actual scores

## Database Setup

### Initial Setup
Run the following SQL files **in order** in Supabase SQL Editor:

1. **`DATABASE_SCHEMA.sql`** - Creates the base schema:
   - All tables with proper relationships
   - Triggers for auto-updating timestamps
   - Default candidates
   - Performance indexes

2. **`FIX_RLS_POLICIES.sql`** - Fixes RLS policies:
   - Drops old policies that caused infinite recursion
   - Creates `is_admin()` security definer function
   - Recreates all RLS policies correctly

3. **`ALLOW_NULL_RESULTS.sql`** - (Run if upgrading existing database):
   - Updates CHECK constraint to allow NULL values in results.actual_score
   - Enables admins to clear results for inactive candidates

### RLS Infinite Recursion Issue

**The Problem**: The original admin policies created infinite recursion:
```sql
-- BAD: This causes infinite recursion
CREATE POLICY "admins_select_all_users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users  -- Trying to SELECT from users WITHIN users policy!
      WHERE id = auth.uid() AND is_admin = true
    )
  );
```

**The Solution**: Use a `SECURITY DEFINER` function that runs with elevated privileges:
```sql
-- GOOD: Function runs with elevated privileges, breaking recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now policies can safely use this function
CREATE POLICY "admins_select_all_users"
  ON users FOR SELECT
  USING (auth.uid() = id OR is_admin());
```

This pattern is used throughout all admin-related RLS policies.

## Supabase Configuration

**Required auth settings** (Authentication → Settings):
- ✓ Enable Email Signups
- ✗ **Confirm Email (MUST be disabled!)**
- ✗ Secure Email Change (disabled)
- Site URL: `http://localhost:3000` (dev) or your production domain
- Redirect URLs: `https://your-domain.com/**` (production)

## Environment Variables

Required in `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_POOLER_URL=your-project-url  # Same as NEXT_PUBLIC_SUPABASE_URL for now
```

**Note**: `SUPABASE_POOLER_URL` is used for connection pooling optimization. Currently set to the same URL, but can be configured to use Supabase Transaction Mode pooler (port 6543) if needed.

## RTL Support

The application is in Hebrew (RTL). All UI text and layout should maintain RTL orientation.

## Deployment

Designed for Vercel deployment:
1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Update Supabase Site URL and Redirect URLs to production domain
