'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { useLiveScene } from '@/components/site/useLiveScene'
import { useShell } from '@/lib/shell-store'
import { shellById } from '@/lib/shells'
import type { Demo } from '@/lib/live-demo'
import { EV, measure, track } from '@/lib/analytics'

type Mode = 'camera' | 'dance' | 'assistant'
// The assistant opens first. Most visitors arrive inside the Instagram,
// Facebook or X app, whose browsers usually refuse the camera: in the first
// day of measuring, two camera attempts in three failed, while the assistant
// and the dance were the two tabs people chose.
const TABS: [Mode, string][] = [['assistant', 'AI assistant'], ['dance', 'Dance'], ['camera', 'Camera & movement']]
const ANSWERS = [
  ['Help me plan my day', 'Let’s start with one thing that matters most. Give it your freshest hour, leave room for a break, then take the small tasks one at a time.'],
  ['Tell me something interesting', 'An octopus has three hearts. Two pump blood to its gills, and one keeps it flowing to the rest of its body. A reminder that nature is wonderfully inventive.'],
  ['I need some encouragement', 'One small step counts. Pick something you can finish in five minutes. I’ll keep you company while you get started.'],
]

export default function DemoStage() {
  const [mode, setMode] = useState<Mode>('assistant')
  const modeRef = useRef<Mode>(mode)
  modeRef.current = mode
  const cameraRequest = useRef(0)
  const [cameraOn, setCameraOn] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  // No camera API at all (some in-app browsers): offer the trackpad, not a button that cannot work.
  const [canCamera, setCanCamera] = useState(true)
  useEffect(() => { setCanCamera(Boolean(navigator.mediaDevices?.getUserMedia)) }, [])
  const [playing, setPlaying] = useState(false)
  const [answer, setAnswer] = useState('Pick a conversation to hear PebbleRobo’s voice and see its expressions.')
  const [point, setPoint] = useState({ x: 50, y: 65 })
  const host = useRef<HTMLDivElement>(null)
  const video = useRef<HTMLVideoElement | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const api = useRef<Demo | null>(null)
  const audio = useRef<AudioContext | null>(null)
  const beat = useRef<ReturnType<typeof setInterval> | null>(null)
  const mounted = useRef(true)
  // Once a visit: did anyone touch the robot here, and was the live one there to answer.
  const tapped = useRef(false)
  const shell = useShell()
  const live = useLiveScene(host, async (el) => {
    const { startDemo } = await import('@/lib/live-demo')
    const d = await startDemo(el, { shell: shellById(shell) })
    api.current = d; d.framing('centre'); d.look(0, 8); d.mood('happy')
    return { dispose: () => { d.dispose(); api.current = null } }
  })
  const stopCamera = () => {
    cameraRequest.current++
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null
    api.current?.camera(null)
    if (video.current) { video.current.pause(); video.current.srcObject = null; video.current = null }
    setCameraOn(false)
  }
  const stopMusic = () => {
    if (beat.current) clearInterval(beat.current)
    beat.current = null; void audio.current?.close(); audio.current = null
    api.current?.notes(false); api.current?.look(0, 8); setPlaying(false)
  }
  useEffect(() => { api.current?.setShell(shellById(shell)) }, [shell, live])
  useEffect(() => { mounted.current = true; return () => {
    mounted.current = false
    stream.current?.getTracks().forEach(t => t.stop())
    if (beat.current) clearInterval(beat.current)
    void audio.current?.close(); window.speechSynthesis?.cancel()
  } }, [])
  useEffect(() => {
    const requested = (e: Event) => {
      const id = (e as CustomEvent<string>).detail
      setMode(id === 'dance' ? 'dance' : id === 'call' ? 'camera' : 'assistant')
    }
    window.addEventListener('pebble:demo', requested)
    return () => window.removeEventListener('pebble:demo', requested)
  }, [])
  useEffect(() => {
    if (mode !== 'camera') stopCamera()
    if (mode !== 'dance') stopMusic()
    window.speechSynthesis?.cancel(); api.current?.hush(); api.current?.mood('happy')
  // Media resources are owned by their mode, and never continue in a hidden tab.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])
  const startCamera = async () => {
    const request = ++cameraRequest.current
    setBusy(true); setMessage('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (!mounted.current || modeRef.current !== 'camera' || request !== cameraRequest.current) { s.getTracks().forEach(t => t.stop()); return }
      stream.current = s
      const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.srcObject = s
      video.current = v; await v.play()
      if (!mounted.current || modeRef.current !== 'camera' || request !== cameraRequest.current) { s.getTracks().forEach(t => t.stop()); v.pause(); v.srcObject = null; return }
      api.current?.camera(v); setCameraOn(true)
      measure(EV.demoAction, { action: 'camera', ok: true })
    } catch {
      stopCamera(); setMessage('The camera is blocked here. Apps like Instagram and X often block it: open pebblerobo.com in Chrome or Safari to try it, or keep exploring with the trackpad.')
      measure(EV.demoAction, { action: 'camera', ok: false })
    }
    finally { if (mounted.current) setBusy(false) }
  }
  const move = (x: number, y: number) => {
    x = Math.min(100, Math.max(0, x)); y = Math.min(100, Math.max(0, y))
    setPoint({ x, y }); api.current?.look((x - 50) * 1.1, (100 - y) * .3)
  }
  const startMusic = async () => {
    if (playing) { stopMusic(); return }
    if (audio.current) return
    const ctx = new AudioContext(); audio.current = ctx
    try { await ctx.resume() } catch { stopMusic(); return }
    if (!mounted.current || modeRef.current !== 'dance') { stopMusic(); return }
    let n = 0
    const tick = () => {
      const notes = [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 349.23]
      const osc = ctx.createOscillator(), gain = ctx.createGain()
      osc.type = 'sine'; osc.frequency.value = notes[n % notes.length]
      gain.gain.setValueAtTime(0, ctx.currentTime); gain.gain.linearRampToValueAtTime(.12, ctx.currentTime + .02)
      gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .25)
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + .28)
      api.current?.look(Math.sin(n * 1.1) * 34, 8 + (n % 2) * 15); api.current?.nod(1); n++
    }
    api.current?.notes(true); api.current?.mood('happy'); tick()
    beat.current = setInterval(tick, 300); setPlaying(true)
    measure(EV.demoAction, { action: 'music' })
  }
  const speak = (text: string) => {
    setAnswer(text); api.current?.mood('happy'); api.current?.nod(1)
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const voice = new SpeechSynthesisUtterance(text); voice.rate = .95
    voice.onstart = () => api.current?.say(60)
    voice.onend = voice.onerror = () => api.current?.hush()
    window.speechSynthesis.speak(voice)
  }
  return <div className="demo-fill">
    <div role="tablist" aria-label="Capability demonstrations" className="capability-tabs">
      {TABS.map(([id, label]) => <button key={id} id={`demo-tab-${id}`} role="tab" aria-selected={mode === id} aria-controls="demo-panel" className="demo-tab" data-on={mode === id} onClick={() => { setMode(id); track(EV.demoModeChosen, { mode: id, location: 'demo' }) }}>{label}</button>)}
    </div>
    <div id="demo-panel" role="tabpanel" aria-labelledby={`demo-tab-${mode}`} className="capability-layout">
      <div className="media capability-stage">
        <Image src={`/media/shots/float-shell-${shell}.webp`} fill sizes="(max-width: 900px) 92vw, 800px" alt="Interactive PebbleRobo demonstration" className="object-contain p-10" style={{ opacity: live ? 0 : 1 }} />
        <div ref={host} className="absolute inset-0" data-testid="demo-robot" onPointerDown={() => {
          if (tapped.current) return
          tapped.current = true
          measure(EV.robotTapped, { location: 'demo', mode, live })
        }} />
        <span className="tag absolute left-4 top-4">Interactive demo</span>
        {cameraOn && <span className="tag absolute left-4 bottom-4">Your camera · local preview</span>}
        {!live && <span className="tag absolute right-4 bottom-4">Static preview</span>}
      </div>
      <div className="capability-controls">
        {mode === 'camera' && <>
          <p className="t-label">A face on its screen. A room to explore.</p>
          <h3 className="t-display t-h3">You’re in the picture.</h3>
          <p>Turn its head with the trackpad. Switch on your camera to see your own video on the robot’s display.</p>
          {canCamera && <button className="btn btn-brand" disabled={busy || !live} onClick={() => cameraOn ? stopCamera() : void startCamera()}>{busy ? 'Opening camera…' : cameraOn ? 'Turn camera off' : 'Try my camera'}</button>}
          <div className="head-trackpad" role="group" tabIndex={0} aria-label="Head movement trackpad. Use arrow keys or drag to turn the robot."
            onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); const r = e.currentTarget.getBoundingClientRect(); move((e.clientX-r.left)/r.width*100, (e.clientY-r.top)/r.height*100) }}
            onPointerMove={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) return; const r=e.currentTarget.getBoundingClientRect(); move((e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100) }}
            onKeyDown={e => { const delta: Record<string, [number,number]> = { ArrowLeft: [-5,0], ArrowRight: [5,0], ArrowUp: [0,-5], ArrowDown: [0,5] }; if (delta[e.key]) { e.preventDefault(); move(point.x+delta[e.key][0],point.y+delta[e.key][1]) } }}>
            <span style={{ left: `${point.x}%`, top: `${point.y}%` }} /><small>Drag to look around ↔</small>
          </div>
          <p className="t-mono text-[11px]">Camera stays in this browser. Nothing is recorded or uploaded. This previews the companion app experience.</p>
          {message && <p role="status">{message}</p>}
        </>}
        {mode === 'dance' && <>
          <p className="t-label">A desk-sized dance floor</p><h3 className="t-display t-h3">Press play. Watch it groove.</h3>
          <p>A head tilt, a happy face, and a rhythm to move to. Try its pan-and-tilt dance with an original tune.</p>
          <button className="btn btn-brand" disabled={!live} onClick={() => void startMusic()}>{playing ? 'Stop music & dance' : 'Play music & dance'}</button>
          <div className={`music-meter ${playing ? 'is-playing' : ''}`} aria-hidden="true">{Array.from({length:12},(_,i)=><i key={i} style={{animationDelay:`${i*.11}s`}} />)}</div>
          <p className="t-mono text-[11px]">Sound starts only when you press play.</p>
        </>}
        {mode === 'assistant' && <>
          <p className="t-label">Conversation, with character</p><h3 className="t-display t-h3">More than a voice.</h3>
          <p>Meet the expressive side of an AI assistant. Choose a sample conversation and watch its face come alive as it speaks.</p>
          <div className="grid gap-2">{ANSWERS.map(([q,a],i)=><button className="demo-chip text-left" key={q} onClick={()=>{ speak(a); measure(EV.demoAction, { action: 'answer', answer: i + 1 }) }}>{q} ↗</button>)}</div>
          <p className="assistant-answer" role="status">{answer}</p>
          <button className="link text-left" onClick={()=>{window.speechSynthesis?.cancel();api.current?.hush()}}>Stop voice</button>
          <p className="t-mono text-[11px]">Sample responses with your browser’s voice. The physical robot’s AI conversations use Wi-Fi and the companion app.</p>
        </>}
      </div>
    </div>
  </div>
}
