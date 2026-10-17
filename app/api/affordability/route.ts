import { affordabilityWidgetEnabled } from '@/lib/emi'

/**
 * Hands the publishable key to the affordability widget, and only to it.
 *
 * The key id is not a secret — Razorpay's own scripts need it in the browser
 * — but it is not published in the bundle either. Keeping it behind a request
 * means the widget being switched off is enough to stop it appearing
 * anywhere, rather than requiring a rebuild.
 */
export const dynamic = 'force-dynamic'

export async function GET() {
  if (!affordabilityWidgetEnabled()) {
    return Response.json({ error: 'not enabled' }, { status: 404 })
  }
  const keyId = process.env.RAZORPAY_KEY_ID
  if (!keyId) return Response.json({ error: 'not configured' }, { status: 503 })
  return Response.json({ key_id: keyId }, { headers: { 'cache-control': 'no-store' } })
}
