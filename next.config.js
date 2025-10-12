/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Enable production optimizations for 300 concurrent users
  compress: true, // Enable gzip compression
  poweredByHeader: false, // Remove X-Powered-By header for security
  // Note: swcMinify is enabled by default in Next.js 15+

  // Disable static optimization for pages with env var issues
  generateBuildId: async () => {
    // Add timestamp to force cache invalidation
    return `build-${Date.now()}`;
  },

  // Optimized headers for performance and caching
  async headers() {
    return [
      // HTML pages - no cache for dynamic content
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate, max-age=0',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      // Static assets - aggressive caching
      {
        source: '/(.*)\\.(ico|png|jpg|jpeg|gif|webp|svg|css|js|woff|woff2|ttf|eot)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },

  // Production logging configuration
  logging: {
    fetches: {
      fullUrl: false, // Don't log full URLs in production
    },
  },
}

module.exports = nextConfig
