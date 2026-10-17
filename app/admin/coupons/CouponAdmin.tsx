'use client'

import { useState } from 'react'
import type { Coupon } from '@/lib/coupons'

/**
 * Make a code, retire a code, see what each one has sold.
 *
 * Plain and dense on purpose: this is a tool for one person who already knows
 * what the columns mean, not a page anybody has to be persuaded by.
 */

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

const worth = (c: Coupon) =>
  c.kind === 'fixed'
    ? `${rupees(c.value)} off`
    : `${c.value}% off${c.maxDiscountPaise ? `, max ${rupees(c.maxDiscountPaise)}` : ''}`

const when = (d: Date | null) => (d ? new Date(d).toISOString().slice(0, 10) : '—')

export default function CouponAdmin({ initial }: { initial: Coupon[] }) {
  const [coupons, setCoupons] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const reload = async () => {
    const res = await fetch('/api/admin/coupons')
    if (res.ok) setCoupons((await res.json()).coupons)
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const form = new FormData(e.currentTarget)
    const str = (k: string) => String(form.get(k) ?? '').trim()
    const num = (k: string) => (str(k) ? Number(str(k)) : undefined)

    const body = {
      action: 'create' as const,
      code: str('code'),
      kind: str('kind') as 'fixed' | 'percent',
      value: Number(str('value')),
      maxDiscountRupees: num('maxDiscountRupees'),
      minQty: num('minQty'),
      // Empty means every plan, which is what the table stores as {}.
      plans: str('plans') ? [str('plans') as 'deposit' | 'full'] : [],
      endsAt: str('endsAt') || undefined,
      maxUses: num('maxUses'),
      perEmailLimit: num('perEmailLimit'),
      label: str('label') || undefined,
    }

    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const out = await res.json().catch(() => ({}))
    setBusy(false)
    if (!out?.ok) return setError(String(out?.reason ?? out?.error ?? 'Could not create that code.'))
    e.currentTarget.reset()
    await reload()
  }

  const toggle = async (code: string, active: boolean) => {
    await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'active', code, active }),
    })
    await reload()
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="t-label block mb-1.5">{label}</span>
      <input name={name} className="field" {...props} />
    </label>
  )

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">Back office</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-8">Discount codes</h1>

      <form onSubmit={submit} className="card p-6 mb-10" style={{ maxWidth: 760 }}>
        <div className="grid gap-4 sm:grid-cols-3">
          {field('code', 'Code', { required: true, placeholder: 'DIWALI500', autoCapitalize: 'characters' })}
          <label className="block">
            <span className="t-label block mb-1.5">Kind</span>
            <select name="kind" className="field" defaultValue="fixed">
              <option value="fixed">Fixed (₹)</option>
              <option value="percent">Percent (%)</option>
            </select>
          </label>
          {field('value', 'Value', { required: true, inputMode: 'numeric', placeholder: '500' })}

          {field('maxDiscountRupees', 'Max discount (₹)', { inputMode: 'numeric', placeholder: 'percent only' })}
          {field('minQty', 'Minimum robots', { inputMode: 'numeric', placeholder: '1' })}
          <label className="block">
            <span className="t-label block mb-1.5">Valid on</span>
            <select name="plans" className="field" defaultValue="">
              <option value="">Both plans</option>
              <option value="full">Pay in full only</option>
              <option value="deposit">Deposit only</option>
            </select>
          </label>

          {field('maxUses', 'Total uses', { inputMode: 'numeric', placeholder: 'unlimited' })}
          {field('perEmailLimit', 'Per buyer', { inputMode: 'numeric', placeholder: 'unlimited' })}
          {field('endsAt', 'Ends', { type: 'date' })}
        </div>

        <div className="mt-4">{field('label', 'Label shown to the buyer', { placeholder: 'Diwali — ₹500 off' })}</div>

        {error && <p className="text-[14px] mt-4 mb-0" style={{ color: 'var(--danger)' }}>{error}</p>}

        <button type="submit" disabled={busy} className="btn btn-brand mt-5">
          {busy ? 'Creating…' : 'Create code'}
        </button>
      </form>

      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse', minWidth: 820 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Code', 'Worth', 'Plans', 'Min qty', 'Used', 'Per buyer', 'Ends', 'State', ''].map((h) => (
                <th key={h} className="t-label text-left py-2.5 pr-4 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {coupons.length === 0 && (
              <tr><td colSpan={9} className="py-6" style={{ color: 'var(--muted)' }}>No codes yet.</td></tr>
            )}
            {coupons.map((c) => (
              <tr key={c.code} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                <td className="py-3 pr-4 t-mono">{c.code}</td>
                <td className="py-3 pr-4">{worth(c)}</td>
                <td className="py-3 pr-4">{c.plans.length ? c.plans.join(', ') : 'both'}</td>
                <td className="py-3 pr-4">{c.minQty}</td>
                <td className="py-3 pr-4">{c.redeemed}{c.maxUses ? ` / ${c.maxUses}` : ''}</td>
                <td className="py-3 pr-4">{c.perEmailLimit ?? '—'}</td>
                <td className="py-3 pr-4">{when(c.endsAt)}</td>
                <td className="py-3 pr-4">{c.active ? 'active' : 'off'}</td>
                <td className="py-3">
                  <button type="button" onClick={() => void toggle(c.code, !c.active)}
                          className="bg-transparent border-0 p-0 underline cursor-pointer text-[13px]"
                          style={{ color: 'var(--muted)' }}>
                    {c.active ? 'Deactivate' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] mt-8 mb-0" style={{ color: 'var(--muted)' }}>
        Codes are counted when a payment settles, never when one is typed. Deactivating
        a code leaves the orders that used it alone.
      </p>
    </main>
  )
}
