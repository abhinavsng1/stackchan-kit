import { PARTS, SPEC_TABLES, FAQS, PRICE, CONTACT, BUILDS } from '@/lib/kit'

/**
 * A plain-text summary for the models that answer questions instead of
 * linking to pages.
 *
 * Generated from lib/kit.ts rather than written by hand, for the same reason
 * the page is: a specification that disagrees with the product is worse than
 * no specification. If a part changes, this changes with it.
 */

const val = (v: string | string[]) => (Array.isArray(v) ? v.join('; ') : v)

export const dynamic = 'force-static'

export function GET() {
  const body = `# Pebble-chan build kit

> A desktop robot you assemble yourself, built around the open-source Stack-chan
> project. Sold by ${CONTACT.entity} and shipped within India.

Price: ${PRICE.now} (was ${PRICE.mrp}). ${PRICE.ship}. Ships to India only.
Contact: ${CONTACT.email}
Site: https://pebblerobo.com

## What it is

Pebble-chan is a build kit, not an assembled product. It contains every part
needed to build a small desktop robot with a face on a 2-inch screen, a head
that pans and tilts on two serial bus servos, a camera, microphones and a
speaker. It runs the open-source Stack-chan firmware on the Moddable SDK in
JavaScript; the controller is a stock M5Stack CoreS3 Lite, so the Arduino core
and M5Unified work as well.

It is NOT the official M5Stack Stack-chan product, which is a different,
pre-assembled device. The software is Stack-chan by Shinya Ishikawa and
contributors, used under the Apache License 2.0.

## What is in the box (${PARTS.length} items)

${PARTS.map((p) => `- ${p.name} (${p.qty})`).join('\n')}

You supply a USB-C cable and a computer. No 3D printer is needed: the shell and
the servo brackets are printed here and ship in the box.

## Specifications

${SPEC_TABLES.map((t) =>
  `### ${t.title}\n${t.rows.map((r) => `- ${r.label}: ${val(r.value)}`).join('\n')}`,
).join('\n\n')}

## What people build with it

${BUILDS.map((b) => `- ${b.title} (${b.effort}): ${b.body}`).join('\n')}

## Frequently asked questions

${FAQS.map((f) => `### ${f.q}\n${f.a}`).join('\n\n')}

## Buying

Payment is taken on the page by Razorpay — card, UPI, netbanking or EMI.
Delivery details are collected at the same time. ${PRICE.ship}.
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  })
}
