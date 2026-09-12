# Stack-chan Kit — Sales Site Design

Date: 2026-09-12
Status: Built. Art direction revised 2026-09-12 after client review.

## 1. Purpose

A single-page marketing and pre-order site for a Stack-chan build kit sold to
engineers in India. The page must sell the kit and capture reservations. It is
not a storefront; no money moves through it in v1.

Price: MRP 16,999 INR, struck through, discounted to 11,999 INR.
Fulfilment: ships in 1-2 weeks.

## 2. Audience

Practising engineers and makers. They read part numbers, recognise an ESP32-S3,
and distrust marketing copy that has no specifics in it. The page earns trust by
being concrete: real part numbers, real specs, real dimensions.

## 3. Hard content rules

- The page states what is IN THE BOX. It never states component costs, supplier
  names, per-item pricing, sourcing, or margin. The only price on the page is the
  kit price.
- No invented specifications. Every claim traces to a supplier invoice or to
  vendor documentation cited in section 4.
- No fabricated social proof: no review quotes, no "trusted by N makers", no unit
  counters, no ratings. If a customer count appears later it is read from the
  preorders table or it does not ship.
- No stock photography and no placeholder grey boxes. All imagery is authored SVG.

## 4. Verified facts

Kit contents are derived from three supplier invoices held by the seller
(Robu.in #3677025, Evelta #206858, Aqtronics/Digi-Key T202609028333, all dated
2 Sep 2026). Costs from those invoices are deliberately excluded per section 3.

### M5Stack CoreS3 Lite (K128-LITE)
Source: https://docs.m5stack.com/en/core/CoreS3-Lite (fetched 2026-09-12)

| Field | Value |
|---|---|
| MCU | ESP32-S3, Xtensa 32-bit LX7 dual-core @ 240 MHz |
| Flash | 16 MB |
| PSRAM | 8 MB |
| Display | 2.0" IPS 320x240, ILI9342C |
| Touch | Capacitive, FT6336U |
| Camera | GC0308, 0.3 MP |
| Microphone | ES7210 codec, dual mic input |
| Speaker | AW88298 16-bit I2S amplifier, 1 W |
| IMU | BMI270 6-axis + BMM150 3-axis magnetometer |
| Light/proximity | LTR-553ALS-WA |
| PMIC / RTC | AXP2101 / BM8563 |
| Battery | 200 mAh LiPo |
| Storage | microSD slot |
| Ports | HY2.0-4P (PORT.A), M5-BUS |
| USB | USB-C, OTG + Serial/JTAG |
| Dimensions | 54.0 x 54.0 x 16.5 mm |
| Weight | 54 g |
| Backplate | Magnetic |

### Upstream project
Source: https://github.com/meganetaaan/stack-chan (fetched 2026-09-12)

- Name: Stack-chan, "a JavaScript-driven M5Stack-embedded super-kawaii robot"
- Author: Shinya Ishikawa (@meganetaaan) and the Stack-chan community
- License: Apache License 2.0
- Runtime: Moddable SDK (JavaScript)
- Supported boards include M5Stack CoreS3

Attribution is mandatory and must name Apache-2.0 explicitly.

### Servo
SCS0009 serial-bus servo, 6 V, 2.3 kg-cm, 300 degrees of travel. Source: Evelta
invoice line item. Driven over an RS485 serial bus.

## 5. In the box

Listed on the page exactly as follows, without prices:

1. 1x M5Stack CoreS3 Lite (ESP32-S3) - the face and the brain
2. 2x SCS0009 serial-bus servo, 6 V / 2.3 kg-cm / 300 deg - pan and tilt
3. 1x Waveshare serial bus servo driver board (ST/SC series)
4. 1x FE-URT-1 RS485 servo bus programmer, USB to TTL
5. 1x 5 V 3 A power supply, 5.5 mm DC plug
6. 1x 3D-printed Stack-chan shell with servo brackets
7. 1x 20 cm 40-pin Dupont cable set (M/M, M/F, F/F)
8. 1x Seeed Grove female-jumper to Grove cable adapter set (5 pack)
9. M2x8 and M3x16 hex CSK fasteners
10. 4x 1000 uF 16 V electrolytic capacitors for servo-bus decoupling

## 6. Art direction

Revised 2026-09-12 after review. The first direction (warm cream, vermilion,
hairline broadsheet rules) was rejected as reading generic and dull. Reference
supplied by the client: fanout.sh.

Bright, dimensional product launch.

- Light ground #f7f8fa with white surfaces; saturated accents electric blue
  #2f6bff, mint #00c08b, amber #ff9f1a, violet #6e56f8. Screen black #05080b
  with an LCD glow #5bf0d4 used only inside a display.
- Dark theme is a full parity palette, not an inversion afterthought. A toggle
  in the nav persists the choice to localStorage; an inline script applies it
  before first paint so the page never flashes the wrong theme. With no stored
  choice the OS setting wins.
