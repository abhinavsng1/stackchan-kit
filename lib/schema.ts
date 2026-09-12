import { z } from 'zod'

/**
 * Authoritative shape of a reservation. The client validates with this for
 * fast feedback; the server re-validates with the same schema and treats its
 * own result as the only truth. Nothing the browser sends is trusted.
 */
export const preorderSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(80, 'Name is too long'),
  email: z.email('Enter a valid email address').max(160, 'Email is too long'),
  qty: z.coerce.number().int('Quantity must be a whole number').min(1, 'Minimum 1 kit').max(5, 'Maximum 5 kits per reservation'),
  city: z.string().trim().max(80, 'City is too long').optional().or(z.literal('')),
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
