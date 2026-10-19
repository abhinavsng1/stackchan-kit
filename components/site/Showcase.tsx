'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

const CLIPS = [1, 2, 3, 4]
const ROTATION_MS = 5500
const position = (index: number, selected: number) => ['front', 'right', 'back', 'left'][(index - selected + 4) % 4]

export default function Showcase() {
  const [selected, setSelected] = useState(0)
  const [sound, setSound] = useState<number | null>(null)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [unavailable, setUnavailable] = useState<number[]>([])
  const [near, setNear] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const videos = useRef<(HTMLVideoElement | null)[]>([])
  const inView = useRef(false)
  const dragStart = useRef<number | null>(null)
  const swiped = useRef(false)

  const silence = useCallback(() => {
    videos.current.forEach(v => { if (v) v.muted = true })
    setSound(null)
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateMotion = () => setReduced(mq.matches)
    updateMotion(); mq.addEventListener('change', updateMotion)
    const playback = () => {
      const running = inView.current && !document.hidden
      setVisible(running)
      if (!running) silence()
      videos.current.forEach(v => {
        if (!v) return
        if (running) void v.play().catch(() => {})
        else v.pause()
      })
    }
    const observer = new IntersectionObserver(([entry]) => {
      inView.current = entry.isIntersecting; playback()
    }, { threshold: .15 })
    if (root.current) observer.observe(root.current)
    document.addEventListener('visibilitychange', playback)
    const otherFilm = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== 'feature-gallery') silence()
    }
    window.addEventListener('sc:film', otherFilm)
    return () => {
      observer.disconnect(); mq.removeEventListener('change', updateMotion)
      document.removeEventListener('visibilitychange', playback)
      window.removeEventListener('sc:film', otherFilm)
      videos.current.forEach(v => { if (v) { v.muted = true; v.pause() } })
    }
  }, [silence])

  // The films are most of the page's weight, so nothing is fetched until the
  // deck is a short scroll away: a visitor who never gets here never pays for it.
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNear(true); observer.disconnect() }
    }, { rootMargin: '600px 0px' })
    if (root.current) observer.observe(root.current)
    return () => observer.disconnect()
  }, [])

  const rotating = visible && !paused && !reduced && sound === null
  useEffect(() => {
    if (!rotating) return
    const timer = setInterval(() => setSelected(n => (n + 1) % 4), ROTATION_MS)
    return () => clearInterval(timer)
  }, [rotating, selected])

  const choose = (n: number, listen = false) => {
    n = (n + 4) % 4
    silence(); setSelected(n)
    if (listen) {
      const v = videos.current[n]
      if (v) {
        // Mute every other video before enabling sound, in the user's click.
        v.muted = false; v.volume = 1; setSound(n)
        window.dispatchEvent(new CustomEvent('sc:film', { detail: 'feature-gallery' }))
        void v.play().catch(() => silence())
      }
    }
    videos.current.forEach(v => { if (v?.muted && inView.current) void v.play().catch(() => {}) })
  }
  const toggleRotation = () => {
    if (sound !== null) { silence(); setPaused(false); return }
    setPaused(p => !p)
  }
  const status = sound !== null ? 'Sound on · rotation held' : paused || reduced ? 'Manual browsing · sound off' : 'Auto-playing · sound off'

  return <section id="films" className="section video-gallery scroll-mt-16"><div className="wrap">
    <div className="gallery-heading"><div><p className="t-label">See it for yourself</p><h2 className="t-display t-h2">A little personality.<br />In every frame.</h2></div><p className="t-lead">Four films, always in motion.<br />Tap a card to listen.</p></div>
    <div ref={root} className="film-deck" aria-roledescription="carousel" aria-label="PebbleRobo video gallery">
      <div className="film-deck-top"><span className="t-mono"><i aria-hidden="true" /> PebbleRobo / In motion</span><span className="film-deck-status">{status}</span></div>
      <div className="film-deck-stage" onPointerDown={e => { swiped.current = false; dragStart.current = e.clientX }} onPointerUp={e => {
        if (dragStart.current === null) return
        const delta = e.clientX - dragStart.current; dragStart.current = null
        if (Math.abs(delta) > 45) { swiped.current = true; choose(selected + (delta < 0 ? 1 : -1)) }
      }} onPointerCancel={() => { dragStart.current = null }}>
        {CLIPS.map((n, i) => <article key={n} className="film-deck-card" data-position={position(i, selected)} role="group" aria-label={`Video ${n} of 4`}>
          <video ref={el => { videos.current[i] = el }} src={near ? `/media/films/pebble-${n}.mp4` : undefined} poster={near ? `/media/films/pebble-${n}.jpg` : undefined} autoPlay muted={sound !== i} loop playsInline preload={near ? 'auto' : 'none'} aria-label={`PebbleRobo product film ${n}`}
            onError={() => setUnavailable(old => old.includes(i) ? old : [...old, i])} />
          <button className="film-deck-hit" aria-label={sound === i ? `Mute video ${n}` : `Watch video ${n} with sound`} onClick={() => { if (swiped.current) { swiped.current = false; return }; sound === i ? silence() : choose(i, true) }}>
            <span className="film-card-index">FILM 0{n}</span>
            <span className="film-card-listen"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z" />{sound === i ? <><path d="M15 8c3 2 3 6 0 8M18 5c5 4 5 10 0 14" /></> : <path d="m16 9 6 6m0-6-6 6" />}</svg>{sound === i ? 'Sound on' : 'Tap for sound'}</span>
          </button>
          {unavailable.includes(i) && <span className="film-load-error">Video unavailable. Refresh to retry.</span>}
        </article>)}
      </div>
      <div className="film-deck-bottom">
        <div className="film-deck-navigation"><button onClick={() => choose(selected - 1)} aria-label="Previous video">←</button><div className="film-deck-dots" role="group" aria-label="Choose a film">{CLIPS.map((n,i) => <button key={n} onClick={() => choose(i)} aria-label={`Show video ${n}`} aria-pressed={selected === i}><span /></button>)}</div><button onClick={() => choose(selected + 1)} aria-label="Next video">→</button></div>
        <span className="t-mono film-deck-count">0{selected + 1} <span>/ 04</span></span>
        <button className="film-deck-pause" onClick={toggleRotation} aria-label={sound !== null || paused ? 'Resume automatic rotation' : 'Pause automatic rotation'}>{sound !== null || paused ? '▷ Auto rotate' : 'Ⅱ Pause rotation'}</button>
      </div>
      <p className="film-deck-note">All films play silently. Choose one for sound; it stays in front while you listen.</p>
    </div>
  </div></section>
}
