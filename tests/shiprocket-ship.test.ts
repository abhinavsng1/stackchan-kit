import { describe, it, expect, vi } from 'vitest'
import { nextStep, type ShipState } from '@/lib/shiprocket/ship'

/**
 * The chain is four calls and only the first is idempotent: Shiprocket's
 * create returns an existing order for a known order_id, but assign/awb,
 * generate/pickup and generate/label have no idempotency key at all. Their
 * backstops — three AWB assignments a day, "Already in Pickup Queue." — are
 * backstops, not a design. The gate is ours, and this is it.
 */

const fresh: ShipState = {
  srOrderId: null, srShipmentId: null, awbCode: null,
  pickupScheduledDate: null, labelUrl: null,
}

describe('nextStep', () => {
  it('starts by asking whether the pincode can take cash at all', () => {
    expect(nextStep(fresh)).toBe('serviceability')
  })

  it('creates once, then never again', () => {
    const created = { ...fresh, srOrderId: 1, srShipmentId: 2 }
    expect(nextStep(created)).toBe('awb')
  })

  it('does not reassign a waybill it already has', () => {
    // Shiprocket caps this at three a day and bills for the reassignment.
    const awb = { ...fresh, srOrderId: 1, srShipmentId: 2, awbCode: '190414' }
    expect(nextStep(awb)).toBe('pickup')
  })

  it('does not book a second courier visit', () => {
    const picked = {
      ...fresh, srOrderId: 1, srShipmentId: 2, awbCode: '190414',
      pickupScheduledDate: '2026-10-09',
    }
    expect(nextStep(picked)).toBe('label')
  })

  it('is finished once there is a label', () => {
    const done = {
      srOrderId: 1, srShipmentId: 2, awbCode: '190414',
      pickupScheduledDate: '2026-10-09', labelUrl: 'https://x/l.pdf',
    }
    expect(nextStep(done)).toBe('done')
  })

  it('resumes mid-chain after a failure rather than starting over', () => {
    // An order that created and then failed at AWB must not create again:
    // Shiprocket would return the same order, but every later step would be
    // running against state we did not re-read.
    const halfway = { ...fresh, srOrderId: 1, srShipmentId: 2 }
    expect(nextStep(halfway)).not.toBe('create')
  })
})

describe('the pickup boundary', () => {
  it('names pickup as the irreversible step', async () => {
    const { IRREVERSIBLE } = await import('@/lib/shiprocket/ship')
    // Everything before this is free to retry; this one summons a van.
    expect(IRREVERSIBLE).toContain('pickup')
    expect(IRREVERSIBLE).not.toContain('create')
    expect(IRREVERSIBLE).not.toContain('label')
  })
})

describe('shipOrder', () => {
  it('stops before creating when no courier will take cash there', async () => {
    const calls: string[] = []
    const { runChain } = await import('@/lib/shiprocket/ship')
    const result = await runChain(fresh, {
      serviceability: async () => { calls.push('serviceability'); return { ok: false, reason: 'No courier serves this pincode.', body: {} } },
      create: async () => { calls.push('create'); return { ok: true, body: {} } },
      awb: async () => { calls.push('awb'); return { ok: true, body: {} } },
      pickup: async () => { calls.push('pickup'); return { ok: true, body: {} } },
      label: async () => { calls.push('label'); return { ok: true, body: {} } },
    }, { untilPickup: false })
    expect(calls).toEqual(['serviceability'])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.failedAt).toBe('serviceability')
  })

  it('stops short of the courier visit when asked to', async () => {
    // The admin confirms pickup separately, because it is the step that
    // cannot be undone.
    const calls: string[] = []
    const step = (n: string) => async () => { calls.push(n); return { ok: true as const, body: {} } }
    const { runChain } = await import('@/lib/shiprocket/ship')
    await runChain(fresh, {
      serviceability: step('serviceability'), create: step('create'),
      awb: step('awb'), pickup: step('pickup'), label: step('label'),
    }, { untilPickup: true })
    expect(calls).toEqual(['serviceability', 'create', 'awb'])
    expect(calls).not.toContain('pickup')
  })

  it('reports which step failed, not just that something did', async () => {
    const step = (n: string) => async () => { void n; return { ok: true as const, body: {} } }
    const { runChain } = await import('@/lib/shiprocket/ship')
    const r = await runChain(fresh, {
      serviceability: step('s'), create: step('c'),
      awb: async () => ({ ok: false, reason: 'Please recharge your ShipRocket wallet', walletEmpty: true, body: {} }),
      pickup: step('p'), label: step('l'),
    }, { untilPickup: false })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.failedAt).toBe('awb')
    expect(r.reason).toMatch(/recharge/i)
  })
})

