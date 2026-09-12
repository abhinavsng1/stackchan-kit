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

## Before the reserve form can store anything

The site builds and runs without a database; the reserve form returns a clear
"not open yet" message instead of pretending to succeed.

```bash
vercel integration add neon          # provisions DATABASE_URL
vercel env pull .env.local --yes
psql "$DATABASE_URL" -f db/schema.sql
```

`DATABASE_URL` is server-side only. Never expose it through `NEXT_PUBLIC_*`.

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
| Desktop, 3D | ~1,354 KB |
| Phone, before opting in | ~419 KB |
| Reduced motion or Save-Data | ~419 KB, no 3D code fetched |

- Desktop loads it directly. A phone gets the SVG drawing plus a
  "View the 3D model (~1 MB)" button, so the data is the visitor's choice.
- `prefers-reduced-motion`, `Save-Data`, and missing WebGL all fall back to the
  authored SVG robot, and none of the 3D code is fetched (asserted in `e2e/`).

## Analytics

Mixpanel, with session replay and heatmaps, gated behind consent.

```bash
vercel env add NEXT_PUBLIC_MIXPANEL_TOKEN production
vercel env add NEXT_PUBLIC_MIXPANEL_TOKEN preview
vercel --prod
```

The token is a publishable project token, not a secret — it identifies the
project to the browser and is meant to ship in client code.

With no token set, the analytics layer is inert: no banner, no SDK, no events.

What is recorded, and what is not:

- Nothing loads until the visitor agrees. The SDK is dynamically imported on
  consent, so declining downloads no Mixpanel code at all (verified in `e2e/`).
- Global Privacy Control and Do Not Track are honoured without asking.
- `record_mask_all_inputs` stays on, so the name and email typed into the
  reserve form are masked in every replay.
- Tracked events carry quantity and outcome, never a name, email or city.
- The footer offers "Change your analytics choice" to reverse the decision.

Funnel events: `Reserve CTA Clicked` → `Reserve Submitted` →
`Reserve Succeeded` / `Reserve Already Held` / `Reserve Failed`, plus
`Page Viewed`, `Section Viewed`, `FAQ Opened`, `Specs Expanded`,
`Theme Toggled`, `Outbound Link Clicked`.

## Before launch

- [ ] Provision Neon and run `db/schema.sql`
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
