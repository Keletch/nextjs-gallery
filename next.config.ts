import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/gallery',
        permanent: true,
      },
    ]
  },
}

export default nextConfig