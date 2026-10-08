# Asset pipeline

```sh
node tools/assets/build-body.mjs    # public/models/stackchan-body.glb, from the STL
node tools/assets/build-site.mjs    # every still and loop the site shows
node tools/assets/build-site.mjs --stills    # or only the stills / --loops
```

No Blender, no ImageMagick, no ffmpeg. The renders need Google Chrome
installed (Playwright drives it), because only Chrome ships an H.264 encoder.

## One robot, everywhere

`lib/robot-body.ts` is the robot: the printed parts from
`public/models/stackchan-body.glb`, the CoreS3 Lite with its curved cover
glass, both SCS0009 servos, the horns, the bus adapter and its 5.5 x 2.1 mm DC
socket, the shell's clear-coated finish and the studio it is lit in (feathered
softboxes, a key light with a real shadow, a cool rim). The live hero
(`lib/live-robot.ts`) and every render (`stage-site.html`) build it from that
one file, so they cannot drift apart.

`lib/companion-face.ts` draws the face: pixel eyes, warm cheeks, the moods,
the blink and the talking mouth.

## What each script does

`build-body.mjs` splits `assets-src/stl/assembled_v3.stl` into its seven
parts, keeps each where the CAD assembled it, groups them by servo
(`Base`, `Neck_Pan`, `Head_Tilt` at the hinge, 51.7 mm up) and writes a
Draco-compressed GLB with positions only. Normals are rebuilt at load with a
crease angle.

`build-site.mjs` compiles the face, the body and the colourways from `lib/`,
serves the repo on loopback, and asks `stage-site.html` for each shot. The
stage composes the ground (transparent, a white sweep, or the dark studio
with a floor reflection), writes WebP stills, and encodes the loops with
WebCodecs into WebM (VP9) and MP4 (H.264). It rewrites
`public/media/render/manifest.json`; every entry is a render and the page
labels it as one.

## Coordinates

The robot faces +Z with Y up, in millimetres. In a shot, `dir` is where the
camera sits as seen from the robot. Pan is degrees about Y, positive turning
the face toward +X. Tilt is degrees up; the real hinge stops at level, so it
is never negative.

## Adding a shot

Add a row to `SHOTS` (a still) or `LOOPS` (a loop, with a `pose(p)` that
ends where it starts) in `build-site.mjs`, then run it. Distance is computed
from the robots' own bounds, so a new angle frames itself.
