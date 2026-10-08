/**
 * Social proof: what people say about it, what they made with it, and where
 * to find them.
 *
 * Everything marked `placeholder: true` was written by us to lay the section
 * out at full fidelity, and is NOT from a customer. It renders locally and on
 * preview deployments so the design can be reviewed, and never in production:
 * `visibleProof` drops it there, and tests/proof.test.ts fails the build if a
 * placeholder could reach pebblerobo.com.
 *
 * To go live, replace an entry with the real quote, photo or link — with the
 * person's permission — and delete its `placeholder` flag. Nothing else needs
 * to change: a section with no real entries simply does not render in
 * production.
 */

export type Quote = {
  kind: 'quote'
  id: string
  text: string
  name: string
  /** Where they are, or what they do. Short. */
  meta: string
  placeholder?: true
}

export type Moment = {
  kind: 'photo' | 'video'
  id: string
  /**
   * For a photo, the image path. For a video, the base path (no extension).
   * Empty while it is a placeholder: the tile is drawn as an empty frame,
   * because standing our own pictures in for a customer's would be passing
   * them off as one.
   */
  src: string
  poster?: string
  alt: string
  caption: string
  credit: string
  /** 'tall' spans two rows in the wall. */
  shape?: 'tall' | 'wide' | 'square'
  placeholder?: true
}

export type Social = {
  id: string
  label: string
  href: string
  placeholder?: true
}

export type ProofItem = Quote | Moment

/** The quote set large at the top of the section. */
export const FEATURED: Quote = {
  kind: 'quote',
  id: 'featured',
  text: 'I bought it as a desk toy. Three weeks later I say good morning to it.',
  name: 'Placeholder customer',
  meta: 'Bengaluru',
  placeholder: true,
}

/**
 * The wall. Photo and video entries have no picture yet — they render as
 * empty frames until real customer photos replace them.
 */
export const WALL: ProofItem[] = [
  {
    kind: 'photo', id: 'desk-1', src: '',
    alt: 'A PebbleRobo on a desk',
    caption: 'Next to the monstera, where it belongs.',
    credit: '@placeholder', shape: 'tall', placeholder: true,
  },
  {
    kind: 'quote', id: 'q-kid',
    text: 'My daughter taps it every morning just to see which face it makes.',
    name: 'Placeholder parent', meta: 'Pune', placeholder: true,
  },
  {
    kind: 'video', id: 'clip-look', src: '',
    alt: 'PebbleRobo turning its head to look around',
    caption: 'It noticed the door open before I did.',
    credit: '@placeholder', shape: 'square', placeholder: true,
  },
  {
    kind: 'quote', id: 'q-dev',
    text: 'Ten minutes out of the box it was blinking at me. An evening later it was reading out my build status.',
    name: 'Placeholder engineer', meta: 'Hyderabad', placeholder: true,
  },
  {
    kind: 'photo', id: 'happy', src: '',
    alt: 'PebbleRobo with a happy face on its screen',
    caption: 'Monday mood, handled.',
    credit: '@placeholder', shape: 'square', placeholder: true,
  },
  {
    kind: 'quote', id: 'q-wfh',
    text: 'Working from home is less quiet now. In a good way.',
    name: 'Placeholder designer', meta: 'Mumbai', placeholder: true,
  },
  {
    kind: 'photo', id: 'curious', src: '',
    alt: 'PebbleRobo with wide, curious eyes',
    caption: 'Caught it looking.',
    credit: '@placeholder', shape: 'tall', placeholder: true,
  },
]

export const SOCIALS: Social[] = [
  { id: 'instagram', label: 'Instagram', href: 'https://instagram.com/', placeholder: true },
  { id: 'youtube', label: 'YouTube', href: 'https://youtube.com/', placeholder: true },
  { id: 'x', label: 'X', href: 'https://x.com/', placeholder: true },
]

/**
 * Real, checkable links that belong in the community block whatever else is
 * there: the open-source project the robot runs.
 */
export const COMMUNITY_LINKS: Social[] = [
  { id: 'stackchan', label: 'Stack-chan on GitHub', href: 'https://github.com/meganetaaan/stack-chan' },
]

/**
 * Whether placeholders may be shown. Production — Vercel's production
 * environment — never shows them. Local development and previews do, so the
 * section can be designed and reviewed.
 */
export function placeholdersAllowed(env: string | undefined = process.env.VERCEL_ENV): boolean {
  return env !== 'production'
}

/** The entries that may render in this environment. */
export function visibleProof(env?: string) {
  const ok = <T extends { placeholder?: true }>(x: T) => !x.placeholder || placeholdersAllowed(env)
  const featured = ok(FEATURED) ? FEATURED : null
  const wall = WALL.filter(ok)
  const socials = SOCIALS.filter(ok)
  return {
    featured,
    wall,
    socials,
    community: COMMUNITY_LINKS,
    /** Whether the stories section has anything to show. */
    hasStories: Boolean(featured) || wall.length > 0,
    /** Whether anything shown is a placeholder, so the page can label it. */
    showingPlaceholders: [featured, ...wall, ...socials].some((x) => x?.placeholder),
  }
}
