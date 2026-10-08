# Acceptance — measured, not asserted

Run 2026-10-08 against the dev server on this machine. Numbers from a
development build are indicative; the production figures are the ones that
count and have not been taken.

## Measured

| Criterion | Target | Result |
|---|---|---|
| Horizontal overflow, 1440 | none | `scrollWidth 1440` — ok |
| Horizontal overflow, 390 | none | `scrollWidth 390` — ok |
| Console errors | none | clean at both widths |
| CLS (390) | < 0.05 | **0.0000** |
| LCP element | not the 3D canvas | a paragraph, at 0.28 s |
| GLB size | ≤ 500 KB | **71 KB** |
| GLB rig | `Base`, `Neck_Pan`, `Head_Tilt`, `Screen` | all four present; the build fails if not |
| three.js in initial bundle | absent | 615 KB chunk, not referenced by the initial document |
| Unit tests | pass | 249 |
| End-to-end | pass | 51, including reserve → Razorpay test mode → success |
| Marquee under reduced motion | stopped | `animation-name: none` |
| Code tabs by keyboard | operable | arrows wrap, Home and End jump |

## Screenshots

`docs/reskin/shots/pebble-1440.png`, `docs/reskin/shots/pebble-390.png`.

## Rulings

**The mobile scroll budget went from 23.5 to 26 screens.** The roles section
and the live model are two screens of genuinely new content. The number is a
guard against the page becoming an endless scroll, so it was raised
deliberately with a reason rather than nudged until a run went green. If it
needs raising again, that is a signal to cut something.

**The FAQ stays as `<details>`/`<summary>`.** The brief asked for buttons with
`aria-expanded`. Native disclosure is already keyboard-operable, announced
correctly, and works with no JavaScript; rewriting it by hand would be a
regression wearing the costume of an improvement.

**The `face.js` tab is `face.cpp`.** There is no stack-chan JavaScript
checkout on this machine to verify an API against, and inventing a
plausible-looking one is worse on a hardware page than shipping no code: the
person who tries it is the person who already bought the robot. The firmware
we do have supplied a real tab instead.

**Blender is not used.** Renders come from three.js so that the gallery and
the live model are the same geometry under the same materials.

## Not done

- **Lighthouse has not been run.** It needs a production build served and a
  throttled run; the numbers above are from the dev server.
- **Frame rate on a mid-range Android under 4× CPU throttle** has not been
  measured.
- **AVIF is not emitted.** The render pipeline writes WebP only; `next/image`
  serves AVIF for what it processes, but the generated stills are WebP.
- **The two 7 October analytics/pixel specs were flaky under four parallel
  workers** and pass in isolation and at two workers. Not investigated
  further.