describe('a booking registered the moment it is paid', () => {
  it('stops after the order and never assigns a waybill', async () => {
    // A waybill assigned today for a robot that ships in a fortnight is a
    // stale waybill, and the courier it picks is chosen on today's rates
    // rather than the day's it actually travels.
    const ran: string[] = []
    const step = (name: string) => async () => { ran.push(name); return { ok: true as const, body: {} } }
    const { runChain } = await import('@/lib/shiprocket/ship')

    const out = await runChain(
      { srOrderId: null, srShipmentId: null, awbCode: null, pickupScheduledDate: null, labelUrl: null },
      {
        serviceability: step('serviceability'), create: step('create'), awb: step('awb'),
        pickup: step('pickup'), label: step('label'),
      },
      { untilPickup: true, stopAfter: 'create' },
    )

    expect(out.ok).toBe(true)
    expect(ran).toEqual(['serviceability', 'create'])
    expect(ran).not.toContain('awb')
    expect(ran).not.toContain('pickup')
  })

  it('still runs the whole reversible half when nothing asks it to stop', async () => {
    const ran: string[] = []
    const step = (name: string) => async () => { ran.push(name); return { ok: true as const, body: {} } }
    const { runChain } = await import('@/lib/shiprocket/ship')
    await runChain(
      { srOrderId: null, srShipmentId: null, awbCode: null, pickupScheduledDate: null, labelUrl: null },
      {
        serviceability: step('serviceability'), create: step('create'), awb: step('awb'),
        pickup: step('pickup'), label: step('label'),
      },
      { untilPickup: true },
    )
    // Pickup is the irreversible one and is still never reached here.
    expect(ran).toEqual(['serviceability', 'create', 'awb'])
  })
})

describe('whether the courier is wired up at all', () => {
  it('stays off until the account is actually configured', async () => {
    const { autoCreateEnabled } = await import('@/lib/shiprocket/on-paid')
    delete process.env.SHIPROCKET_AUTO_CREATE
    expect(autoCreateEnabled()).toBe(false)

    // The flag alone is not enough: half a configuration would mean a paid
    // booking failing against a courier that was never set up.
    process.env.SHIPROCKET_AUTO_CREATE = '1'
    expect(autoCreateEnabled()).toBe(false)

    process.env.SHIPROCKET_EMAIL = 'a@b.c'
    process.env.SHIPROCKET_PASSWORD = 'x'
    expect(autoCreateEnabled()).toBe(false)

    process.env.SHIPROCKET_PICKUP_LOCATION = 'Home'
    process.env.SHIPROCKET_PICKUP_PINCODE = '560078'
    expect(autoCreateEnabled()).toBe(true)

    for (const k of ['SHIPROCKET_AUTO_CREATE', 'SHIPROCKET_EMAIL', 'SHIPROCKET_PASSWORD',
                     'SHIPROCKET_PICKUP_LOCATION', 'SHIPROCKET_PICKUP_PINCODE']) delete process.env[k]
  })
})

describe('the parcel we declare', () => {
  const set = (cm: string, kg: string) => {
    process.env.SHIPROCKET_AUTO_CREATE = '1'
    process.env.SHIPROCKET_EMAIL = 'a@b.c'
    process.env.SHIPROCKET_PASSWORD = 'x'
    process.env.SHIPROCKET_PICKUP_LOCATION = 'Home'
    process.env.SHIPROCKET_PICKUP_PINCODE = '560078'
    process.env.SHIPROCKET_BOX_CM = cm
    process.env.SHIPROCKET_BOX_KG = kg
  }
  const clear = () => {
    for (const k of ['SHIPROCKET_AUTO_CREATE','SHIPROCKET_EMAIL','SHIPROCKET_PASSWORD',
      'SHIPROCKET_PICKUP_LOCATION','SHIPROCKET_PICKUP_PINCODE','SHIPROCKET_BOX_CM',
      'SHIPROCKET_BOX_KG']) delete process.env[k]
  }

  it('carries the real box, decimals and all', async () => {
    // 17.8 x 10.2 x 8.9 cm, 0.3 kg. Integers-only parsing would silently
    // ship a 17 x 10 x 8 carton, which is a different parcel.
    set('17.8x10.2x8.9', '0.3')
    const { parseBox } = await import('@/lib/shiprocket/on-paid')
    expect(parseBox()).toEqual({ length: 17.8, breadth: 10.2, height: 8.9, weight: 0.3 })
    clear()
  })

  it('declares the actual weight, not the billed one', async () => {
    // Volumetric here is 0.32 kg and Shiprocket's floor is 0.5 kg, so every
    // order bills at 0.5 whatever we say. Declaring 0.5 would state a
    // heavier parcel than we hand over and change nothing about the bill.
    set('17.8x10.2x8.9', '0.3')
    const { parseBox } = await import('@/lib/shiprocket/on-paid')
    const box = parseBox()!
    const volumetric = (box.length * box.breadth * box.height) / 5000
    expect(Number(volumetric.toFixed(2))).toBe(0.32)
    expect(box.weight).toBeLessThan(volumetric)
    clear()
  })

  it('refuses a box that is missing a side or weighs nothing', async () => {
    const { parseBox } = await import('@/lib/shiprocket/on-paid')
    set('17.8x10.2', '0.3');      expect(parseBox()).toBe(null)
    set('17.8x10.2x8.9', '0');    expect(parseBox()).toBe(null)
    set('17.8xWIDExDEEP', '0.3'); expect(parseBox()).toBe(null)
    clear()
  })
})
