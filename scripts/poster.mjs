/**
 * Renders the campaign posters from the same constants the site charges from.
 *
 * These are advertising assets: a price on one of them that disagrees with
 * the price the gateway takes is not a cosmetic bug, it is a false offer
 * running on Meta. So nothing here is typed by hand — the price, the saving,
 * the SKU and the deadline are all read out of lib/kit.ts, and the whole set
 * is regenerated with `node scripts/poster.mjs` whenever any of them change.
 *
 * Three sizes, because they have three different jobs:
 *   og      1200x630   link previews on WhatsApp, Twitter, Slack
 *   feed    1080x1080  Meta and Instagram feed
 *   story   1080x1350  Meta 4:5, the placement that gets the most reach
 */
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const kit = readFileSync(join(ROOT, 'lib/kit.ts'), 'utf8')

const pick = (re, what) => {
  const m = kit.match(re)
  if (!m) throw new Error(`could not read ${what} from lib/kit.ts`)
  return m[1]
}
const NOW = pick(/now: '([^']+)'/, 'price')
const MRP = pick(/mrp: '([^']+)'/, 'mrp')
const SAVE = pick(/save: '([^']+)'/, 'saving')
const SKU = pick(/export const SKU = '([^']+)'/, 'sku')
const ENDS = pick(/endsAt: '([^']+)'/, 'deadline')

const endsOn = new Date(ENDS).toLocaleDateString('en-IN', {
  day: 'numeric', month: 'long', timeZone: 'Asia/Kolkata',
})
const days = Math.max(
  1, Math.ceil((new Date(ENDS).getTime() - Date.now()) / 86_400_000))

const dataUri = (p, mime) =>
  `data:${mime};base64,${readFileSync(join(ROOT, 'public', p)).toString('base64')}`

const SHOT = dataUri('media/unit-demo-poster.webp', 'image/webp')
const LOGO = dataUri('brand/logo-horizontal-white.svg', 'image/svg+xml')

/** Shared page. Layout differs only by aspect, so one template covers all three. */
const html = ({ w, h, wide }) => `<!doctype html>
<html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:${w}px;height:${h}px;background:#0b0b0c;color:#f3f1ed;
       font-family:Outfit,system-ui,sans-serif;overflow:hidden;position:relative}
  .shot{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;
        object-position:56% 58%;filter:brightness(1.18) saturate(1.06)}
  /* Landscape keeps the type on the left and the product on the right.
     Portrait puts the type at the foot and leaves the middle of the frame
     clear, because a scrim strong enough to read against everywhere is a
     scrim that hides the thing being advertised. */
  .scrim{position:absolute;inset:0;background:${wide
    ? `linear-gradient(to right, rgba(11,11,12,.95) 0%, rgba(11,11,12,.88) 46%,
        rgba(11,11,12,.25) 78%, rgba(11,11,12,.15) 100%)`
    : `linear-gradient(to top, rgba(11,11,12,.97) 0%, rgba(11,11,12,.93) 34%,
        rgba(11,11,12,.22) 66%, rgba(11,11,12,.62) 100%)`}}
  .pad{position:absolute;inset:0;padding:${wide ? '58px 64px' : '64px 60px'};
       display:flex;flex-direction:column;${wide ? 'width:62%;' : ''}}
  .logo{width:${wide ? 168 : 200}px;height:auto;opacity:.95;align-self:flex-start}
  /* In portrait the block sits at the foot, so the gap goes above it. */
  .flag{display:inline-flex;align-items:center;gap:10px;align-self:flex-start;
        border:1px solid rgba(243,241,237,.34);border-radius:999px;
        padding:9px 18px;margin-top:${wide ? '26px' : 'auto'};
        font-family:'JetBrains Mono',monospace;font-size:${wide ? 15 : 18}px;
        letter-spacing:.20em;text-transform:uppercase}
  .dot{width:8px;height:8px;border-radius:50%;background:#f3f1ed}
  h1{font-size:${wide ? 62 : 84}px;line-height:1.0;font-weight:500;
     letter-spacing:-.02em;margin-top:${wide ? '24px' : '30px'};max-width:15ch}
  .price{display:flex;align-items:baseline;gap:${wide ? 18 : 24}px;
         margin-top:${wide ? '30px' : '38px'}}
  .now{font-size:${wide ? 84 : 118}px;font-weight:600;letter-spacing:-.03em;line-height:1}
  .mrp{font-family:'JetBrains Mono',monospace;font-size:${wide ? 28 : 38}px;
       text-decoration:line-through;color:rgba(243,241,237,.45)}
  .save{font-family:'JetBrains Mono',monospace;font-size:${wide ? 22 : 30}px;
        color:rgba(243,241,237,.82)}
  .sub{font-size:${wide ? 22 : 30}px;line-height:1.45;color:rgba(243,241,237,.78);
       margin-top:${wide ? '20px' : '26px'};max-width:34ch}
  .foot{margin-top:${wide ? 'auto' : '46px'};padding-top:${wide ? '26px' : '38px'};
        border-top:1px solid rgba(243,241,237,.18);
        display:flex;align-items:baseline;gap:${wide ? 22 : 28}px;flex-wrap:wrap;
        font-family:'JetBrains Mono',monospace;font-size:${wide ? 17 : 23}px;
        color:rgba(243,241,237,.62)}
  .site{color:#f3f1ed}
</style></head><body>
  <img class="shot" src="${SHOT}" alt="">
  <div class="scrim"></div>
  <div class="pad">
    <img class="logo" src="${LOGO}" alt="Pebble Robotics">
    <span class="flag"><span class="dot"></span>Early bird · ${days} days left</span>
    <h1>Build the robot.<br>Then teach it.</h1>
    <div class="price">
      <span class="now">${NOW}</span>
      <span class="mrp">${MRP}</span>
      <span class="save">${SAVE}</span>
    </div>
    <p class="sub">Eight parts, one evening, no soldering. After that it runs
      whatever you write.</p>
    <div class="foot">
      <span class="site">pebblerobo.com</span>
      <span>Ends ${endsOn}</span>
      <span>${SKU}</span>
    </div>
  </div>
</body></html>`

const SIZES = [
  { name: 'og', w: 1200, h: 630, wide: true },
  { name: 'feed', w: 1080, h: 1080, wide: false },
  { name: 'story', w: 1080, h: 1350, wide: false },
]

const b = await chromium.launch()
for (const s of SIZES) {
  const page = await b.newPage({ viewport: { width: s.w, height: s.h }, deviceScaleFactor: 1 })
  await page.setContent(html(s), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const out = join(ROOT, 'public/campaign', `early-bird-${s.name}.png`)
  await page.screenshot({ path: out })
  await page.close()
  console.log('wrote', out)
}
await b.close()

// The OG image is fetched by scrapers that will not wait, so it also ships as
// a jpg at the path the metadata already points at.
execFileSync('/bin/sh', ['-c',
  `cd '${ROOT}' && npx --yes sharp-cli -i public/campaign/early-bird-og.png -o public/og.jpg -f jpeg -q 86 2>/dev/null || true`])
console.log('done — price', NOW, '· ends', endsOn, `· ${days} days`)
