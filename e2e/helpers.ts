import type { Page } from '@playwright/test'

/**
 * Answer the analytics question before the page loads, so specs that are not
 * about consent exercise the normal post-choice experience. Declining also
 * keeps Mixpanel out of every other test run.
 */
export async function settleConsent(page: Page, value: 'granted' | 'denied' = 'denied') {
  await page.addInitScript(
    ([key, v]) => { try { localStorage.setItem(key as string, v as string) } catch {} },
    ['sc-analytics-consent', value],
  )
}
