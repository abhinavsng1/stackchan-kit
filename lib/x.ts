/**
 * X (formerly Twitter) conversion tracking: the pixel, and the events it
 * reports.
 *
 * The browser pixel and the server-side Conversion API both read from here.
 * X counts an event reported from both sides once only if both name the same
 * event id and the same conversion_id, so neither side gets its own copy.
 */
export const X_PIXEL_ID = 'rfx4u'

/** What an Events Manager id looks like for this pixel. */
const EVENT_ID = new RegExp(`^tw-${X_PIXEL_ID}-[a-z0-9]+$`)
const eventId = (v: string | undefined) => (v && EVENT_ID.test(v.trim()) ? v.trim() : null)

/**
 * The events, chosen to mirror the Meta Pixel's (lib/analytics.ts), so the two
 * ad platforms are optimised on the same moments:
 *
 *   Meta ViewContent       → content   first section seen, once a visit
 *   Meta InitiateCheckout  → checkout  any Book / Buy button
 *   Meta Lead              → lead      an order is saved (pixel + server)
 *   Meta Purchase          → purchase  the deposit settles (pixel + server)
 *
 * Meta's CompleteRegistration fires at the same moment as Lead and exists for
 * one Meta campaign; X gets Lead alone, rather than counting each order twice.
 * Page views need no event — the base code's `config` records them.
 *
 * The ids are the ones created in X Events Manager for this pixel. X offers
 * only six event types, so Purchase is a Purchase and the other three are
 * Custom; the site fires by id, so the type changes nothing here.
 *
 * An event id is not a secret — the pixel needs it in the browser — so the ids
 * live in code. Each can still be replaced by an environment variable without
 * a code change (NEXT_PUBLIC_, read at build time); a value not shaped like an
 * id for this pixel is ignored in favour of the one here.
 */
export const X_EVENTS: Record<'purchase' | 'lead' | 'checkout' | 'content', string | null> = {
  purchase: eventId(process.env.NEXT_PUBLIC_X_EVENT_PURCHASE) ?? 'tw-rfx4u-rgpx2',
  lead: eventId(process.env.NEXT_PUBLIC_X_EVENT_LEAD) ?? 'tw-rfx4u-rgpxh',
  checkout: eventId(process.env.NEXT_PUBLIC_X_EVENT_CHECKOUT) ?? 'tw-rfx4u-rgpxi',
  content: eventId(process.env.NEXT_PUBLIC_X_EVENT_CONTENT) ?? 'tw-rfx4u-rgpxm',
}

export type XEvent = keyof typeof X_EVENTS

/** Events the server also reports, with a conversion_id the pixel shares. */
export type XServerEvent = 'purchase' | 'lead'
