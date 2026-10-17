import type { MetadataRoute } from 'next'

/**
 * The payment pages are deliberately excluded. /checkout and /pay-balance are
 * reachable only with a token from an email, and the API routes are not
 * content.
 *
 * /admin is excluded twice over: it is behind Basic auth in proxy.ts, every
 * page under it sends `noindex`, and it is named here as well. A crawler that
 * ignores one of the three still has two left, and a back office that turns up
 * in a search result is a back office somebody will try the door of.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/checkout', '/pay-balance', '/admin'] }],
    sitemap: 'https://pebblerobo.com/sitemap.xml',
    host: 'https://pebblerobo.com',
  }
}
