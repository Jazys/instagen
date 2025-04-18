import { NextApiRequest, NextApiResponse } from 'next';

/**
 * API route that generates a dynamic sitemap.xml
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // List of static paths in your application
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://instagen.me';
  
  // Add all your important URLs here
  const staticPages = [
    '',                 // Home page
    '/pricing',        
    '/auth/login',     
    '/auth/register',
    // Add other static pages
  ];

  // Current date for lastmod
  const date = new Date().toISOString();

  // Generate XML sitemap
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
      ${staticPages
        .map(
          (page) => `
        <url>
          <loc>${baseUrl}${page}</loc>
          <lastmod>${date}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>${page === '' ? '1.0' : '0.8'}</priority>
        </url>
      `
        )
        .join('')}
    </urlset>
  `;

  // Set response headers
  res.setHeader('Content-Type', 'text/xml');
  res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=600');
  
  // Send the sitemap
  res.write(sitemap);
  res.end();
} 