# PebbleRobo — image prompts, by section

For generating the lifestyle and detail photography the site still needs. The
product renders (hero, colours, the five-shell lineup, the dark "Talk to it"
stage, the exploded view) are already rendered from the real 3D model by
`node tools/assets/build-site.mjs`, so they are not here.

## Before you generate anything

**Give the tool the real robot as a reference image every time.** Use
`public/media/shots/float-shell-graphite.webp` (or the shell you want) plus one
real photo such as `public/media/robot/robot-close.webp`. Without a reference,
generators invent a different robot — wrong proportions, a mouth, arms,
glowing seams — and a picture of a robot we do not sell is worse than no
picture.

**What the robot actually looks like**, for the prompt and for checking the
output:
- A small square head, a black 2-inch screen filling its front, with a thin
  black bezel. On the screen: two rounded, glowing eyes (pale cyan by
  default), sometimes a small curved smile. Nothing else on the face.
- The head shell wraps the screen module from the back and sides; three small
  round holes on the side of the head.
- A short neck on a round turntable, on a squat rectangular base whose two
  "feet" point forwards, under the screen.
- Printed plastic with a fine matte layer texture. Five shell colours:
  Graphite #2b2d31, Bone #e9e6df, Signal #5ce1e6, Ember #d2552f, Moss #7f9b55.
- Desk-sized: the screen module is 54 mm square, so the head is a little
  over 5 cm across and the whole robot fits in one hand. It is plugged in with a cable; no battery
  pack, no wheels, no arms.

**Reject an output if** it has arms, legs that walk, a mouth on the body, a
logo, text on the screen, glowing body seams, a different head shape, or an
unreadable or extra-eyed face.

**Label generated images.** The page labels renders as "Render". A generated
lifestyle image is not a photograph of a real unit, so either label it (the
same `tag` the renders use, e.g. "Illustration") or — better — use these
prompts as the brief for a real shoot and replace the generated image when
the real one exists.

## The house style (append to every prompt)

