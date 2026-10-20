import { afterEach, describe, expect, it, vi } from 'vitest'
import crypto from 'node:crypto'
import { magicKeysInUse, verifyWebhookSignature } from '@/lib/razorpay'

/**
 * Two Razorpay accounts at once: the form on live keys, the one-tap window on
 * test keys while it is being proved out.
 */

afterEach(() => vi.unstubAllEnvs())

const sign = (body: string, secret: string) =>
  crypto.createHmac('sha256', secret).update(body).digest('hex')

describe('which keys the one-tap window uses', () => {
  it('uses the live keys unless a whole test pair is present', () => {
    expect(magicKeysInUse()).toBe(false)
    // Half a pair is how a live card gets charged against a test order.
    vi.stubEnv('MAGIC_RAZORPAY_KEY_ID', 'rzp_test_x')
    expect(magicKeysInUse()).toBe(false)
    vi.stubEnv('MAGIC_RAZORPAY_KEY_SECRET', 'secret')
    expect(magicKeysInUse()).toBe(true)
  })
})

describe('webhook signatures, with two accounts sending', () => {
  it('accepts the live secret', () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'live-secret')
    expect(verifyWebhookSignature('{"a":1}', sign('{"a":1}', 'live-secret'))).toBe(true)
  })

  it('accepts the test secret too', () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'live-secret')
    vi.stubEnv('MAGIC_RAZORPAY_WEBHOOK_SECRET', 'test-secret')
    expect(verifyWebhookSignature('{"a":1}', sign('{"a":1}', 'test-secret'))).toBe(true)
  })

  it('still refuses a signature from neither', () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'live-secret')
    vi.stubEnv('MAGIC_RAZORPAY_WEBHOOK_SECRET', 'test-secret')
    expect(verifyWebhookSignature('{"a":1}', sign('{"a":1}', 'guessed'))).toBe(false)
  })

  it('refuses everything when no secret is configured at all', () => {
    expect(verifyWebhookSignature('{"a":1}', sign('{"a":1}', 'anything'))).toBe(false)
  })

  it('refuses a body that was altered after signing', () => {
    vi.stubEnv('RAZORPAY_WEBHOOK_SECRET', 'live-secret')
    expect(verifyWebhookSignature('{"a":2}', sign('{"a":1}', 'live-secret'))).toBe(false)
  })
})
