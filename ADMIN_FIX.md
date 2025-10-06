# Admin Login Fix

## Issue Found
The admin login was failing with a **403 Forbidden error** when trying to update the `is_admin` field in the database. This was due to Row Level Security (RLS) policies blocking client-side updates to the `is_admin` column (for security reasons).

## Solution Implemented
Created a server-side API route (`/api/set-admin`) that uses the Supabase service role key to bypass RLS and securely set the admin status.

### Files Modified:
1. **app/api/set-admin/route.ts** (NEW)
   - Server-side API endpoint that validates admin code
   - Uses service role key to bypass RLS
   - Securely updates `is_admin` field in database

2. **app/login/page.tsx** (UPDATED)
   - Changed from direct database update to API call
   - Now calls `/api/set-admin` endpoint with admin code and user ID

## Required Action
**You MUST add the Supabase Service Role Key to your environment variables:**

1. Go to **Supabase Dashboard** → **Project Settings** → **API**
2. Copy the `service_role` key (marked as "secret" - it's different from the anon key)
3. Add to `.env.local`:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
4. **Restart the dev server** after adding the key

## Security Note
The service role key bypasses ALL RLS policies, so:
- Never expose it to the client
- Only use it in server-side code (API routes)
- Keep it secret (in .env.local, which should be in .gitignore)

## Testing After Fix
Once you add the service role key and restart:
1. Go to `/login?code=POTTER2025`
2. Enter email and password
3. Should successfully create admin user and redirect to `/admin`