> Editorial product photography, shot on medium format, 80mm lens, natural
> soft window light from the left, gentle falloff, true-to-life colour,
> neutral studio greys and warm off-whites, one accent of burnt orange
> (#d2552f) in the scene at most, shallow depth of field, clean uncluttered
> composition with generous negative space, matte surfaces, no lens flare, no
> neon, no purple, no gradients, no text, no logos, no watermark, photoreal.

Negative prompt, where the tool supports one:

> arms, hands on the robot, wheels, mouth on body, text on screen, logo,
> neon, cyberpunk, glowing seams, purple, holographic, cartoon, 3D render
> look, plastic toy look, clutter, multiple robots (unless asked), distorted
> screen, extra eyes

---

## 1. Meet it — the robot at home (replaces the desk photo beside the film)

File: `public/media/robot/graded/robot-close.webp` · 4:5 · 1080 × 1350

> A small square desk robot with a black screen face showing two glowing
> pale-cyan eyes sits on a light oak desk beside a closed laptop, a ceramic
> mug and a small potted plant, in a calm, sunlit home study with white walls.
> The robot is in a Bone (warm off-white) shell, turned slightly towards the
> camera as if it has just noticed you. Camera at desk height, three-quarter
> view from the front-left, the robot in the lower third, the room soft and
> out of focus behind. Morning light. Quiet, warm, lived-in, tidy. + house style

## 2. Personality — three moments (stills to sit alongside the clips)

4:5 · 1080 × 1350 each. Same desk, same light, same Bone robot, so the three
read as one sequence.

**2a. Always a little bit alive**

> Close-up of a small square desk robot's screen face: two soft glowing
> pale-cyan eyes, half-closed and content, a tiny curved smile, on a dark
> glass screen with a thin black bezel. The robot's Bone shell fills the frame
> edges. Very shallow depth of field, the background a soft warm blur of a
> home desk. + house style

**2b. It turns to look**

> A small square desk robot on a desk, its head turned sharply to the right on
> its neck, glowing eyes looking off-frame towards an open door where warm
> light spills in. Motion implied by the pose, not blur. Side three-quarter
> view, eye-level. + house style

**2c. It nods along**

> A small square desk robot with its head tilted up, looking at a person just
> out of frame above it — only a soft out-of-focus shoulder and coffee mug are
> visible at the edge. Low camera angle from desk height, looking slightly up
> at the robot. Glowing eyes wide and attentive. + house style

## 3. Talk to it — a human moment (for the dark stage section)

File: new, e.g. `public/media/robot/talk-moment.webp` · 16:10 · 1600 × 1000

> Evening, a dim home office lit only by a warm desk lamp. A person in their
> late twenties, seen from behind and to the side, softly out of focus, is
> leaning towards a small square desk robot in a Bone shell and holding up a
> small potted cactus to it. The robot's screen face shows two glowing
> pale-cyan eyes looking at the cactus. The robot is sharp and lit by the lamp;
> the rest of the frame falls to near-black. Cinematic, intimate, quiet.
> Burnt-orange lamp glow is the only colour. + house style (but low-key light)

## 4. Why PebbleRobo — "A body, not a speaker"

File: new, optional · 16:9 · 1920 × 1080

> A minimalist white desk seen from slightly above. On the left, a generic
> smart speaker — a plain fabric cylinder, no branding. On the right, a small
> square desk robot in Ember (burnt orange) shell with its head turned to look
> at the camera, glowing cyan eyes. Lots of empty white desk around both.
> Even, soft studio light, soft shadows. The comparison is quiet, not
> mocking. + house style

## 5. What's inside — macro detail (to pair with the exploded render)

4:5 · 1080 × 1350 each

**5a. The neck**

> Extreme macro of a small desk robot's neck: a matte Graphite 3D-printed
> plastic turntable with fine visible print layer lines, a sliver of a black
> servo horn, a precise gap between the head and the base. Raking light from
> the left picks out the layer texture. Black and charcoal tones, one thin
> burnt-orange edge of light. + house style

**5b. The face**

> Macro of a small 2-inch black glass screen in a thin black bezel, two
> glowing pale-cyan rounded-rectangle eyes, the screen's pixel grid just
> visible at this magnification. The matte Bone plastic shell frames the
> edges. + house style

## 6. Buy — what's in the box

File: new, e.g. `public/media/robot/in-the-box.webp` · 4:5 · 1080 × 1350

> Overhead flat lay on a pale grey studio surface: a small square desk robot
> in Graphite shell lying in a simple unbleached cardboard box with a moulded
> pulp insert, its screen face showing two glowing cyan eyes; beside the box,
> a coiled black power adapter with a barrel plug and a folded plain white
> card. Everything squared to the grid, generous space between items, soft
> shadow from top-left. No text or branding anywhere. + house style

> Check before using: the box, insert and card must match what you actually
> ship. If they do not exist yet, photograph the real box instead.

## 7. Footer — the last frame

File: new, optional · 21:9 · 2400 × 1030, used behind or above the closing line

> A wide, nearly empty dark desk at night. In the far right third, a small
> square desk robot, Graphite shell, its screen glowing softly with two
> sleepy, half-closed pale-cyan eyes, the only light in the room. Vast
> negative space to the left, deep charcoal tones, a faint warm reflection of
> the screen on the desk surface. Calm, cinematic, the end of a day. +
> house style (low-key)

## 8. Share image (Open Graph)

File: `public/og.jpg` · 1200 × 630

> A small square desk robot in Ember (burnt orange) shell on a clean light
> grey studio sweep, three-quarter view, glowing cyan eyes looking at the
> camera, placed in the right third of the frame with a soft contact shadow.
> The left half is empty for a headline to be set over it. + house style

---

## Not to generate

**Stories (customer quotes, photos, videos).** These must be real, from real
customers, used with permission. A generated "customer photo" next to a
quote is a fake review. Collect them, then replace the placeholders in
`lib/proof.ts`.
