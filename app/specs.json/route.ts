import { SPEC_TABLES, PRICE, CONTACT } from '@/lib/kit'

/**
 * The datasheet, machine-readable.
 *
 * Generated from SPEC_TABLES, the same constant the page renders, so the
 * table a buyer reads and the file they download cannot disagree. A second
 * hand-maintained copy would be wrong within a month.
 *
 * Static: nothing here depends on a request.
 */
export const dynamic = 'force-static'

export function GET() {
  const body = {
    product: 'PebbleRobo',
    sku: { assembled: 'PBL-BOT-01', kit: 'PBL-KIT-01' },
    price_inr: { total: 4999, booking: 499, on_delivery: 4500 },
    firmware: { project: 'Stack-chan', licence: 'Apache-2.0' },
    contact: CONTACT.email,
    specifications: SPEC_TABLES.map((t) => ({
      group: t.title,
      designator: t.desig,
      rows: t.rows.map((r) => ({
        label: r.label,
        value: Array.isArray(r.value) ? r.value : [r.value],
      })),
    })),
  }
  void PRICE
  return Response.json(body, {
    headers: { 'cache-control': 'public, max-age=3600' },
  })
}
