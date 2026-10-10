/**
 * Sends one test Lead to the X Conversion API and prints what X answers.
 *
 *   node scripts/x-test-conversion.mjs
 *
 * Reads X_PIXEL_TOKEN and NEXT_PUBLIC_X_EVENT_LEAD from the environment or
 * from .env.local (`vercel env pull .env.local --yes`). A 200 means the token,
 * the pixel and the event id all line up. The conversion is a real one as far
 * as X is concerned — it is sent under an obviously fake identity and a
 * `test-` conversion id so it can be told apart in Events Manager.
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

const envFile = new URL('../.env.local', import.meta.url)
const local = existsSync(envFile) ? readFileSync(envFile, 'utf8') : ''
const env = (key) =>
  process.env[key] ?? local.match(new RegExp(`^${key}="?([^"\\n]+)"?`, 'm'))?.[1]

const token = env('X_PIXEL_TOKEN')
const eventId = env('NEXT_PUBLIC_X_EVENT_LEAD')
if (!token || !eventId) {
  console.error('Set X_PIXEL_TOKEN and NEXT_PUBLIC_X_EVENT_LEAD first (or pull them into .env.local).')
  process.exit(1)
}

const sha = (v) => createHash('sha256').update(v).digest('hex')
const body = {
  conversions: [{
    conversion_time: new Date().toISOString(),
    event_id: eventId,
    event_source_url: 'https://pebblerobo.com/',
    conversion_id: `test-${Date.now()}`,
    identifiers: [{ hashed_email: sha('x-test-conversion@pebblerobo.com') }],
  }],
}

const res = await fetch('https://ads-api.x.com/12/measurement/conversions/rfx4u', {
  method: 'POST',
  headers: { 'X-Pixel-Token': token, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
console.log(res.status, await res.text())
process.exit(res.ok ? 0 : 1)
