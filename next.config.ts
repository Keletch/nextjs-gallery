import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
    // Solo afecta a `next dev`: deja abrir el sitio local desde un túnel de ngrok o por la IP de la red
    // (192.168.*) para probar en otros dispositivos
    allowedDevOrigins: ['*.ngrok-free.dev', '192.168.*.*'],
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

    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains',
                    },
                    {
                        // CSP mínima: bloquea iframes ajenos, <base> y plugins sin tocar scripts/estilos
                        key: 'Content-Security-Policy',
                        value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
        ];
    },
}

export default nextConfig