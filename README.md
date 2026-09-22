# Pebble-chan — sales site

Single-page pre-order site for Pebble-chan, a build kit based on the
open-source Stack-chan project. Next.js App Router,
TypeScript, Tailwind v4, Zod, Neon Postgres, deployed on Vercel.

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

## The twelve faces

`lib/faces.ts` transcribes the firmware's face atlas (stackchan-bench,
`src/main.cpp`) — geometry, coordinates and colours, at the true panel size of
320 x 240. `components/robot3d/faceTexture.ts` turns each one into the panel
texture, and the hero robot cycles the set every 4.2 s, blinking only the faces
the firmware blinks.

The faces appear on the robot and nowhere else, so `tests/faces.test.ts` guards
the table: a malformed entry would not be obvious on screen.

## The 3D hero

The hero robot is the real thing: `public/model/*.glb` is converted straight
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

## Analytics

Meta Pixel and Mixpanel (including session replay and heatmaps) run only on
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
names, or sourcing. The only price on the site is the kit price.

## Attribution

Pebble-chan is based on [Stack-chan](https://github.com/meganetaaan/stack-chan)
by Shinya Ishikawa and contributors, used under the Apache License 2.0. It is
not an official Stack-chan or M5Stack product. The name Pebble-chan refers only
to this kit; the software is Stack-chan and the credit is theirs.
