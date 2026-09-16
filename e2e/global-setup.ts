import { request } from '@playwright/test'

/**
 * `next dev` compiles a route the first time it is requested, and that build
 * can take longer than an assertion timeout. Whichever test happened to hit a
 * cold route first would fail, which looked like flakiness and was not.
 *
 * Warming every route the suite touches makes the first test as fast as the
 * hundredth, and removes the whole class of failure.
 */
export default async function globalSetup() {
  const ctx = await request.newContext({ baseURL: 'http://localhost:3000' })
  const started = Date.now()

  await ctx.get('/')
  await ctx.post('/api/preorder', { data: {}, failOnStatusCode: false })
  await ctx.get('/media/unit.webp', { failOnStatusCode: false })

  console.log(`  warmed routes in ${Date.now() - started}ms`)
  await ctx.dispose()
}
