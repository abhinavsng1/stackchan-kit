/**
 * Grade the product photography.
 *
 * The photographs are real, handheld, lit by a desk lamp, and that honesty is
 * the argument the page makes. Grading does not change what is in them: it
 * sets a black point, puts an S-curve through the midtones and sharpens, so
 * the shell's print layers and the screen's edges survive being shown at
 * 400px on a near-black page. Flat photographs go muddy against #050505.
 *
 * Originals are never overwritten. Graded copies land beside them, so the
 * grade can be changed, or dropped, without re-exporting anything.
 *
 *   node tools/assets/grade.mjs
 */
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { readdir, mkdir, stat } from 'node:fs/promises'
import { join, basename, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const run = promisify(execFile)
const ROOT = fileURLToPath(new URL('../..', import.meta.url))
const SRC = join(ROOT, 'public/media/robot')
const OUT = join(SRC, 'graded')

/**
 * The grade, as one ordered chain.
 *
 * -level sets the black point without crushing: 3% in, and a hair of gamma
 *  so the midtones do not drop with it.
 * -sigmoidal-contrast is an S-curve rather than a linear stretch, which is
 *  what keeps the highlights on the white shell from clipping.
 * -modulate lifts saturation modestly. The lamp is already orange; pushing
 *  this far turns the whole frame red.
 * -unsharp last, because sharpening a vignette sharpens its edge.
 */
const GRADE = [
  '-colorspace', 'sRGB',
  '-level', '3%,97%,1.02',
  '-sigmoidal-contrast', '3.2,48%',
  '-modulate', '100,107,100',
  '-unsharp', '0x1.1+0.7+0.015',
]

async function main() {
  await mkdir(OUT, { recursive: true })
  const files = (await readdir(SRC)).filter((f) => /\.(webp|jpe?g|png)$/i.test(f))
  if (!files.length) throw new Error(`no photographs in ${SRC}`)

  for (const file of files) {
    const src = join(SRC, file)
    if ((await stat(src)).isDirectory()) continue
    const out = join(OUT, `${basename(file, extname(file))}.webp`)
    await run('magick', [src, ...GRADE, '-quality', '92', out])
    const before = (await stat(src)).size / 1024
    const after = (await stat(out)).size / 1024
    console.log(`  ${file.padEnd(22)} ${before.toFixed(0)}K -> ${after.toFixed(0)}K`)
  }
  console.log(`\n  graded ${files.length} photographs into public/media/robot/graded/`)
}

main().catch((e) => { console.error(e); process.exit(1) })
