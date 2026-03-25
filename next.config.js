/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict mode for better development
  reactStrictMode: true,

  // Optimize for production
  poweredByHeader: false,

  // Allow Tailscale IP for mobile testing in development
  allowedDevOrigins: ['100.113.9.34'],

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/:path*',
        headers: [
          {
            // Prevent clickjacking attacks
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            // Prevent MIME type sniffing
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            // Control referrer information
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            // XSS protection (legacy, but still useful for older browsers)
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            // Permissions policy - camera enabled for AI photo capture
            key: 'Permissions-Policy',
            value: 'camera=(self), microphone=(), geolocation=()',
          },
          {
            // Cross-Origin-Embedder-Policy for SharedArrayBuffer (needed by @imgly/background-removal)
            key: 'Cross-Origin-Embedder-Policy',
            value: 'credentialless',
          },
          {
            // Cross-Origin-Opener-Policy for SharedArrayBuffer
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
