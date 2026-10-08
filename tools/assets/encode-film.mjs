/**
 * Turn a phone-sized video into the three files a <Film> serves.
 *
 *   node tools/assets/encode-film.mjs <input.mp4> <public/media/robot/film-meet> [--poster 3] [--width 720]
 *
 * Writes <base>.mp4 (H.264 + AAC), <base>.webm (VP9 + Opus) and <base>.webp
 * (the poster, the frame at --poster seconds). Width is scaled to --width,
 * keeping the aspect.
 *
 * Everything happens in Google Chrome through WebCodecs — demux with mp4box,
 * decode, scale, encode, mux — so it needs nothing installed but Chrome, the
 * same as the render pipeline. Chrome rather than Playwright's Chromium,
 * because only Chrome ships H.264 and AAC encoders.
 */
import { chromium } from '@playwright/test'
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const args = process.argv.slice(2)
const flag = (name, d) => { const i = args.indexOf(`--${name}`); return i >= 0 ? Number(args[i + 1]) : d }
const [input, base] = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')))
if (!input || !base) {
  console.error('usage: node tools/assets/encode-film.mjs <input.mp4> <output base> [--poster 3] [--width 720]')
  process.exit(1)
}
const opts = {
  width: flag('width', 720),
  posterAt: flag('poster', 3),
  videoBitrate: flag('video-bitrate', 1_300_000),
  vp9Bitrate: flag('vp9-bitrate', 1_000_000),
}

