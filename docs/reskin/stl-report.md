# STL report

## What was found

Two STL sets exist on this machine. Only one is this product.

| Set | Parts | Verdict |
|---|---|---|
| `stack chan/` | `shell` 54.0 × 42.5 × 54.0, `feet` 48.0 × 37.0 × 8.2, `bracket_f` 41.2 × 19.6 × 39.7, `bracket_b` 25.5 × 10.6 × 39.7 | **This robot.** The 54 mm shell is the CoreS3 head housing and matches the product photography. Copied to `assets-src/stl/`. |
| `stackchan_stls/` | `lap` 162 × 80 × 38, `pelvis` 96 × 70 × 30, `torso_front/back` 62 × 70 × 22.5, `arm`, `waist_plate`, `head_tray`, `head_bezel`, `tilt_turret` | **A different robot** — a seated humanoid with a torso and arms. Not used. |

Units are millimetres. All four used files are binary STL, manifold, and
parse cleanly: 15,918 triangles for the shell, 9,554 for the feet, 1,970 and
728 for the brackets.

No STL has ever been committed to this repository. The four GLBs in
`public/model/` are identical on every branch and were built from the
`stack chan/` set.

## The part that does not exist

The product photographs show a base that is **not** `feet_SCS0009`. The
printed feet in the STL set are a flat plate 8.2 mm tall; the photographed
batch 01 unit stands on a chunky block with two stub feet, roughly five times
that height. The legs were redesigned after these print files were cut and the
new files are not on this machine. This is why the previous branch took the 3D
model off the page.

The base and feet in `tools/assets/scene.js` are therefore **modelled from
photographs**, scaled against the shell's known 54 mm width:

| Part | Modelled size (mm) | Source |
|---|---|---|
| Body block | 46 × 26 × 40, 3 mm radius | photo, scaled to shell |
| Feet (×2) | 17 × 15 × 31, at x = ±31 | photo, scaled to shell |
| Pan turntable | r 19–20, 7 tall | photo |

`BASE_PROVENANCE` in `scene.js` records this in the code itself. It is a
likeness, not the part. When the new print files appear, they drop into
`assets-src/stl/` and the modelled geometry comes out.

## Pivots

Measured from the bracket geometry, in the assembled model's own millimetre
space:

| Axis | Position | Direction |
|---|---|---|
| Pan | `(0, 26, 0)` | vertical, +Y |
| Tilt | `(0, 60, 0)` — 34 mm above the turntable | horizontal, +X |

Node names in the exported GLB are `Base`, `Neck_Pan`, `Head_Tilt`, `Screen`,
as the live component expects. `Screen` is its own mesh with clean 0–1 UVs so
its face texture can be swapped.

## The head

The M5Stack CoreS3 Lite is not a printed part and is not in the STL set. It is
modelled from the datasheet at **54.0 × 54.0 × 16.5 mm**, with the 2.0″ 4:3
(320 × 240) panel inset on the front face.

## Renderer

Blender is not installed and is not used. Renders come from three.js in a
headless browser, which is a deliberate swap rather than a shortcut: the live
model on the site is three.js, so rendering the stills from the same geometry
with the same materials means the gallery and the interactive card cannot
drift apart. Cycles would look better in isolation and worse in context, and
would add a gigabyte of toolchain nothing else here needs.

## Size

| Stage | Size |
|---|---|
| Raw export | 2,145 KB |
| Indexed (`mergeVertices`) | 1,444 KB |
| Draco | **71 KB** |

STL stores no shared vertices — every triangle carries its own three, so a
16k-triangle shell arrives with each interior vertex repeated six times.
Indexing is the first third of the saving and changes nothing about the shape.

**`gltf-transform optimize` must not be used here.** It runs `flatten` and
`join`, which collapse the scene graph: the file comes back with `Base_Body`
as its root and no `Neck_Pan` or `Head_Tilt`, so the live model silently loses
the ability to turn its head. The build runs `draco` alone and then asserts
all four rig nodes are present and the file is under budget, failing the build
if either is untrue.

## Known gaps

- The printed shell reads as a collar behind the head rather than wrapping it
  as tightly as the real part does.
