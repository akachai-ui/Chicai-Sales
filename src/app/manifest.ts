import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Chicai Sales',
    short_name: 'Chicai',
    description: 'Industrial factory map and sales management platform for sales teams',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1b9b8e',
    icons: [
      {
        src: '/icon.png',
        sizes: '192x192 512x512',
        type: 'image/png',
      },
    ],
  };
}
