# Stack-chan Kit — sales site

Single-page pre-order site for a Stack-chan build kit. Next.js App Router,
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

## Before launch

- [ ] Replace `CONTACT.email` and `CONTACT.entity` in `lib/kit.ts`
- [ ] Provision Neon and run `db/schema.sql`
- [ ] Add Vercel BotID to the reserve route (honeypot is in place; BotID is not)
- [ ] Confirm the 3D-printed shell is ready to ship with each kit

## Content rule

The page states what is in the box. It never states component costs, supplier
names, or sourcing. The only price on the site is the kit price.

## Attribution

Based on [Stack-chan](https://github.com/meganetaaan/stack-chan) by Shinya
Ishikawa and contributors, used under the Apache License 2.0. This kit is not an
official Stack-chan product.
