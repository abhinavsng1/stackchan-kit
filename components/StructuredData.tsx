import { CONTACT, FAQS, PRICE, SPEC_TABLES, EDITION } from '@/lib/kit'

/**
 * Structured data for search engines and for the models that increasingly
 * answer questions instead of linking to pages.
 *
 * Both read the same JSON-LD, but they reward different things. A search
 * engine wants Product and Offer so it can show a price. A language model
 * wants unambiguous facts it can repeat without hedging — which part, which
 * driver, how much, who ships it, where. The specifications are already
 * transcribed from supplier invoices, so they are emitted here rather than
 * summarised: the whole advantage of this page is that its claims are checkable.
 *
 * Everything below is derived from lib/kit.ts. Nothing is written twice, so
 * the markup cannot drift away from the page a reader sees.
 */

const SITE = 'https://pebblerobo.com'

/** '₹4,999' → '4999'. Schema.org wants a bare number. */
const priceNumber = (display: string) => display.replace(/[^\d]/g, '')

export default function StructuredData() {
  const graph = [
    {
      '@type': 'Organization',
      '@id': `${SITE}/#org`,
      name: CONTACT.entity,
      url: SITE,
      email: CONTACT.email,
      areaServed: { '@type': 'Country', name: 'India' },
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE}/#site`,
      url: SITE,
      name: 'Pebble Robo',
      inLanguage: 'en-IN',
      publisher: { '@id': `${SITE}/#org` },
    },
    {
      '@type': 'Product',
      '@id': `${SITE}/#product`,
      name: 'PebbleRobo desktop robot',
      description:
        'A desktop robot with a face, based on the open-source Stack-chan project, sold fully ' +
        'assembled and tested or as a build kit at the same price. An M5Stack CoreS3 Lite on two ' +
        'SCS0009 serial bus servos for pan and tilt, a Waveshare bus servo driver, a 5 V 3 A ' +
        'supply and a 3D-printed shell.',
      brand: { '@type': 'Brand', name: 'Pebble Robo' },
      category: 'Desktop robot',
      image: [
        `${SITE}/og.jpg`, `${SITE}/media/robot/robot-desk.webp`, `${SITE}/media/robot/robot-happy.webp`,
      ],
      url: SITE,
      // Component-level facts, straight from the specification tables. This is
      // what a model needs to answer "what controller does it use?" correctly.
      additionalProperty: SPEC_TABLES.flatMap((table) =>
        table.rows.map((row) => ({
          '@type': 'PropertyValue',
          name: `${table.title}: ${row.label}`,
          value: Array.isArray(row.value) ? row.value.join('; ') : row.value,
        })),
      ),
      /* One offer: the robot, ready to use — the only thing the page sells.
         No priceValidUntil: the early bird date has passed but the
         price has not changed, and a past date tells a search engine the
         price has expired when it has not. */
      offers: (['assembled'] as const).map((e) => ({
        '@type': 'Offer',
        '@id': `${SITE}/#offer-${e}`,
        name: EDITION[e].name,
        sku: EDITION[e].sku,
        url: SITE,
        price: priceNumber(PRICE.now),
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/NewCondition',
        seller: { '@id': `${SITE}/#org` },
        // India only, and the page says so rather than letting a reader assume.
        eligibleRegion: { '@type': 'Country', name: 'India' },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'IN' },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 7, maxValue: 14, unitCode: 'DAY' },
          },
        },
      })),
    },
    {
      // The questions people actually ask, answered in the words the page uses.
      '@type': 'FAQPage',
      '@id': `${SITE}/#faq`,
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ]

  return (
    <script
      type="application/ld+json"
      // Content is ours and contains no user input; the only risk is a literal
      // "</script>" inside a spec string, which this forecloses.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ '@context': 'https://schema.org', '@graph': graph })
          .replace(/</g, '\\u003c'),
      }}
    />
  )
}
