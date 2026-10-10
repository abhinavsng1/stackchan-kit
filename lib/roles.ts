/**
 * What people make it, rather than how many faces it has.
 *
 * A count of expressions is a spec, and a spec does not make anyone want a
 * robot. What they want to know is what it will be on their desk. So this
 * section is roles.
 *
 * Every line here is backed by something the firmware does today — checked
 * against the source in pebble-robo-mono, not remembered. The honest boundary
 * matters more here than anywhere else on the page: the robot is open, so the
 * temptation is to describe everything it *could* be as though it already is.
 * `shipped: false` marks a role the firmware cannot do yet, and the section
 * renders those separately and says so. Nothing in that state may be written
 * as though a buyer gets it in the box.
 */
export type Role = {
  id: string
  /** Two or three words. The thing it becomes. */
  title: string
  /** One sentence, concrete, present tense. */
  body: string
  /** The render that illustrates it. */
  image: string
  /** False when the firmware cannot do this yet. */
  shipped: boolean
}

export const ROLES: Role[] = [
  {
    id: 'pet',
    title: 'A pet',
    body: 'It blinks, it breathes, it fidgets when left alone, and it goes '
      + 'dizzy if you shake it. Nobody told it to — it just does that.',
    image: '/media/render/role-pet',
    shipped: true,
  },
  {
    id: 'answers',
    title: 'Something that answers',
    body: 'Say "Hi, Stack-chan" and it wakes without touching the internet to '
      + 'hear you. Then it answers out loud, turns to look at you, and will '
      + 'take a photo to work out what you are pointing at.',
    image: '/media/render/role-answers',
    shipped: true,
  },
  {
    id: 'performer',
    title: 'A performer',
    body: 'Write the lines and the head moves; it speaks them out loud with '
      + 'its mouth following the audio, and waits for a tap when you want it '
      + 'to. It dances too.',
    image: '/media/render/role-performer',
    shipped: true,
  },
  {
    id: 'puppet',
    title: 'Your face, on a robot',
    body: 'Point your phone at yourself and it copies you — your head turns, '
      + 'its head turns. You can throw your phone camera onto its screen too.',
    image: '/media/render/role-puppet',
    shipped: true,
  },
  {
    id: 'yours',
    title: 'Whatever you write',
    body: 'JavaScript on Moddable, or Arduino and M5Unified if you prefer. '
      + 'Apache-2.0, the whole way down, including the face you are looking at.',
    image: '/media/render/role-yours',
    shipped: true,
  },
]

/** Roles the page may advertise as something the buyer gets. */
export const shippedRoles = () => ROLES.filter((r) => r.shipped)

/** Roles that exist as an intention. Rendered apart, and labelled. */
export const plannedRoles = () => ROLES.filter((r) => !r.shipped)
