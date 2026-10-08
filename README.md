# Pebble-chan — sales site

Single-page site for Pebble-chan, a desktop robot based on the open-source
Stack-chan project, sold fully assembled (the default) or as a build kit at the
same price. Next.js App Router, TypeScript, Tailwind v4, Zod, Neon Postgres,
deployed on Vercel.

Design spec: `docs/superpowers/specs/2026-09-12-stackchan-kit-site-design.md`

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm test         # unit: schema + route handler
pnpm e2e          # browser: the reserve flow
pnpm build
```

## Database

Provisioned on Neon and live in production. The site still builds and runs
without it — the reserve form returns a clear "not open yet" message rather than
pretending to succeed.

```bash
vercel integration add neon          # provisions DATABASE_URL
vercel env pull .env.local --yes
psql "$DATABASE_URL" -f db/schema.sql
```

`DATABASE_URL` is server-side only. Never expose it through `NEXT_PUBLIC_*`.

Before deploying the simplified reservation form, run `db/schema.sql` against
the production database. It is an idempotent migration that makes phone,
profession, address, city and PIN optional while preserving existing records
and unique indexes. Deploy the application only after that migration succeeds.
The form collects name, email and quantity; contact and shipping details are
requested by email when the reservation is confirmed. Older clients that send
the full details are still accepted and validated.

### Robot or kit

Every order records its edition in `preorders.edition` — `assembled` or `kit`
— because the two are packed differently. **Run `db/schema.sql` (or
`node db/migrate.mjs`) against production before deploying this release:** the
insert writes the column, so an un-migrated database would refuse every new
order. The migration fills existing rows with `kit`, which is what every order
before this release was for, and keeps `kit` as the default, so orders the old
page places between the migration and the deploy are recorded correctly too.

The page sends the edition with every order; a request with none (a tab opened
before the robot was on sale) is stored as a kit. Resuming an unpaid order moves
it to the edition chosen on resuming. The edition is in the Razorpay order notes,
the receipt email, and the analytics events. The robot's catalogue id is
`PBL-BOT-01`; the kit keeps `PBL-KIT-01`. `?edition=kit` preselects the kit, for
adverts that sell the kit.

The page sells the robot first. Everything about building one — the kit section,
its nav link — renders only while the kit is chosen, with a sticky banner
("Build-it-yourself kit selected · Switch to fully assembled") in the header for
as long as it is. The choice lives in one store (`lib/edition-store.ts`) read by
every control that shows it.

The same migration adds two attribution columns for X (see below): `twclid`, the
X ad click id an order came through, and `ad_opt_out`, set when the browser sent
Global Privacy Control.

## The twelve faces

`lib/faces.ts` transcribes the firmware's face atlas (stackchan-bench,
`src/main.cpp`) — geometry, coordinates and colours, at the true panel size of
320 x 240. `components/robot3d/faceTexture.ts` turns each one into the panel
texture, and the hero robot cycles the set every 4.2 s, blinking only the faces
the firmware blinks.

The faces appear on the robot and nowhere else, so `tests/faces.test.ts` guards
the table: a malformed entry would not be obvious on screen.

## The 3D model (off the page)

The interactive model is not on the page at the moment. It is converted from the
STLs of the previous design, and the robot now stands on taller legs: a model
that disagrees with the photographs beside it is worse than none. The code
(`components/Playground.tsx`, `components/robot3d/`) and `e2e/hero3d.spec.ts`
are kept; convert the new leg STLs with the script below, put `<Playground />`
back in the "What it does" section, and remove the `test.skip` at the top of the
spec.

When it was on the page, the model was the real thing: `public/model/*.glb` is converted straight
from the STLs that print the shell, so the proportions on screen are the
proportions in the box. The CoreS3 is modelled to its published
54 x 54 x 16.5 mm and the screen is a true 4:3.

Regenerate the models from source STLs:

```bash
python3 - <<'EOF'
import trimesh, os, glob
SRC = "path/to/stl"; OUT = "public/model"
for p in glob.glob(os.path.join(SRC, "*.stl")):
    m = trimesh.load(p, force='mesh'); m.merge_vertices()
    m.apply_translation(-m.bounds.mean(axis=0))
    m.export(os.path.join(OUT, os.path.basename(p)[:-4] + ".glb"))
EOF
```

It is not free, so it is not forced on anyone:

| Visitor | Payload |
|---|---|
| Anyone with WebGL, phone included | ~1,378 KB |
| Reduced motion, Save-Data, or no WebGL | ~419 KB, no 3D code fetched |

Everyone with WebGL gets the model, phones included — the hero is the product,
so it loads without asking. Three signals still opt out, and all three are
assertions the visitor has effectively made themselves:
`prefers-reduced-motion`, the `Save-Data` header, and a browser without WebGL.
Each falls back to the authored SVG robot and fetches none of the 3D code
(asserted in `e2e/hero3d.spec.ts`).

## Media

Every photograph and clip of the robot is real footage of a batch 01 unit,
shot on a phone, in `public/media/robot/`. Stills are single frames from the
films, not separate photographs. All of it is portrait (9:16) and 576 px wide —
WhatsApp-compressed — so supplying the original phone files and re-encoding
would sharpen every image on the page. Films are H.264 + AAC and VP9 + Opus;
loops are silent; the hero loop must stay under 800 KB (asserted in
`e2e/video.spec.ts`).

The share image and the ad posters are rendered from `lib/kit.ts` by
`node scripts/poster.mjs` (`PW_CHANNEL=chrome` to use an installed Chrome).

## Analytics

Meta Pixel, the X pixel and Mixpanel (including session replay and heatmaps) run only on
`pebblerobo.com` and `www.pebblerobo.com`. Local development and preview hosts
send no analytics, even when production publishable tokens are configured.

```bash
vercel env add NEXT_PUBLIC_MIXPANEL_TOKEN production
vercel env add NEXT_PUBLIC_META_PIXEL_ID production
```

The token is a publishable project token, not a secret — it identifies the
project to the browser and is meant to ship in client code.

Either service can be configured independently. With neither publishable token
set, no analytics SDK is loaded.

What is recorded, and what is not:

- Collection starts automatically on the two live hostnames. The footer
  discloses analytics use; there is currently no consent or opt-out interface.
- `record_mask_all_inputs` stays on, so the name and email typed into the
  reserve form are masked in every replay.
- Tracked events carry quantity and outcome, never a name, email or city.

Funnel events: `Reserve CTA Clicked` → `Reserve Submitted` →
`Reserve Succeeded` / `Reserve Already Held` / `Reserve Failed`, plus
`Page Viewed`, `Section Viewed`, `FAQ Opened`, `Specs Expanded`,
`Theme Toggled`, `Outbound Link Clicked`.

`Reserve Submitted` measures an attempt, not a completed reservation. Only an
HTTP 201 response with `status: "created"` fires `Reserve Succeeded`, which maps
to both Meta `Lead` and `CompleteRegistration`. The latter matches the existing
campaign's conversion event; `Lead` remains available for reports and audience
exclusions. These are two signals for the same reservation: do not add their
counts together. Duplicate, validation, server-error and honeypot responses do
not fire either successful-conversion event.

Playwright enables `NEXT_PUBLIC_ANALYTICS_TEST_MODE=1` on loopback hosts only.
This records events in the local Pixel queue without loading or contacting Meta
or Mixpanel. Leave that flag unset in ordinary development and production.
The browser tests mock reservation responses and run with database and email
credentials cleared, so they do not create real reservations or send email.

## Before launch

- [ ] Add Vercel BotID to the reserve route (honeypot is in place; BotID is not)
- [ ] Set NEXT_PUBLIC_MIXPANEL_TOKEN in Vercel, then redeploy
- [ ] Confirm the 3D-printed shell is ready to ship with each kit

## Content rule

The page states what is in the box. It never states component costs, supplier
names, or sourcing. The only price on the site is the price of Pebble-chan,
which is the same for the robot and the kit.

## Attribution

Pebble-chan is based on [Stack-chan](https://github.com/meganetaaan/stack-chan)
by Shinya Ishikawa and contributors, used under the Apache License 2.0. It is
not an official Stack-chan or M5Stack product. The name Pebble-chan refers only
to this robot and kit; the software is Stack-chan and the credit is theirs.

## X conversion tracking

Pixel `rfx4u` (`lib/x.ts`). Two halves, which have to agree:

- **The base code** (`components/XPixel.tsx`, rendered once from the root
  layout with `next/script`, `afterInteractive`) is X's snippet verbatim, in
  `lib/x-pixel.ts`. It loads on the live hostnames only, like the Meta Pixel;
  browser tests get its queue without the script. Check it on pebblerobo.com
  with the [X Pixel Helper](https://chrome.google.com/webstore/detail/twitter-pixel-helper/jepminnlebllinfmkhfbkpckogoiefpd).
- **The Conversion API** (`lib/x-conversions.ts`) is called from the server
  where a conversion is known to be true: `lead` when `/api/preorder` writes an
  order, `purchase` when the deposit settles (verify-payment or the webhook,
  whichever is first — exactly once). Each carries a SHA-256 hash of the
  trimmed, lowercased email and of the E.164 phone, the ad click id if the
  buyer arrived from an X ad, and the buyer's IP and user agent where the
  request came from their browser.

```bash
vercel env add X_PIXEL_TOKEN production   # Events Manager → Manual setup → Generate access token
```

The events mirror the Meta Pixel's, so both platforms optimise on the same
moments:

| X event | Env var | Meta equivalent | Fires | From |
|---|---|---|---|---|
| Page view | — (automatic) | PageView | page load | pixel |
| Content view (`tw-rfx4u-rgpxm`) | `NEXT_PUBLIC_X_EVENT_CONTENT` | ViewContent | first section seen, once a visit | pixel |
| Checkout initiated (`tw-rfx4u-rgpxi`) | `NEXT_PUBLIC_X_EVENT_CHECKOUT` | InitiateCheckout | any Book / Buy button | pixel |
| Lead (`tw-rfx4u-rgpxh`) | `NEXT_PUBLIC_X_EVENT_LEAD` | Lead (+ CompleteRegistration) | order saved | pixel + server |
| Purchase (`tw-rfx4u-rgpx2`) | `NEXT_PUBLIC_X_EVENT_PURCHASE` | Purchase | deposit settled | pixel + server |

The ids were created in Events Manager (Purchase is X's Purchase type; the other
three are Custom, because X has no Lead, Checkout or Content type) and live in
`lib/x.ts`. The env vars above override them without a code change — a redeploy,
since the pixel reads them at build time — and only `X_PIXEL_TOKEN` has to be set. Lead and Purchase are reported by
the pixel and the server with the same `conversion_id` — an id the browser makes
for each order, and the Razorpay payment id — so X counts each once. X gets Lead
without a CompleteRegistration twin: that one exists for a single Meta campaign
and would count every order twice.

To check the token and an event id together, once both are set:

```bash
node scripts/x-test-conversion.mjs   # sends one test Lead; expect 200
```

A browser that sends Global Privacy Control gets no X at all: no pixel, and the
order is flagged so the server never reports it either, even from the webhook.
The privacy page and the footer state what X receives; if this integration
changes, they change with it.
