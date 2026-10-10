import { describe, it, expect } from 'vitest'
import { SPEC_TABLES } from '@/lib/kit'
import { GET } from '@/app/specs.json/route'

/**
 * The downloadable datasheet is generated, never written out by hand: a
 * second copy of sixteen rows of hardware figures is wrong within a month,
 * and the one people quote back at you is always the file.
 */
describe('/specs.json', () => {
  it('carries every group the page shows', async () => {
    const body = await GET().json()
    expect(body.specifications.map((g: { group: string }) => g.group))
      .toEqual(SPEC_TABLES.map((t) => t.title))
  })

  it('carries every row, with values always as a list', async () => {
    const body = await GET().json()
    const rows = body.specifications.flatMap((g: { rows: unknown[] }) => g.rows)
    expect(rows).toHaveLength(SPEC_TABLES.flatMap((t) => t.rows).length)
    for (const r of rows as { value: unknown }[]) expect(Array.isArray(r.value)).toBe(true)
  })

  it('names both SKUs, because a catalogue needs them', async () => {
    const body = await GET().json()
    expect(body.sku).toEqual({ assembled: 'PBL-BOT-01', kit: 'PBL-KIT-01' })
  })

  it('states the price split the buyer actually pays', async () => {
    const body = await GET().json()
    expect(body.price_inr).toEqual({ total: 4999, booking: 499, on_delivery: 4500 })
  })
})
