# Asset pipeline

```sh
npm run assets
```

Rebuilds every render, the GLB and the manifest from the STLs. No manual
steps, no Blender.

## What it does

1. Transpiles `lib/faces.ts` to `tools/assets/.gen/faces.js`. The faces have
   one definition, in TypeScript, used by both the renders and the live
   component — a second copy would drift.
2. Serves the repo on a loopback port so a headless browser can import three
   and fetch the STLs.
3. Builds the robot (`scene.js`), exports `public/models/pebble.glb`, and
   renders each still at 800 and 1600 wide.
4. Writes `public/media/render/manifest.json` — every entry carries
   `render: true`, because everything this produces is a render and the page
   has to label it as one.

## Inputs

- `assets-src/stl/*.stl` — the printed parts.
- `lib/faces.ts` — the face atlas.

## Adding an expression

Add it to `FACES` in `lib/faces.ts`, then add a row to `shots` in
`build.mjs` naming the angle and the face id. Re-run `npm run assets`.

## Adding an angle

Add a direction to `ANGLES` in `stage.html`. Distance is computed from the
model's own bounding sphere, so a new angle frames itself and changing the
geometry cannot crop a shot.
