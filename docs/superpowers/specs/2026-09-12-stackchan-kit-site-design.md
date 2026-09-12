# Stack-chan Kit — Sales Site Design

Date: 2026-09-12
Status: Approved design, pending implementation plan

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

Ink on paper, styled as a component datasheet. Deliberately not SaaS.

- Ground: warm off-white #F4F1EA. Ink: near-black. Accent: vermilion #E4572E,
  used sparingly, a nod to the project's Japanese origin.
- Type: tight grotesk for headings, true monospace for every number, part number,
  dimension and spec value.
- Structure: hairline 1px rules and a visible baseline grid. No cards, no drop
  shadows, no gradients, no glassmorphism, no pill-shaped everything, no purple.
- Dark mode: full token parity. Palette defined on bare :root, redefined under
  both prefers-color-scheme: dark and [data-theme="dark"].

### Authored SVG graphics
All graphics are hand-authored SVG. There is no photography.

- G1 Exploded parts diagram: kit components laid out with leader lines to
  labelled callouts carrying real part numbers.
- G2 Dimensioned front elevation: assembled robot in engineering-drawing style
  with measurement arrows.
- G3 Servo sweep: animated two-axis pan/tilt arc. The arc spans 300 degrees
  because the SCS0009 does; it is accurate, not decorative.
- G4 Signal-flow schematic: USB -> FE-URT-1 -> RS485 bus -> servo driver ->
  2x SCS0009, with the 5 V rail and decoupling shown.

Animation respects prefers-reduced-motion.

## 7. Page structure

1. Hero. Product name, one-line positioning, price block (16,999 struck through,
   11,999 live), "ships in 1-2 weeks", primary CTA to the reserve block. G2 sits
   alongside.
2. In the box. G1 plus the section 5 list. Contents only, no prices.
3. Brain. CoreS3 Lite spec table from section 4, monospace and dense.
4. Motion. G3, servo travel, serial-bus addressing.
5. Hackable. Moddable SDK / JavaScript, open firmware, G4. Upstream credit and
   link, naming Apache-2.0.
6. Reserve. The form.
7. Footer. Attribution, shipping terms, contact, privacy note for stored emails.

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
