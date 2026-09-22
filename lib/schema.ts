import { z } from 'zod'

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

/** Delivery details are collected after the free reservation. Blank answers
 * from an older form mean "not supplied"; nonblank answers still get validated.
 */
const optionalDetail = <T extends z.ZodType>(schema: T) => z.preprocess(
  (value) => typeof value === 'string' ? value.trim() || undefined : value,
  schema.optional(),
)

export const preorderSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  email: z.email('Enter a valid email address').max(160, 'Email is too long'),
  phone: optionalDetail(phone),
  /** Optional: useful to know, never worth losing a reservation over. */
  profession: optionalDetail(z.enum(PROFESSIONS)),
  address: optionalDetail(z.string().trim()
    .min(10, 'Enter the full address we should ship to')
    .max(300, 'Address is too long')),
  city: optionalDetail(z.string().trim().min(2, 'Enter your city').max(80, 'City is too long')),
  pincode: optionalDetail(z.string().trim()
    .regex(/^[1-9]\d{5}$/, 'Enter a 6-digit PIN code')),
  qty: z.coerce.number().int('Quantity must be a whole number')
    .min(1, 'Minimum 1 kit').max(5, 'Maximum 5 kits per reservation'),
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
