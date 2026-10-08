# Design tokens — measured from cgotchi.com

Measured 2026-10-08 at 1440px and 390px with a real browser, reading computed
styles rather than estimating from screenshots. Every value below is observed,
not inferred.

This records the *system*: colour roles, a type scale, spacing rhythm, shape
and motion. None of cgotchi's images, logo, SVGs, videos, copy, font files,
CSS or JS are copied — see "What is deliberately not taken" at the end.

## Colour

| Role | Observed | Token |
|---|---|---|
| Page ground | `rgb(5,5,5)` — also the `theme-color` meta | `--bg: #050505` |
| Primary text | `rgb(246,246,244)` | `--ink: #f6f6f4` |
| Secondary text | `rgb(201,204,209)` | `--muted: #c9ccd1` |
| Tertiary text | `rgb(142,147,155)` | `--muted-2: #8e939b` |
| Card surface | `rgba(13,13,15,.78)` | `--surface: rgba(13,13,15,.78)` |
| Card border | `rgba(255,255,255,.16)` | `--line: rgba(255,255,255,.16)` |
| Hairline border | `rgba(255,255,255,.09)` | `--line-soft: rgba(255,255,255,.09)` |
| Accent | `rgb(169,207,81)` at 8% fill / 35% border | `--accent: #a9cf51` |

The accent appears only as a tinted pill: an 8% fill under a 35% border. It is
never a solid block, which is what keeps a single bright green from taking over
a near-black page.

## Typography

Two families: **Space Grotesk** for everything, **JetBrains Mono** for labels
and data. Both are open-licence and already on Google Fonts, so the mapping is
one-to-one and no substitution is needed.

| Role | Size | Weight | Line height | Tracking | Family |
|---|---|---|---|---|---|
| h1 | 92px | 700 | 84.64px (0.92) | −3.22px (−0.035em) | Space Grotesk |
| h2 | 66px | 700 | 64.68px (0.98) | −1.98px (−0.03em) | Space Grotesk |
| h3 | 21px | 700 | normal | −0.21px (−0.01em) | Space Grotesk |
| Eyebrow | 12px | 600 | 12px | +1.92px (+0.16em), uppercase | JetBrains Mono |
| Lead body | 19px | 400 | 30.4px (1.6) | normal | Space Grotesk |
| Body | 18px | 400 | 28.8px (1.6) | normal | Space Grotesk |
| List | 15px | 400 | normal | normal | Space Grotesk |
| Button | 14px | 600 | normal | normal | Space Grotesk |
| Link | 14px | 500 | normal | normal | Space Grotesk |

The character of this scale is the negative tracking on the display sizes and
the sub-1.0 line height: headings set tight and large, body set loose at 1.6.
The jump from 66px to 21px is the whole hierarchy — there is no 32px step.

## Spacing

- Section padding: **96px top and bottom**, uniformly. The first section is
  `64px / 40px`; the last drops its top padding to `0`.
- Sections are full-bleed (`max-width: none`); the inner container does the
  constraining.

## Shape

| Element | Radius |
|---|---|
| Pills, chips, buttons | `999px` |
| Cards | `12px` |
| Large media panels | `22px` |
| Avatars | `50%` |

Borders are `1px` throughout. There are no drop shadows: separation comes from
a hairline and a slightly lighter surface, which is the correct choice on a
#050505 ground where a shadow is invisible.

## Font mapping

| Measured | Shipping | Licence |
|---|---|---|
| Space Grotesk | Space Grotesk (Google Fonts) | OFL 1.1 |
| JetBrains Mono | JetBrains Mono (Google Fonts) | OFL 1.1 |

Both are the genuine open-licence families, self-hosted through
`next/font/google`. No font file is taken from cgotchi.

## What is deliberately not taken

The hard rule is to re-implement the system, not to copy the site. Tokens,
scale and rhythm are measurable facts about a visual language and are fair to
reimplement. These are not, and none of them are used:

- images, logo, SVGs, videos, font files, CSS or JS
- **copywriting** — see the note below, which is a live problem

### Open issue: copy already on our production site

The branch deployed on 2026-10-07 carries headings that track cgotchi's
sentence-for-sentence:

| cgotchi | pebblerobo.com, live now |
|---|---|
| "Three ways to meet cgotchi." | "Three ways to meet Pebble-chan." |
| "Small cube. Serious dev board." | "Small head. Serious hardware." |

The brief for this re-skin forbids copying their copywriting. That rule is
already broken on the live site, before this work starts. These need rewriting
in Phase 4 rather than being carried forward.

## Copy changes (Phase 4)

| Before | After | Why |
|---|---|---|
| Three ways to meet Pebble-chan. | Watch it for a minute. | Tracked "Three ways to meet cgotchi." word for word |
| Small head. Serious hardware. | Everything is named. | Tracked "Small cube. Serious dev board." |
| It sits on your desk. Then it gets a job. | It earns the desk space. | Over six words |
| Everything is someone else's open source | Standing on other people's work | Over six words |
| Read the whole datasheet | Every figure, in full | Over six words |

No fact, spec or price changed. `tests/copy-independence.test.ts` guards the
two borrowed headings and four other cgotchi lines against returning.
