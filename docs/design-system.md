# Pebble — web design system v1

One document. Everything on pebblerobo.com follows it, and anything that
disagrees with it is a bug.

---

## 1. Why this exists alongside the brand guidelines

The Pebble Robotics brand guidelines (v1.0, September 2026) are a **corporate
identity**: monochrome, warm, quiet. They are right for letterhead, packaging,
a business card, an app icon. On those surfaces the job is to be recognised and
to get out of the way.

The website has a different job. It has to make an engineer want to spend
₹8,999 on a box of parts. Applied literally, the corporate palette produced a
page that read as a gallery wall — calm, tasteful, and completely inert.

So this is an **extension, not a replacement**.

A first attempt at this extension went dark — black ground, a signal orange,
technical annotation, borrowed from the launch film. It was wrong, and worth
recording why: it produced an *engineering-instrument* aesthetic when what was
wanted was a *premium-product* one. The reference the client actually pointed
at (ultrahuman.com) is light, warm and airy. Its drama comes from enormous
full-bleed photography with the headline living on it, not from turning the
lights off.

So the corporate palette stays. The thing that was missing was never colour.
It was **scale**: pictures boxed inside small cards, and the Display face set
at half the size its own guidelines specify.

### What is inherited, unchanged

| | |
|---|---|
| **Typefaces** | Outfit and JetBrains Mono. Not negotiable — this is the continuity anchor between surfaces. |
| **The logo** | Supplied artwork. Never redrawn, retyped, recoloured or rotated. |
| **The cut** | The 38°-to-10° curve. Once per page, never a decorative repeat. |
| **Radii** | Inputs 8, buttons 12, cards 16, tiles 28. |
| **Spacing** | 8px base, 4px for fine adjustment. |
| **Sentence case** | Headings are sentence case. Caps only for eyebrows and labels, tracked +32%. |

### What changes

| | Corporate | Web |
|---|---|---|
| **Default ground** | Paper `#F3F1ED` | Paper — unchanged |
| **Media** | supporting | **the hero itself**: full-bleed, 28px radius, edge to edge |
| **Display type** | 72px | 72–92px, and it sits *on* the media |
| **Keys** | 12px radius | **pill**, one primary per screen |
| **Dark** | 30% | full-bleed blocks, as counterweight |

Contrast comes from a huge picture against a lot of quiet paper. That is the
whole mechanism.

---

## 2. Colour

```
Pebble Black      #111111   default ground
Ink               #0B0B0C   deeper wells — video frames, code, insets
Graphite          #2B2B2B   raised surfaces on black, cards, borders
Stone             #6E6A64   secondary text on dark and on light
Mist              #BDB9B2   body copy on black
Sand              #E6E3DD   dividers on light, chip fills
Paper             #F3F1ED   light sections
White             #FFFFFF   headlines on black, light-section cards

Signal            #FF8836   see below
Danger            #C4483A   form errors only
Positive          #5E9E77   payment confirmed only
```

### The site is monochrome

`#FF8836` exists in the tokens, sampled from the launch film, and is currently
used **nowhere**. It was tried on the primary key and made the page muddy
against warm footage. It stays defined for a future use that genuinely needs
one signal — a live indicator, a single alarming number — and until such a use
exists, the site has no colour at all.

Keys are black on paper, white on media. Errors and payment confirmations are
the only coloured things, and both are function rather than brand.

Forbidden: gradients of any kind, a second accent, colour on the logo, a
coloured key competing with another coloured key in one viewport.

---

## 3. Type

Inherited from the brand, applied at full scale. The most common failure on
the old site was using the Display size at half its specification, which is
most of why it read as timid.

| Role | Size / line | Weight | Tracking |
|---|---|---|---|
| Display | 72 / 76 | 500 | −0.02em |
| H1 | 48 / 56 | 500 | −0.015em |
| H2 | 32 / 40 | 500 | −0.01em |
| H3 | 24 / 32 | 500 | — |
| Body large | 18 / 28 | 400 | — |
| Body | 16 / 26 | 400 | — |
| Caption | 13 / 20 | 400 | — |
| Eyebrow | 12 / 16 | 500 | +0.32em, caps |

**JetBrains Mono is for facts, not for flavour.** Part designators (`U1`,
`M1`, `PS1`), measurements, prices, payment ids, code, status readouts.
Never a heading, never a paragraph, never a button.

---

## 4. Graphic devices

