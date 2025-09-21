/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:3001/:path*',
      },
    ]
  },
  // Enable all hosts for Replit proxy environment
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
        ],
      },
    ]
  },
  // Allow cross-origin requests in development
  experimental: {
    allowedDevOrigins: [
      'replit.dev',
      '*.replit.dev',
      'localhost',
      '127.0.0.1',
      '0.0.0.0'
    ]
  },
}

module.exports = nextConfig
