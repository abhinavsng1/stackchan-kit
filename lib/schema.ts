import { z } from 'zod'
import { EDITIONS } from '@/lib/kit'
import { SHELL_IDS, DEFAULT_SHELL } from '@/lib/shells'
import { VARIANTS } from '@/lib/variants'

/**
 * Authoritative shape of a reservation. The client validates with this for
 * fast feedback; the server re-validates with the same schema and treats its
 * own result as the only truth. Nothing the browser sends is trusted.
 */

export const PROFESSIONS = [
  'Embedded / firmware',
  'Software engineering',
  'Hardware / electronics',
  'Robotics',
  'Student',
  'Research / academia',
  'Teaching / education',
  'Maker / hobbyist',
  'Something else',
] as const

/**
 * Indian mobile numbers, which is where the kit ships. Accepts the ways people
 * actually type them — +91, 0091, a leading 0, spaces, dashes — and stores one
 * canonical form so the same person cannot reserve twice under two spellings.
 */
const phone = z.string()
  .trim()
  .transform((v) => v.replace(/[\s()-]/g, ''))
  .refine((v) => /^(\+91|0091|91|0)?[6-9]\d{9}$/.test(v), 'Enter a 10-digit Indian mobile number')
  .transform((v) => '+91' + v.slice(-10))

/**
 * Profession is the only thing worth knowing but not worth losing an order
 * over, so it alone is optional. Everything else is needed to ship a box.
 */
const optionalDetail = <T extends z.ZodType>(schema: T) => z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || undefined : value,
  schema.optional(),
)

/** A value that is kept when it matches and silently dropped when it does not. */
const attribution = (shape: RegExp) => z.preprocess(
  (value) => typeof value === 'string' && shape.test(value.trim()) ? value.trim() : undefined,
  z.string().optional(),
)

export const preorderSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  email: z.email('Enter a valid email address').max(160, 'Email is too long'),
  phone,
  /** Optional: useful to know, never worth losing a reservation over. */
  profession: optionalDetail(z.enum(PROFESSIONS)),
  address: z.string().trim()
    .min(10, 'Enter the full address we should ship to')
    .max(300, 'Address is too long'),
  city: z.string().trim().min(2, 'Enter your city').max(80, 'City is too long'),
  pincode: z.string().trim().regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code'),
  qty: z.coerce.number().int('Quantity must be a whole number')
    .min(1, 'Minimum 1 robot').max(5, 'Maximum 5 per order'),
  /**
   * Assembled robot or build kit. The page always sends one. An order with no
   * edition at all can only come from a tab opened before the robot was on
   * sale, when the kit was the only thing this page sold — so that is what it
   * is recorded as.
   */
  edition: z.enum(EDITIONS, 'Choose the robot or the kit').default('kit'),
  /**
   * Attribution, not order details. The click id of the X ad the buyer came
   * through, and an id the browser made up for this order so that X can match
   * the pixel's report of it to the server's. Both are dropped rather than
   * rejected when malformed: nobody should lose an order over a tracking value
   * they never saw.
   */
  twclid: attribution(/^[A-Za-z0-9._~-]{1,200}$/),
  xid: attribution(/^[A-Za-z0-9-]{8,64}$/),
  /**
   * Which price this buyer was shown, on the pages that run the experiment.
   * Absent on the kit page, which has one price. An unknown value is rejected
   * rather than stored, so a forged cookie cannot invent an arm.
   */
  /**
   * The colour, which the buyer may simply not answer.
   *
   * Preprocessed because an untouched <select> posts an empty string, and an
   * empty string is not a member of the enum — without this, leaving the
   * optional field alone would fail the whole order.
   */
  shell: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z.enum(SHELL_IDS, 'Choose one of the colours we print').default(DEFAULT_SHELL),
  ),

  variant: z.enum(VARIANTS).optional(),
  /**
   * Honeypot. Real people never see this field. The schema only accepts it —
   * enforcement lives in the route handler, which answers a filled honeypot
   * with a success response so a bot cannot tell it was caught.
   */
  company: z.string().max(200).optional(),
})

export type PreorderInput = z.infer<typeof preorderSchema>

/** Flattens Zod issues into { field: message } for rendering next to inputs. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
