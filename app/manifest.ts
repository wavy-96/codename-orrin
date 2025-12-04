import { MetadataRoute } from 'next';

// Force static generation for the manifest
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Interview Prep Tool',
    short_name: 'Interview Prep',
    description: 'Practice interviews with AI-powered interviewers',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#000000',
    icons: [
      {
        src: '/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
      },
    ],
  };
}

