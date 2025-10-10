// Runtime config with hardcoded fallbacks for mobile caching issues
// This ensures values are always available even if env vars fail to load

const getSupabaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hardcodedUrl = 'https://kfhqutyerebbwjxgtqem.supabase.co';

  // Check if env var is truly valid (not empty, not just whitespace, proper format)
  if (!envUrl || envUrl.trim() === '' || !envUrl.startsWith('http')) {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL invalid or empty, using fallback');
    return hardcodedUrl;
  }

  // Validate length matches expected Supabase URL format
  if (envUrl.length !== 40) {
    console.warn(`⚠️ NEXT_PUBLIC_SUPABASE_URL unexpected length: ${envUrl.length}, using fallback`);
    return hardcodedUrl;
  }

  return envUrl;
};

const getSupabaseAnonKey = (): string => {
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const hardcodedKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmaHF1dHllcmViYndqeGd0cWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MTY1ODgsImV4cCI6MjA1MTk5MjU4OH0.NVANt-b8nwl1GY_L_mN68pfCQn_1T55WHM6JlmxnKOU';

  if (!envKey || envKey.trim() === '') {
    console.warn('⚠️ NEXT_PUBLIC_SUPABASE_ANON_KEY invalid or empty, using fallback');
    return hardcodedKey;
  }

  return envKey;
};

export const SUPABASE_CONFIG = {
  url: 'https://kfhqutyerebbwjxgtqem.supabase.co',
  anonKey: getSupabaseAnonKey(),
};
