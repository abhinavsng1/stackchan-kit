import { adminAuthorised, adminChallenge } from '@/lib/admin-auth'
import { listOrders, ordersCsv } from '@/lib/admin-orders'

/**
 * The order book as data: JSON for the page, CSV for a spreadsheet.
 *
 * Checked here as well as in the proxy. This route hands out every buyer's
 * name, phone and address in one response, which is exactly the kind of thing
 * that should not be protected by a route-matcher pattern alone.
 */

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  if (!adminAuthorised(request)) return adminChallenge()

  const orders = await listOrders()
  const format = new URL(request.url).searchParams.get('format')

  if (format === 'csv') {
    const day = new Date().toISOString().slice(0, 10)
    return new Response(ordersCsv(orders), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="pebblerobo-orders-${day}.csv"`,
        'cache-control': 'no-store',
      },
    })
  }

  return Response.json({ orders }, { headers: { 'cache-control': 'no-store' } })
}
