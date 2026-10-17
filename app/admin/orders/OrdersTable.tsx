'use client'

import { useMemo, useState } from 'react'
import { GROUPS, GROUP_LABEL, whatsappLink, type AdminOrder, type Group } from '@/lib/admin-orders'

/**
 * Every order, in the three states that imply different work.
 *
 * The WhatsApp button is the point of the page. It opens a chat with the
 * buyer, with a message already written and their own payment or balance link
 * in it — no provider, no API, no template approval, just the link wa.me
 * understands. Nothing is sent until the person reading this page presses
 * send in WhatsApp themselves.
 */

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString('en-IN')}`

/** How long ago, in the units a person would say. */
function age(date: Date): string {
  const ms = Date.now() - new Date(date).getTime()
  const hours = Math.floor(ms / 3_600_000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return days < 30 ? `${days}d` : `${Math.floor(days / 30)}mo`
}

export default function OrdersTable({ initial, siteUrl }: { initial: AdminOrder[]; siteUrl: string }) {
  const [orders, setOrders] = useState(initial)
  const [group, setGroup] = useState<Group | 'all'>('all')
  const [query, setQuery] = useState('')
  const [asking, setAsking] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: orders.length }
    for (const g of GROUPS) c[g] = orders.filter((o) => o.group === g).length
    return c
  }, [orders])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return orders.filter((o) => {
      if (group !== 'all' && o.group !== group) return false
      if (!q) return true
      return [o.name, o.email, o.phone, o.city, o.pincode, o.couponCode]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
  }, [orders, group, query])

  const askBalance = async (o: AdminOrder) => {
    setAsking(o.id)
    setNote(null)
    const res = await fetch(`/api/admin/orders/${o.id}/ask-balance`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    setAsking(null)
    if (!body?.ok) return setNote(String(body?.error ?? 'Could not send that email.'))
    setNote(`Asked ${o.name} for the balance.`)
    setOrders((rows) => rows.map((r) => (r.id === o.id ? { ...r, balanceAskedAt: new Date() } : r)))
  }

  const tab = (value: Group | 'all', label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => setGroup(value)}
      className="cursor-pointer px-3.5 py-2 text-[14px]"
      style={{
        borderRadius: 999,
        border: `1px solid ${group === value ? 'var(--ink)' : 'var(--line)'}`,
        background: group === value ? 'var(--ink)' : 'transparent',
        color: group === value ? 'var(--surface)' : 'var(--ink)',
      }}
    >
      {label} <span style={{ opacity: 0.6 }}>{counts[value] ?? 0}</span>
    </button>
  )

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">Back office</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-6">Orders</h1>

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        {tab('all', 'All')}
        {GROUPS.map((g) => tab(g, GROUP_LABEL[g]))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          className="field"
          placeholder="Name, email, phone, city, code"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        <a href="/api/admin/orders?format=csv" className="btn btn-ghost" style={{ minHeight: 46, fontSize: 14 }}>
          Export CSV
        </a>
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {shown.length} of {orders.length}
        </span>
      </div>

      {note && (
        <p className="text-[14px] mb-4" style={{ color: 'var(--muted)' }}>{note}</p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse', minWidth: 980 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Buyer', 'Phone', 'Where', 'Item', 'Plan', 'Paid', 'Due', 'Age', 'State', 'Chase'].map((h) => (
                <th key={h} className="t-label text-left py-2.5 pr-4 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={10} className="py-8" style={{ color: 'var(--muted)' }}>Nothing here.</td></tr>
            )}
            {shown.map((o) => {
              const wa = whatsappLink(o, siteUrl)
              return (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                  <td className="py-3 pr-4">
                    <span className="block">{o.name}</span>
                    <span className="block text-[12.5px]" style={{ color: 'var(--muted)' }}>{o.email}</span>
                  </td>
                  <td className="py-3 pr-4 t-mono text-[13px]">{o.phone ?? '—'}</td>
                  <td className="py-3 pr-4">{[o.city, o.pincode].filter(Boolean).join(' ') || '—'}</td>
                  <td className="py-3 pr-4">
                    {o.edition === 'assembled' ? 'Robot' : 'Kit'} × {o.qty}
                    {o.shell ? <span style={{ color: 'var(--muted)' }}> · {o.shell}</span> : null}
                  </td>
                  <td className="py-3 pr-4">
                    {o.plan === 'full' ? 'Full' : 'Deposit'}
                    {o.couponCode ? <span style={{ color: 'var(--muted)' }}> · {o.couponCode}</span> : null}
                  </td>
                  <td className="py-3 pr-4 t-mono text-[13px]">{rupees(o.paidPaise)}</td>
                  <td className="py-3 pr-4 t-mono text-[13px]">{o.duePaise > 0 ? rupees(o.duePaise) : '—'}</td>
                  <td className="py-3 pr-4" style={{ color: 'var(--muted)' }}>{age(o.createdAt)}</td>
                  <td className="py-3 pr-4">
                    {GROUP_LABEL[o.group]}
                    {o.group === 'unpaid' && o.recoverySentAt
                      ? <span className="block text-[12px]" style={{ color: 'var(--muted)' }}>reminded</span>
                      : null}
                    {o.group === 'balance_due' && o.balanceAskedAt
                      ? <span className="block text-[12px]" style={{ color: 'var(--muted)' }}>asked</span>
                      : null}
                  </td>
                  <td className="py-3 whitespace-nowrap">
                    {wa ? (
                      <a href={wa} target="_blank" rel="noreferrer"
                         className="underline text-[13px]" style={{ color: 'var(--accent-ink)' }}>
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-[13px]" style={{ color: 'var(--muted)' }}>no number</span>
                    )}
                    {o.group === 'balance_due' && (
                      <button type="button" onClick={() => void askBalance(o)} disabled={asking === o.id}
                              className="bg-transparent border-0 p-0 ml-3 underline cursor-pointer text-[13px]"
                              style={{ color: 'var(--muted)' }}>
                        {asking === o.id ? 'sending…' : 'email link'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] mt-8 mb-0" style={{ color: 'var(--muted)' }}>
        WhatsApp opens a chat with the message written; nothing is sent until you press
        send there. “Email link” sends the balance page straight away.
      </p>
    </main>
  )
}
