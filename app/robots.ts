import type { MetadataRoute } from 'next'

/**
 * The payment pages are deliberately excluded. /checkout is reachable only
 * with a token from a confirmation email, and the API routes are not content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout'] }],
    sitemap: 'https://pebblerobo.com/sitemap.xml',
    host: 'https://pebblerobo.com',
  }
}
