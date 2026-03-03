import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Ruhefza App',
        short_name: 'Ruhefza',
        description: 'Özel Eğitim Topluluğu - Aileler ve uzmanları buluşturan platform.',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafaf9',
        theme_color: '#0d9488',
        icons: [
            {
                src: '/pwa-icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/pwa-icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}
