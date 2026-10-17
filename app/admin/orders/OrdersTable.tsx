'use client'

import { useMemo, useState } from 'react'
import { GROUPS, GROUP_LABEL, whatsappLink, type AdminOrder, type Group, type Action } from '@/lib/admin-orders'
import AdminNav from '@/app/admin/AdminNav'

/**
 * Every order, in the three states that imply different work, and everything
 * you can do about one.
 *
 * Two things shape this page. The row is a summary and the detail is one
 * click away, because fifteen columns across is not readable and the three
 * that matter — who, how much, how old — are. And every action that settles
 * money says plainly that a person did it: the order ends up with no Razorpay
 * payment against it, and six months later that has to read as a decision
 * rather than a bug.
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

const when = (d: Date | null) =>
  d ? new Date(d).toISOString().slice(0, 16).replace('T', ' ') : '—'

export default function OrdersTable({ initial, siteUrl }: { initial: AdminOrder[]; siteUrl: string }) {
  const [orders, setOrders] = useState(initial)
  const [group, setGroup] = useState<Group | 'all'>('all')
  const [query, setQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [open, setOpen] = useState<number | null>(null)
  const [busy, setBusy] = useState<number | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const live = useMemo(
    () => orders.filter((o) => (showArchived ? o.archivedAt : !o.archivedAt)),
    [orders, showArchived],
  )

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: live.length }
    for (const g of GROUPS) c[g] = live.filter((o) => o.group === g).length
    return c
  }, [live])

  /** What has actually been taken, and what is still out there. */
  const money = useMemo(() => live.reduce(
    (acc, o) => ({ taken: acc.taken + o.paidPaise, owed: acc.owed + (o.group === 'balance_due' ? o.duePaise : 0) }),
    { taken: 0, owed: 0 },
  ), [live])

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return live.filter((o) => {
      if (group !== 'all' && o.group !== group) return false
      if (!q) return true
      return [o.name, o.email, o.phone, o.city, o.pincode, o.couponCode, String(o.id)]
        .filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    })
  }, [live, group, query])

  const refresh = async () => {
    const res = await fetch('/api/admin/orders')
    if (res.ok) setOrders((await res.json()).orders)
  }

  const act = async (o: AdminOrder, action: Action, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return
    setBusy(o.id)
    setNote(null)
    const res = await fetch(`/api/admin/orders/${o.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, ...(action === 'delete' ? { confirm: true } : {}) }),
    })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    setNote(body?.ok ? `#${o.id}: ${body.note ?? 'Done.'}` : `#${o.id}: ${body?.error ?? 'That did not go through.'}`)
    await refresh()
  }

  const askBalance = async (o: AdminOrder) => {
    setBusy(o.id)
    setNote(null)
    const res = await fetch(`/api/admin/orders/${o.id}/ask-balance`, { method: 'POST' })
    const body = await res.json().catch(() => ({}))
    setBusy(null)
    setNote(body?.ok ? `#${o.id}: emailed the balance link.` : `#${o.id}: ${body?.error ?? 'Could not send.'}`)
    await refresh()
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

  const link = (label: string, onClick: () => void, danger = false) => (
    <button type="button" onClick={onClick}
            className="bg-transparent border-0 p-0 underline cursor-pointer text-[13px]"
            style={{ color: danger ? 'var(--danger)' : 'var(--muted)' }}>
      {label}
    </button>
  )

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">Back office</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-5">Orders</h1>
      <AdminNav here="orders" />

      {/* Taken and outstanding, before anything else: they are the two numbers
          that decide what today looks like. */}
      <div className="flex flex-wrap gap-8 mb-7">
        <div>
          <p className="t-label m-0 mb-1">Taken</p>
          <p className="t-display text-[26px] m-0 leading-none">{rupees(money.taken)}</p>
        </div>
        <div>
          <p className="t-label m-0 mb-1">Still owed at the door</p>
          <p className="t-display text-[26px] m-0 leading-none">{rupees(money.owed)}</p>
        </div>
        <div>
          <p className="t-label m-0 mb-1">Orders</p>
          <p className="t-display text-[26px] m-0 leading-none">{live.length}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        {tab('all', 'All')}
        {GROUPS.map((g) => tab(g, GROUP_LABEL[g]))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          className="field"
          placeholder="Name, email, phone, city, code, id"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ maxWidth: 300 }}
        />
        <a href="/api/admin/orders?format=csv" className="btn btn-ghost" style={{ minHeight: 46, fontSize: 14 }}>
          Export CSV
        </a>
        <label className="flex items-center gap-2 text-[14px] cursor-pointer">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Archived
        </label>
        <span className="text-[13px]" style={{ color: 'var(--muted)' }}>
          {shown.length} of {live.length}
        </span>
      </div>

      {note && (
        <p className="text-[14px] mb-4 p-3" style={{ background: 'var(--surface-2)', borderRadius: 10 }}>{note}</p>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['', 'Buyer', 'Phone', 'Item', 'Plan', 'Paid', 'Due', 'Age', 'State', 'Chase'].map((h, i) => (
                <th key={i} className="t-label text-left py-2.5 pr-4 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={10} className="py-8" style={{ color: 'var(--muted)' }}>Nothing here.</td></tr>
            )}
            {shown.map((o) => {
              const wa = whatsappLink(o, siteUrl)
              const isOpen = open === o.id
              return (
                <>
                  <tr key={o.id} style={{ borderBottom: isOpen ? 'none' : '1px solid var(--line-soft)' }}>
                    <td className="py-3 pr-2">
                      <button type="button" onClick={() => setOpen(isOpen ? null : o.id)}
                              aria-expanded={isOpen} aria-label={`Details for order ${o.id}`}
                              className="bg-transparent border-0 cursor-pointer p-0 text-[13px]"
                              style={{ color: 'var(--muted)' }}>
                        {isOpen ? '▾' : '▸'}
                      </button>
                    </td>
                    <td className="py-3 pr-4">
                      <span className="block">
                        {o.name}
                        {o.needsReview && (
                          <span className="ml-2 text-[11px] px-1.5 py-0.5"
                                style={{ background: 'var(--danger)', color: '#fff', borderRadius: 4 }}>
                            review
                          </span>
                        )}
                      </span>
                      <span className="block text-[12.5px]" style={{ color: 'var(--muted)' }}>{o.email}</span>
                    </td>
                    <td className="py-3 pr-4 t-mono text-[13px]">{o.phone ?? '—'}</td>
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
                        ? <span className="block text-[12px]" style={{ color: 'var(--muted)' }}>reminded</span> : null}
                      {o.group === 'balance_due' && o.balanceAskedAt
                        ? <span className="block text-[12px]" style={{ color: 'var(--muted)' }}>asked</span> : null}
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
                    </td>
                  </tr>

                  {isOpen && (
                    <tr key={`${o.id}-detail`} style={{ borderBottom: '1px solid var(--line-soft)' }}>
                      <td />
                      <td colSpan={9} className="pb-5 pr-4">
                        <div className="grid gap-x-10 gap-y-2 sm:grid-cols-2" style={{ maxWidth: 820 }}>
                          <Row k="Ships to" v={[o.address, o.city, o.pincode].filter(Boolean).join(', ') || '—'} />
                          <Row k="Booked" v={when(o.createdAt)} />
                          <Row k="Deposit paid" v={when(o.paidAt)} />
                          <Row k="Balance paid online" v={when(o.balancePaidAt)} />
                          <Row k="Balance collected" v={when(o.balanceCollectedAt)} />
                          <Row k="Razorpay order" v={o.razorpayOrderId ?? '—'} mono />
                          <Row k="Razorpay payment" v={o.razorpayPaymentId ?? '—'} mono />
                          <Row k="Balance payment" v={o.balancePaymentId ?? '—'} mono />
                          <Row k="Discount" v={o.discountPaise ? `${rupees(o.discountPaise)} (${o.couponCode})` : '—'} />
                          <Row k="Price arm" v={o.variant ?? 'standard'} />
                          <Row k="Payment link" v={`${siteUrl}/checkout?t=${o.token}`} mono />
                          {o.adminNote ? <Row k="By hand" v={o.adminNote} /> : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4"
                             style={{ borderTop: '1px solid var(--line-soft)' }}>
                          {busy === o.id && <span className="text-[13px]" style={{ color: 'var(--muted)' }}>working…</span>}

                          {o.group === 'unpaid' && link('Mark deposit paid', () => act(
                            o, 'mark_deposit_paid',
                            `Mark order #${o.id} as paid? No Razorpay payment will be attached to it.`,
                          ))}

                          {o.group === 'balance_due' && link('Mark balance collected', () => act(
                            o, 'mark_balance_collected',
                            `Mark the ${rupees(o.duePaise)} balance on #${o.id} as collected? The courier will be told to collect nothing.`,
                          ))}

                          {o.group === 'balance_due' && link('Email the balance link', () => askBalance(o))}

                          {o.needsReview && link('Clear review flag', () => act(o, 'clear_review'))}

                          {o.archivedAt
                            ? link('Put back in the list', () => act(o, 'unarchive'))
                            : link('Archive', () => act(o, 'archive', `Archive order #${o.id}? It stays in the database and in the CSV.`))}

                          {link('Delete for good', () => act(
                            o, 'delete',
                            `Delete order #${o.id} (${o.name}) permanently? This cannot be undone. Archive instead if you only want it out of the way.`,
                          ), true)}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[13px] mt-8 mb-0" style={{ color: 'var(--muted)' }}>
        WhatsApp opens a chat with the message written; nothing is sent until you press
        send there. Marking something paid records that a person did it — the order will
        have no Razorpay payment against it, on purpose.
      </p>
    </main>
  )
}

function Row({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="t-label shrink-0" style={{ minWidth: 150 }}>{k}</span>
      <span className={mono ? 't-mono text-[12.5px]' : 'text-[13.5px]'} style={{ wordBreak: 'break-all' }}>{v}</span>
    </div>
  )
}
