'use client'

import { useState } from 'react'
import AdminNav from '@/app/admin/AdminNav'
import { REASONS, REASON_LABEL, DIRECTION, type Move, type Reason, type Stock } from '@/lib/inventory'
import { EDITIONS } from '@/lib/kit'
import { ORDERABLE_SHELLS, shellById } from '@/lib/shells'

/**
 * The shelf.
 *
 * Three numbers per line and one of them matters: available, which is what is
 * on the bench minus what paid orders have already claimed. On hand and
 * committed are shown beside it only so that a surprising available can be
 * explained without opening anything.
 *
 * Plain and dense, like the rest of the back office: a tool for the person
 * who built the things it counts.
 */

type Unstocked = { edition: string | null; shell: string | null; units: number }

const colourName = (shell: string | null) => (shell ? shellById(shell).name : 'no colour')

export default function InventoryAdmin({ initial }: {
  initial: { stock: Stock[]; unstocked: Unstocked[]; moves: Move[] }
}) {
  const [{ stock, unstocked, moves }, setData] = useState(initial)
  const [selected, setSelected] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [said, setSaid] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [adding, setAdding] = useState(false)

  const reload = async () => {
    const res = await fetch('/api/admin/inventory')
    if (res.ok) setData(await res.json())
  }

  const send = async (body: Record<string, unknown>) => {
    setBusy(true)
    setError(null)
    setSaid(null)
    const res = await fetch('/api/admin/inventory', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const out = await res.json().catch(() => ({}))
    setBusy(false)
    if (!out?.ok) {
      setError(String(out?.error ?? 'That did not go through.'))
      return false
    }
    setSaid(out.note ? String(out.note) : 'Done.')
    await reload()
    return true
  }

  const finished = stock.filter((s) => s.kind === 'finished')
  const parts = stock.filter((s) => s.kind === 'part')
  const item = stock.find((s) => s.sku === selected) ?? null

  const onBench = finished.reduce((n, s) => n + s.onHand, 0)
  const committed = finished.reduce((n, s) => n + s.committed, 0)
  const short = finished.reduce((n, s) => n + Math.max(0, -s.available), 0)
  const low = stock.filter((s) => s.low).length

  const addItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const str = (k: string) => String(form.get(k) ?? '').trim()
    const kind = str('kind') as 'finished' | 'part'
    const ok = await send({
      action: 'create',
      sku: str('sku'),
      name: str('name'),
      kind,
      edition: kind === 'finished' ? str('edition') : undefined,
      shell: kind === 'finished' && str('shell') ? str('shell') : undefined,
      onHand: str('onHand') || undefined,
      reorderAt: str('reorderAt') || undefined,
      note: str('note') || undefined,
    })
    if (ok) {
      e.currentTarget.reset()
      setAdding(false)
    }
  }

  const move = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!item) return
    const form = new FormData(e.currentTarget)
    const reason = String(form.get('reason') ?? 'built') as Reason
    const size = Math.abs(Number(form.get('size') ?? 0))
    // The form asks for a count of things, never a sign: "damaged −2" and
    // "damaged 2" are the same event, and only one of them is typeable here.
    const delta = DIRECTION[reason] === 'out' ? -size : size
    if (await send({ action: 'move', sku: item.sku, delta, reason, note: String(form.get('note') ?? '') || undefined })) {
      e.currentTarget.reset()
    }
  }

  const count = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!item) return
    const counted = Number(new FormData(e.currentTarget).get('counted') ?? 0)
    if (await send({ action: 'count', sku: item.sku, counted })) e.currentTarget.reset()
  }

  return (
    <main className="wrap" style={{ paddingBlock: '48px 96px' }}>
      <p className="t-label m-0 mb-2">Back office</p>
      <h1 className="t-display text-[clamp(26px,4vw,34px)] mt-0 mb-6">Stock</h1>
      <AdminNav here="inventory" />

      <div className="grid gap-5 sm:grid-cols-4 mb-10">
        <Figure label="On the bench" value={String(onBench)} />
        <Figure label="Already sold" value={String(committed)} />
        <Figure label="Still to build" value={String(short)} tone={short > 0 ? 'warn' : undefined} />
        <Figure label="Running low" value={String(low)} tone={low > 0 ? 'warn' : undefined} />
      </div>

      {unstocked.length > 0 && (
        <div className="card p-6 mb-10" style={{ maxWidth: 640 }}>
          <p className="t-label m-0 mb-3">Sold, with nothing counting it</p>
          <ul className="list-none p-0 m-0 grid gap-1.5">
            {unstocked.map((u) => (
              <li key={`${u.edition}:${u.shell}`} className="text-[14px]">
                <strong className="font-medium">{u.units}</strong> × {u.edition ?? 'unknown edition'}, {colourName(u.shell)}
              </li>
            ))}
          </ul>
          <p className="text-[13px] mt-3 mb-0" style={{ color: 'var(--muted)' }}>
            Paid orders waiting on something no SKU below stocks. Add one and they count against it.
          </p>
        </div>
      )}

      {(error || said) && (
        <p className="text-[14px] mb-6" style={{ color: error ? 'var(--danger)' : 'var(--muted)' }}>
          {error ?? said}
        </p>
      )}

      <Shelf
        title="Robots"
        rows={finished}
        selected={selected}
        onPick={(sku) => { setSelected(sku === selected ? null : sku); setError(null); setSaid(null) }}
        showDemand
      />

      {parts.length > 0 && (
        <Shelf
          title="Parts"
          rows={parts}
          selected={selected}
          onPick={(sku) => { setSelected(sku === selected ? null : sku); setError(null); setSaid(null) }}
          showDemand={false}
        />
      )}

      {item && (
        <div className="card p-6 mt-8" style={{ maxWidth: 760 }}>
          <p className="t-label m-0 mb-1">{item.sku}</p>
          <p className="t-display text-[20px] mt-0 mb-5">
            {item.name} · {item.onHand} on hand
          </p>

          <form onSubmit={move} className="grid gap-4 sm:grid-cols-4 items-end">
            <label className="block">
              <span className="t-label block mb-1.5">How many</span>
              <input name="size" className="field" inputMode="numeric" required defaultValue="1" />
            </label>
            <label className="block">
              <span className="t-label block mb-1.5">What happened</span>
              <select name="reason" className="field" defaultValue="built">
                {REASONS.filter((r) => r !== 'count').map((r) => (
                  <option key={r} value={r}>{REASON_LABEL[r]}</option>
                ))}
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="t-label block mb-1.5">Note</span>
              <input name="note" className="field" placeholder="optional" />
            </label>
            <button type="submit" disabled={busy} className="btn btn-brand">
              {busy ? 'Saving…' : 'Record it'}
            </button>
          </form>

          <form onSubmit={count} className="grid gap-4 sm:grid-cols-4 items-end mt-6 pt-6 border-t"
                style={{ borderColor: 'var(--line)' }}>
            <label className="block">
              <span className="t-label block mb-1.5">Counted on the bench</span>
              <input name="counted" className="field" inputMode="numeric" required placeholder={String(item.onHand)} />
            </label>
            <button type="submit" disabled={busy} className="btn btn-ghost btn-sm">Set to this</button>
            <p className="text-[13px] m-0 sm:col-span-2" style={{ color: 'var(--muted)' }}>
              Replaces the figure with what is actually there. The difference goes in the ledger.
            </p>
          </form>

          <div className="flex flex-wrap items-center gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'var(--line)' }}>
            <button type="button" disabled={busy} className="btn btn-ghost btn-sm"
                    onClick={() => send({ action: 'update', sku: item.sku, active: !item.active })}>
              {item.active ? 'Retire this SKU' : 'Bring it back'}
            </button>
            <label className="flex items-center gap-2 text-[14px]">
              <span className="t-label">Warn at or below</span>
              <input
                className="field" style={{ width: 90 }} inputMode="numeric"
                defaultValue={item.reorderAt ?? ''} placeholder="never"
                onBlur={(e) => {
                  const raw = e.currentTarget.value.trim()
                  const next = raw === '' ? null : Number(raw)
                  if (next === (item.reorderAt ?? null)) return
                  if (next !== null && !Number.isInteger(next)) return
                  void send({ action: 'update', sku: item.sku, reorderAt: next })
                }}
              />
            </label>
          </div>
        </div>
      )}

      <div className="mt-10">
        {adding ? (
          <form onSubmit={addItem} className="card p-6" style={{ maxWidth: 760 }}>
            <p className="t-label m-0 mb-4">Something new to count</p>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="t-label block mb-1.5">SKU</span>
                <input name="sku" className="field" required placeholder="PBL-EMBER" autoCapitalize="characters" />
              </label>
              <label className="block sm:col-span-2">
                <span className="t-label block mb-1.5">Name</span>
                <input name="name" className="field" required placeholder="PebbleRobo, Ember" />
              </label>

              <label className="block">
                <span className="t-label block mb-1.5">Kind</span>
                <select name="kind" className="field" defaultValue="finished">
                  <option value="finished">Something we sell</option>
                  <option value="part">A part</option>
                </select>
              </label>
              <label className="block">
                <span className="t-label block mb-1.5">Edition</span>
                <select name="edition" className="field" defaultValue="assembled">
                  {EDITIONS.map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="t-label block mb-1.5">Colour</span>
                <select name="shell" className="field" defaultValue="">
                  <option value="">No colour</option>
                  {ORDERABLE_SHELLS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>

              <label className="block">
                <span className="t-label block mb-1.5">On hand now</span>
                <input name="onHand" className="field" inputMode="numeric" placeholder="0" />
              </label>
              <label className="block">
                <span className="t-label block mb-1.5">Warn at or below</span>
                <input name="reorderAt" className="field" inputMode="numeric" placeholder="never" />
              </label>
              <label className="block">
                <span className="t-label block mb-1.5">Note</span>
                <input name="note" className="field" placeholder="optional" />
              </label>
            </div>

            <div className="flex items-center gap-3 mt-5">
              <button type="submit" disabled={busy} className="btn btn-brand">{busy ? 'Adding…' : 'Add it'}</button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(false)}>Cancel</button>
            </div>
            <p className="text-[13px] mt-4 mb-0" style={{ color: 'var(--muted)' }}>
              Edition and colour are what paid orders are matched on, so one SKU per
              combination. A part is counted by hand: no order mentions one.
            </p>
          </form>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdding(true)}>Add something to count</button>
        )}
      </div>

      <div className="mt-12">
        <p className="t-label m-0 mb-3">What has moved</p>
        {moves.length === 0 ? (
          <p className="text-[14px] m-0" style={{ color: 'var(--muted)' }}>Nothing yet.</p>
        ) : (
          <ul className="list-none p-0 m-0 grid gap-1.5">
            {moves.map((m) => (
              <li key={m.id} className="text-[14px]">
                <span className="t-mono" style={{ color: 'var(--muted)' }}>
                  {new Date(m.at).toISOString().slice(0, 16).replace('T', ' ')}
                </span>{' '}
                <strong className="font-medium">{m.delta > 0 ? `+${m.delta}` : m.delta}</strong>{' '}
                {m.sku} · {REASON_LABEL[m.reason]}
                {m.orderId ? ` · order ${m.orderId}` : ''}
                {m.note ? ` · ${m.note}` : ''}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}

function Shelf({ title, rows, selected, onPick, showDemand }: {
  title: string
  rows: Stock[]
  selected: string | null
  onPick: (sku: string) => void
  showDemand: boolean
}) {
  const heads = showDemand
    ? ['SKU', 'What', 'On hand', 'Sold', 'Can promise', 'Warn at', '']
    : ['SKU', 'What', 'On hand', 'Warn at', '']

  return (
    <div className="mt-8" style={{ overflowX: 'auto' }}>
      <p className="t-label m-0 mb-3">{title}</p>
      <table className="w-full text-[14px]" style={{ borderCollapse: 'collapse', minWidth: 720 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--line)' }}>
            {heads.map((h) => <th key={h} className="t-label text-left py-2.5 pr-4 font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={heads.length} className="py-6" style={{ color: 'var(--muted)' }}>
              Nothing counted yet.
            </td></tr>
          )}
          {rows.map((s) => (
            <tr key={s.sku}
                onClick={() => onPick(s.sku)}
                style={{
                  borderBottom: '1px solid var(--line-soft)',
                  cursor: 'pointer',
                  opacity: s.active ? 1 : 0.55,
                  background: selected === s.sku ? 'var(--line-soft)' : undefined,
                }}>
              <td className="py-3 pr-4 t-mono">{s.sku}</td>
              <td className="py-3 pr-4">
                {s.name}
                {s.shell && (
                  <span aria-hidden="true" className="inline-block align-middle ml-2"
                        style={{ width: 10, height: 10, borderRadius: 999, background: shellById(s.shell).hex }} />
                )}
              </td>
              <td className="py-3 pr-4">{s.onHand}</td>
              {showDemand && <td className="py-3 pr-4">{s.committed}</td>}
              {showDemand && (
                <td className="py-3 pr-4" style={{ color: s.available < 0 ? 'var(--danger)' : undefined }}>
                  {s.available}
                </td>
              )}
              <td className="py-3 pr-4" style={{ color: s.low ? 'var(--danger)' : undefined }}>
                {s.reorderAt ?? '—'}
              </td>
              <td className="py-3" style={{ color: 'var(--muted)' }}>
                {!s.active ? 'retired' : s.low ? 'low' : ''}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: 'warn' }) {
  return (
    <div>
      <p className="t-label m-0 mb-1.5">{label}</p>
      <p className="t-display text-[30px] m-0 leading-none"
         style={{ color: tone === 'warn' ? 'var(--danger)' : undefined }}>{value}</p>
    </div>
  )
}
