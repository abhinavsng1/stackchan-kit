import { EMI_TERMS, emiFromLine, affordabilityWidgetEnabled } from '@/lib/emi'
import AffordabilityWidget from '@/components/AffordabilityWidget'

/**
 * What the page is allowed to say about paying monthly.
 *
 * Renders nothing at all when no monthly figure is configured. A site that
 * invents "from ₹833/month" because it divided a price by six is making a
 * claim the bank has not agreed to, and the buyer finds out at the payment
 * screen — which is the worst place to be surprised.
 */
export default function EmiNote({ amountPaise }: { amountPaise?: number }) {
  const line = emiFromLine()
  const widget = affordabilityWidgetEnabled()
  if (!line && !widget) return null

  return (
    <div className="mt-3">
      {line && (
        <p className="text-[13.5px] m-0" style={{ color: 'var(--muted)' }}>
          {line}. {EMI_TERMS.noCost} <span style={{ opacity: 0.8 }}>{EMI_TERMS.caveat}</span>
        </p>
      )}
      {widget && amountPaise ? <AffordabilityWidget amountPaise={amountPaise} /> : null}
    </div>
  )
}