Two, and only two.

### The cut
Inherited. The 38°-to-10° curve, once per page, as a divider or an image crop.
Its component carries a comment saying so, because the next person to find a
nice curve lying around will otherwise reuse it.

### Mono captions on media
Small JetBrains Mono lines that state a verifiable fact next to a picture —
`Not a render — batch 01, assembled at a desk in Bengaluru`, `SKU PBL-KIT-01`,
`8 parts`. 11px, `--stone`, tracked +0.08em.

This is what keeps a large photograph from reading as advertising: the caption
says something falsifiable.

---

## 5. Media

**Everything that claims to show the product must be real footage of the real
product.** The audience is engineers; a rendered "demo" that is not the device
running is worse than no demo, because being caught once costs the whole page
its credibility.

Generated or illustrative motion is permitted only where it is obviously
diagrammatic and could not be mistaken for documentation.

Video is muted by default and loops. Nothing autoplays with sound. Every clip
is lazy — nothing above the fold costs more than the hero, and the hero is
capped at 800 KB.

---

## 6. Layout

- 12 columns, 24px gutters, 72px margins at 1440.
- Content column caps at 1200px; running text caps at 68 characters.
- Paper is the ground. A dark block is a counterweight, not the default.
- Media blocks are full-bleed to a 12–16px page gutter, with a 28px radius.
  Never a small image in a card where a large one would do.
- One primary action per screen.
- The hero is one picture and six lines of type. Everything else waits.

---

## 7. Voice

Plain, specific, and checkable. The page's advantage is that its claims can be
verified against a bill of materials, so it never says "powerful" or
"seamless" where it can say `ESP32-S3` or `1–2 weeks`.

Never: "revolutionary", "seamless", "cutting-edge", "unleash", "AI-powered",
or a stat with no source.

---

## 7a. Interactive demonstration

The product page has one interactive element — the model in *What it does* —
and it earns its place only by being real.

**Demonstrate, do not illustrate.** The audience is engineers. A control that
plays an animation *of* a capability is worth less than a sentence, because a
sentence at least does not pretend. So:

| Claim | What the page actually does |
|---|---|
| It can see | opens the visitor's own camera and draws the frame on the panel |
| It talks and listens | reads the visitor's own microphone through an AnalyserNode |
| You can touch it | hit-tests the pointer against the screen mesh and reports the panel pixel |
| You can program it | runs a real game with real physics, played on the panel |

Where a capability cannot be executed in a browser, it animates and says what
part provides it. It never pretends to be live.

**Controls live on the device, not beside it.** A column of buttons next to the
canvas means a phone user scrolls down to press one and back up to see what it
did, which demonstrates nothing. Controls sit on the frame as a sideways-
scrolling strip, grouped at the top; readouts sit at the bottom, lifted clear
of the fixed buy bar. Two consequences worth remembering:

- The frame captures the pointer for head-dragging, so a press on an on-frame
  control must be excluded or the `click` retargets to the frame and the button
  never fires.
- Everything read inside the render loop belongs in a ref. A microphone level
  in React state re-renders the tree sixty times a second.

**Permissions are asked late and explained.** Nothing requests a camera or
microphone on load — only when the capability needing it is selected. The page
states, next to the control, that the stream is read in the browser and never
recorded or sent, and both streams stop on switching away. A refusal is a
supported state, not an error.

**One texture, redrawn in place.** Live content cannot be cached per frame, and
allocating a texture per tick leaks GPU memory until the tab dies. The panel is
one 320 × 240 canvas — the device's real resolution — redrawn each frame. Face
expressions stay cached, because there are twelve of them and they do not move.

Everything drawn on the panel uses one clock. Mixing `performance.now()` with
the render clock silently broke every ripple on this page once.

---

## 8. Checklist before anything ships

- [ ] No accent colour anywhere; keys are black or white
- [ ] One primary action per screen
- [ ] Display type at full size where it is the thesis
- [ ] Sections alternate ground
- [ ] The cut appears exactly once
- [ ] Every product image or clip is real footage
- [ ] Mono used only for facts
- [ ] Headings sentence case; caps only on eyebrows, tracked +32%
- [ ] Any interactive demo executes the claim rather than animating it
- [ ] Its controls sit on the device, reachable without scrolling away
- [ ] No permission is requested before the capability needing it is chosen
- [ ] A refusal, reduced motion and Save-Data all leave something honest on screen