const source = await readFile(resolve(input))
const PAGE = `<!doctype html><meta charset="utf-8"><script type="module">
import MP4Box from 'https://cdn.jsdelivr.net/npm/mp4box@0.5.3/+esm'
import { Muxer as MP4, ArrayBufferTarget as MP4Target } from 'https://cdn.jsdelivr.net/npm/mp4-muxer@5/+esm'
import { Muxer as WebM, ArrayBufferTarget as WebMTarget } from 'https://cdn.jsdelivr.net/npm/webm-muxer@5/+esm'

window.__encode = async ({ width, posterAt, videoBitrate, vp9Bitrate }) => {
  const buf = await (await fetch('/input.mp4')).arrayBuffer()

  /* ---- demux ---- */
  const file = MP4Box.createFile()
  const info = await new Promise((ok, no) => {
    file.onReady = ok
    file.onError = no
    const b = buf.slice(0); b.fileStart = 0
    file.appendBuffer(b); file.flush()
  })
  const vt = info.videoTracks[0]
  if (!vt) throw new Error('no video track')
  const trak = file.getTrackById(vt.id)
  let description
  for (const e of trak.mdia.minf.stbl.stsd.entries) {
    const box = e.avcC || e.hvcC || e.vpcC || e.av1C
    if (box) {
      const s = new MP4Box.DataStream(undefined, 0, MP4Box.DataStream.BIG_ENDIAN)
      box.write(s)
      description = new Uint8Array(s.buffer, 8)
    }
  }
  const samples = []
  file.onSamples = (_id, _u, list) => { samples.push(...list) }
  file.setExtractionOptions(vt.id, null, { nbSamples: 1e9 })
  file.start()
  if (samples.length !== vt.nb_samples) throw new Error('read ' + samples.length + ' of ' + vt.nb_samples + ' samples')

  const sw = vt.video.width, sh = vt.video.height
  const w = width, h = Math.round(sh * width / sw / 2) * 2
  const seconds = vt.duration / vt.timescale
  const fps = Math.round(samples.length / seconds)

  /* ---- encoders and muxers ---- */
  const chunks = { mp4: [], webm: [] }
  let failed = null
  const fail = (e) => { failed = failed || e }
  const avc = new VideoEncoder({ output: (c, m) => chunks.mp4.push(['v', c, m]), error: fail })
  avc.configure({ codec: 'avc1.640028', width: w, height: h, bitrate: videoBitrate, framerate: fps, latencyMode: 'quality', avc: { format: 'avc' } })
  const vp9 = new VideoEncoder({ output: (c, m) => chunks.webm.push(['v', c, m]), error: fail })
  vp9.configure({ codec: 'vp09.00.40.08', width: w, height: h, bitrate: vp9Bitrate, framerate: fps, latencyMode: 'quality' })

  /* ---- video: decode, scale, encode ---- */
  const canvas = new OffscreenCanvas(w, h)
  const g = canvas.getContext('2d')
  g.imageSmoothingQuality = 'high'
  let n = 0, poster = null
  const dec = new VideoDecoder({
    output: (frame) => {
      g.drawImage(frame, 0, 0, w, h)
      if (!poster && frame.timestamp >= posterAt * 1e6) poster = canvas.convertToBlob({ type: 'image/webp', quality: 0.86 })
      const out = new VideoFrame(canvas, { timestamp: frame.timestamp, duration: frame.duration ?? Math.round(1e6 / fps) })
      frame.close()
      const keyFrame = n % (fps * 2) === 0
      avc.encode(out, { keyFrame }); vp9.encode(out, { keyFrame })
      out.close()
      n++
    },
    error: fail,
  })
  dec.configure({ codec: vt.codec, codedWidth: sw, codedHeight: sh, description })
  for (const s of samples) {
    if (failed) throw failed
    dec.decode(new EncodedVideoChunk({ type: s.is_sync ? 'key' : 'delta', timestamp: s.cts * 1e6 / s.timescale, duration: s.duration * 1e6 / s.timescale, data: s.data }))
    while (dec.decodeQueueSize > 4 || avc.encodeQueueSize > 6 || vp9.encodeQueueSize > 6) await new Promise((r) => setTimeout(r, 2))
  }
  await dec.flush(); await avc.flush(); await vp9.flush()

  /* ---- audio: decode the whole track at 48 kHz, encode AAC and Opus ---- */
  let audio = null
  if (info.audioTracks.length) {
    const rate = 48000
    const ctx = new OfflineAudioContext(2, 1, rate)
    const pcm = await ctx.decodeAudioData(buf.slice(0))
    const ch = Math.min(2, pcm.numberOfChannels)
    audio = { rate, ch }
    const aac = new AudioEncoder({ output: (c, m) => chunks.mp4.push(['a', c, m]), error: fail })
    aac.configure({ codec: 'mp4a.40.2', sampleRate: rate, numberOfChannels: ch, bitrate: 128000 })
    const opus = new AudioEncoder({ output: (c, m) => chunks.webm.push(['a', c, m]), error: fail })
    opus.configure({ codec: 'opus', sampleRate: rate, numberOfChannels: ch, bitrate: 96000 })
    const block = 1024
    for (let i = 0; i < pcm.length; i += block) {
      const len = Math.min(block, pcm.length - i)
      const planar = new Float32Array(len * ch)
      for (let c = 0; c < ch; c++) planar.set(pcm.getChannelData(c).subarray(i, i + len), c * len)
      const data = new AudioData({ format: 'f32-planar', sampleRate: rate, numberOfFrames: len, numberOfChannels: ch, timestamp: Math.round(i * 1e6 / rate), data: planar })
      aac.encode(data); opus.encode(data)
      data.close()
    }
    await aac.flush(); await opus.flush()
  }
  if (failed) throw failed

  /* ---- mux, in timestamp order ---- */
  const mux = (Muxer, Target, list, video, audioCfg) => {
    const m = new Muxer({ target: new Target(), video, audio: audioCfg, firstTimestampBehavior: 'offset', ...(Muxer === MP4 ? { fastStart: 'in-memory' } : {}) })
    list.sort((a, b) => a[1].timestamp - b[1].timestamp)
    for (const [kind, c, meta] of list) kind === 'v' ? m.addVideoChunk(c, meta) : m.addAudioChunk(c, meta)
    m.finalize()
    return m.target.buffer
  }
  const mp4 = mux(MP4, MP4Target, chunks.mp4, { codec: 'avc', width: w, height: h },
    audio ? { codec: 'aac', numberOfChannels: audio.ch, sampleRate: audio.rate } : undefined)
  const webm = mux(WebM, WebMTarget, chunks.webm, { codec: 'V_VP9', width: w, height: h, frameRate: fps },
    audio ? { codec: 'A_OPUS', numberOfChannels: audio.ch, sampleRate: audio.rate } : undefined)

  const b64 = async (data) => {
    const u = new Uint8Array(data instanceof Blob ? await data.arrayBuffer() : data); let s = ''
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000))
    return btoa(s)
  }
  return { w, h, fps, frames: n, seconds, audio, mp4: await b64(mp4), webm: await b64(webm), poster: await b64(await poster) }
}
window.__ready = true
</script>`

const server = createServer((req, res) => {
  if (req.url === '/input.mp4') { res.writeHead(200, { 'content-type': 'video/mp4' }); res.end(source); return }
  res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE)
})
// localhost, not an IP: WebCodecs needs a secure context.
await new Promise((r) => server.listen(0, 'localhost', r))
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage()
  page.on('pageerror', (e) => console.error('  page error:', String(e).slice(0, 300)))
  await page.goto(`http://localhost:${server.address().port}/`)
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })
  const r = await page.evaluate((o) => window.__encode(o), opts)
  await writeFile(`${base}.mp4`, Buffer.from(r.mp4, 'base64'))
  await writeFile(`${base}.webm`, Buffer.from(r.webm, 'base64'))
  await writeFile(`${base}.webp`, Buffer.from(r.poster, 'base64'))
  const kb = (s) => `${(s.length * 0.75 / 1024).toFixed(0)} KB`
  console.log(`${base}: ${r.w}x${r.h} @ ${r.fps} fps, ${r.frames} frames, ${r.seconds.toFixed(2)} s, audio ${r.audio ? r.audio.rate + ' Hz x' + r.audio.ch : 'none'}`)
  console.log(`  mp4 ${kb(r.mp4)}, webm ${kb(r.webm)}, poster ${kb(r.poster)}`)
} finally {
  await browser.close()
  server.close()
}
