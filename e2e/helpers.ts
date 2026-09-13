import type { Page } from '@playwright/test'

/**
 * Kept as a no-op so specs read the same after the consent gate was removed.
 * Analytics now starts on load; the SDKs are stubbed per-spec where needed.
 */
export async function settleConsent(_page: Page) {
  // nothing to settle
}
