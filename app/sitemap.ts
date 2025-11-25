import { MetadataRoute } from 'next'
import { supabaseServer } from '@/lib/supabase-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://galeria.chu.mx'

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/gallery`,
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: `${baseUrl}/upload`,
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.8,
        },
    ]

    // Dynamic pages: approved images
    try {
        const { data: images } = await supabaseServer
            .from('imageInfo')
            .select('imghash, created_at')
            .order('created_at', { ascending: false })
            .limit(1000) // Limit para no sobrecargar el sitemap

        const imagePages: MetadataRoute.Sitemap = (images || []).map((img) => ({
            url: `${baseUrl}/gallery?open=${img.imghash}`,
            lastModified: new Date(img.created_at),
            changeFrequency: 'monthly' as const,
            priority: 0.6,
        }))

        return [...staticPages, ...imagePages]
    } catch (error) {
        console.error('[SITEMAP] Error fetching images:', error)
        return staticPages
    }
}