- Type: Archivo for display at tight negative tracking; Silkscreen, a pixel
  face, for badges, micro-labels and step numerals; IBM Plex Mono for every
  spec, part number and measurement; IBM Plex Sans for body.
- Depth is the medium: rounded cards, layered shadows, hover lift, spec chips
  floating at slight rotations around the hero, a radial glow behind the robot.

### Authored graphics
No photography is authored. All illustration is hand-drawn SVG.

- The hero robot, which tracks the pointer (see Signature).
- One drawing per part in the box, eleven in total, recognisable at thumbnail
  size beside its designator.
- Servo travel dial spanning a true 300 degrees.
- Signal-flow schematic: USB to FE-URT-1 to RS485 bus to driver board to both
  servos, with the 5 V rail shown separately.
- A marquee ticker of real part numbers, which doubles as the visual rhythm a
  logo wall would normally provide without fabricating any logos.

### Signature
The hero is the robot watching the visitor's cursor. Head yaws and pitches on
CSS perspective while the base stays fixed, eyes translate within the display,
it blinks on a randomised interval and drifts gently when the pointer is idle.
Live pan and tilt angles print beside it in monospace. The product demonstrates
its own specification rather than asserting it.

## 6a. Trust

Trust is earned only with true statements. Permitted: real part numbers and
specifications, open-source provenance and licence, honest dispatch and payment
terms, a real FAQ, and clearly-marked slots awaiting the client's own photo and
video.

Forbidden, and absent from the build: invented review quotes, fabricated
"N people online" or backer counters, customer or institution logos the seller
does not have, and any statistic without a source.

Each capability card names the component that provides it, so a reader can
check the claim against the bill of materials.

## 7. Page structure

1. Announcement bar — batch, dispatch window, saving.
2. Sticky nav — section links, price, theme toggle, Reserve.
3. Hero — badge, headline, price block, two CTAs, four honest figures, and the
   pointer-tracking robot with floating spec chips.
4. Part-number marquee.
5. Demo video — media slot at 16:9.
6. What it does — six capability cards, each citing its component.
7. In the box — eleven illustrated part cards, plus a flat-lay photo slot.
8. Specifications — CoreS3 Lite and SCS0009 tables, plus the travel dial.
9. How you build it — four ordered steps, then the signal-flow schematic.
10. FAQ — six answers, native details/summary.
11. Reserve — the form and an order-summary card.
12. Footer — attribution, contact, email-storage note.

## 8. Data flow

The site has exactly one server-side flow.

    [Reserve form: name, email, qty, city]
      -> client-side Zod validation (UX only)
    [POST /api/preorder]  Next.js Route Handler
      -> server-side Zod re-validation (authoritative; client never trusted)
      -> Vercel BotID check
    [Neon Postgres: insert into preorders]
      -> UNIQUE(email) makes repeat submits idempotent
    [Response]
      201 -> reserved, show confirmation
      409 -> already on the list, show the same confirmation tone
      400 -> field-level validation errors
      429 -> rate limited
      500 -> retryable error with a retry affordance

The server is authoritative. Nothing the browser sends is trusted, including qty.

### Schema

    create table preorders (
      id         bigserial primary key,
      email      text      not null unique,
      name       text      not null,
      qty        smallint  not null default 1 check (qty between 1 and 5),
      city       text,
      created_at timestamptz not null default now()
    );

One table, because one user action requires it.

### Secrets
DATABASE_URL is server-side only, managed through `vercel env`. No secret is ever
placed in a NEXT_PUBLIC_* variable. .env files are git-ignored and never committed.

### Privacy
The footer states plainly that an email address submitted to the reserve form is
stored for the purpose of contacting the buyer about this kit, and nothing else.

## 9. States

Every state of the reserve flow is designed, not left to chance: idle, submitting,
success, duplicate, field-validation error, rate-limited, network failure with a
working retry. No path ends on an indefinite spinner.

## 10. Testing

Vitest:
- schema accepts a valid payload
- rejects malformed email
- rejects qty below 1 and above 5
- rejects oversized payload
- route returns 201 on first insert
- route returns 409 on duplicate email
- route rejects a payload that passes client validation but fails server rules

Playwright:
- fill the reserve form, submit, assert the success state
- submit the same email twice, assert the duplicate state
- assert no horizontal scroll at 400 px width

## 11. Stack

Next.js App Router, TypeScript, Tailwind, Zod, Neon Postgres via the Vercel
Marketplace, deployed to Vercel. Node 22 local toolchain, pnpm.

## 12. Out of scope for v1

Payments, cart, accounts, order tracking, shipping-rate calculation, i18n,
CMS. Adding a payment gateway is a separate project with its own KYC, webhook
verification and refund-policy requirements.

## 13. Open items

- Contact email and selling entity name ship as clearly-marked placeholders and
  must be replaced before the site goes live.
