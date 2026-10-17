'use client'

import { useEffect, useRef, useState } from 'react'
import type { Plan } from '@/lib/plans'

/**
 * "Have a code?"
 *
 * Folded away until it is wanted. A discount field sitting open on a checkout
 * is an invitation to leave and go looking for one, and most people arriving
 * here do not have a code — but the ones who do, usually from a link, should
 * not have to hunt for where to put it.
 *
 * A code in the URL (?code=SOMETHING) opens the field and applies itself, so
 * an ad or a WhatsApp forward can carry its own discount.
 *
 * Whatever this component says is advisory. The server re-checks the code and
 * prices it again before any money moves, so a tampered response here changes
 * a label and nothing else.
 */

export type Applied = { code: string; discountPaise: number; label: string }

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

export default function CouponField({
  plan = 'deposit',
  qty = 1,
  email,
  variant,
  disabled = false,
  onApplied,
}: {
  plan?: Plan
  qty?: number
  /** Only used for per-buyer limits; may be empty while the form is being filled. */
  email?: string
  variant?: string | null
  disabled?: boolean
  onApplied?: (applied: Applied | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [state, setState] = useState<
    { kind: 'idle' } | { kind: 'checking' } | { kind: 'ok'; applied: Applied } | { kind: 'bad'; error: string }
  >({ kind: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const autoTried = useRef(false)

  const apply = async (raw: string) => {
    const wanted = raw.trim().toUpperCase()
    if (!wanted) return
    setState({ kind: 'checking' })
    try {
      const res = await fetch('/api/coupon', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code: wanted, plan, qty, email: email || undefined, variant: variant || undefined }),
      })
      const body = await res.json().catch(() => ({}))
      if (body?.valid) {
        const applied: Applied = {
          code: String(body.code), discountPaise: Number(body.discountPaise), label: String(body.label),
        }
        setState({ kind: 'ok', applied })
        onApplied?.(applied)
        return
      }
      setState({ kind: 'bad', error: String(body?.error ?? 'That code is not valid.') })
      onApplied?.(null)
    } catch {
      setState({ kind: 'bad', error: 'Could not check that code. Try again.' })
      onApplied?.(null)
    }
  }

  // A code that arrived in the link applies itself, once.
  useEffect(() => {
    if (autoTried.current) return
    autoTried.current = true
    const fromUrl = new URLSearchParams(window.location.search).get('code')
    if (!fromUrl) return
    setOpen(true)
    setCode(fromUrl.trim().toUpperCase())
    void apply(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const remove = () => {
    setState({ kind: 'idle' })
    setCode('')
    onApplied?.(null)
    inputRef.current?.focus()
  }

  if (!open) {
    return (
      <>
        <input type="hidden" name="coupon" value="" />
        <button
          type="button"
          onClick={() => { setOpen(true); window.setTimeout(() => inputRef.current?.focus(), 0) }}
          className="bg-transparent border-0 p-0 mt-4 cursor-pointer text-[14px] underline"
          style={{ color: 'var(--muted)' }}
        >
          Have a code?
        </button>
      </>
    )
  }

  const applied = state.kind === 'ok' ? state.applied : null

  return (
    <div className="mt-4">
      {/* The applied code travels with the form. An empty value means none,
          and the server treats an unknown code as none either way. */}
      <input type="hidden" name="coupon" value={applied?.code ?? ''} />

      <label htmlFor="coupon-code" className="t-label block mb-2">Discount code</label>
      <div className="flex gap-2 items-start">
        <input
          ref={inputRef}
          id="coupon-code"
          name="coupon-code"
          className="field"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          disabled={disabled || state.kind === 'checking' || Boolean(applied)}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase())
            if (state.kind === 'bad') setState({ kind: 'idle' })
          }}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return
            // Inside a form, Enter would submit the order instead of checking
            // the code — which is exactly the wrong thing at this moment.
            e.preventDefault()
            void apply(code)
          }}
          aria-invalid={state.kind === 'bad'}
          aria-describedby="coupon-status"
          style={{ maxWidth: 220 }}
        />
        {applied ? (
          <button type="button" onClick={remove} disabled={disabled}
                  className="btn btn-ghost" style={{ minHeight: 46, fontSize: 14 }}>
            Remove
          </button>
        ) : (
          <button type="button" onClick={() => void apply(code)}
                  disabled={disabled || state.kind === 'checking' || !code.trim()}
                  className="btn btn-ghost" style={{ minHeight: 46, fontSize: 14 }}>
            {state.kind === 'checking' ? 'Checking…' : 'Apply'}
          </button>
        )}
      </div>

      <p id="coupon-status" aria-live="polite" className="text-[13px] mt-2 mb-0"
         style={{ color: state.kind === 'bad' ? 'var(--danger)' : 'var(--muted)' }}>
        {applied ? `${applied.label} applied.` : state.kind === 'bad' ? state.error : ' '}
      </p>

      {applied && applied.discountPaise > 0 && (
        <p className="text-[13px] mt-1 mb-0" style={{ color: 'var(--muted)' }}>
          {plan === 'full'
            ? `${rupees(applied.discountPaise)} comes off what you pay now.`
            : `${rupees(applied.discountPaise)} comes off the amount collected on delivery.`}
        </p>
      )}
    </div>
  )
}
