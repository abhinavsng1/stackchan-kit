import { PARTS, SPEC_TABLES, FAQS, PRICE, CONTACT, BUILDS, EDITION, EDITIONS } from '@/lib/kit'

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
  const body = `# PebbleRobo desktop robot

> A small desktop robot with a face and a head that pans and tilts, built around
> the open-source Stack-chan project. Sold fully assembled and tested, or as a
> build kit, by ${CONTACT.entity}, and shipped within India.

Price: ${PRICE.now} (was ${PRICE.mrp}), the same for either edition. ${PRICE.ship}. Ships to India only.
Contact: ${CONTACT.email}
Site: https://pebblerobo.com

## What it is

PebbleRobo is a small desktop robot with a face on a 2-inch screen, a head
that pans and tilts on two serial bus servos, a camera, microphones and a
speaker. It is sold two ways, at the same price:

${EDITIONS.map((e) => `- ${EDITION[e].name} (SKU ${EDITION[e].sku}): ${EDITION[e].pitch}`).join('\n')}

The assembled robot is the default. Both editions contain the same parts.

It runs the open-source Stack-chan firmware on the Moddable SDK in JavaScript; the controller is a stock M5Stack CoreS3 Lite, so the Arduino core
and M5Unified work as well.

It is NOT the official M5Stack Stack-chan product, which is a different
device with its own hardware. The software is Stack-chan by Shinya Ishikawa and
contributors, used under the Apache License 2.0.

## What is in the kit (${PARTS.length} items)

${PARTS.map((p) => `- ${p.name} (${p.qty})`).join('\n')}

The assembled robot ships with its power supply and needs nothing else. For the
kit, you supply a USB-C cable and a computer. No 3D printer is needed: the shell
and the servo brackets are printed here and ship in the box.

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
