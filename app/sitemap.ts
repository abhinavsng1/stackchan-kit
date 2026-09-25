import type { MetadataRoute } from 'next'

const SITE = 'https://pebblerobo.com'

/**
 * The product page, plus the policies. The policies are listed because
 * Merchant Center and payment aggregators both check they exist and are
 * reachable — an unlinked, uncrawled policy page counts for nothing.
 * /checkout is absent deliberately: its URLs carry a payment token.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    { url: SITE, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    ...['/returns', '/shipping', '/terms', '/privacy', '/contact'].map((path) => ({
      url: `${SITE}${path}`,
      lastModified: now,
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    })),
  ]
}
