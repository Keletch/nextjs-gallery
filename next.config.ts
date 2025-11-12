import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: 50 * 1024 * 1024,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'sinpfcbinaiasorunmpz.supabase.co',
        pathname: '/storage/v1/object/public/nextjsGallery/**',
      },
    ],
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