import type { MetadataRoute } from 'next'

/** One page, but a sitemap is how a crawler learns it changed. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{
    url: 'https://pebblerobo.com',
    lastModified: new Date(),
    changeFrequency: 'weekly',
    priority: 1,
  }]
}
