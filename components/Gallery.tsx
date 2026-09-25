'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { track } from '@/lib/analytics'
import { EV } from '@/lib/events'

const Scene = dynamic(() => import('@/components/robot3d/Scene'), { ssr: false })

type ViewId = 'model' | 'unit' | 'box' | 'video'
type View = { id: ViewId; label: string; caption: string }

const VIEWS: View[] = [
  { id: 'model', label: '3D model', caption: 'Built from the print files. Move your pointer — it follows.' },
  { id: 'unit', label: 'Assembled', caption: 'An assembled unit. Photographed, not rendered.' },
  { id: 'box', label: 'In the box', caption: 'Everything that ships, beside its box.' },
  { id: 'video', label: 'Video', caption: 'A 40-second film. Starts muted.' },
]

/** How long a view holds while the gallery is still advancing on its own. */
const HOLD_MS = 10_000
/** Auto-advance covers only the two hero views, not the whole gallery. */
const AUTO: ViewId[] = ['model', 'unit']

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch { return false }
}

export default function Gallery() {
  const [view, setView] = useState<ViewId>('model')
  const [cycle, setCycle] = useState(0)
  const [auto, setAuto] = useState(true)
  const [canRender3d, setCanRender3d] = useState<boolean | null>(null)
  const panOut = useRef<HTMLSpanElement>(null)
  const tiltOut = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } })
      .connection?.saveData === true
    const ok = !reduced && !saveData && hasWebGL()
    setCanRender3d(ok)
    if (!ok) { setView('unit'); setAuto(false) }
  }, [])

  // Advance on its own until someone takes control.
  useEffect(() => {
    if (!auto || canRender3d !== true) return
    const id = setTimeout(() => {
      setView((v) => (v === AUTO[0] ? AUTO[1] : AUTO[0]))
      setCycle((c) => c + 1)
    }, HOLD_MS)
    return () => clearTimeout(id)
  }, [auto, view, cycle, canRender3d])

  const choose = useCallback((id: ViewId) => {
    setView(id)
    setAuto(false)          // a deliberate choice stops the carousel for good
    track(EV.galleryViewed, { view: id })
  }, [])

  const onAngles = useCallback((pan: number, tilt: number) => {
    if (panOut.current) panOut.current.textContent = fmt(pan)
    if (tiltOut.current) tiltOut.current.textContent = fmt(tilt)
  }, [])

  const shown = VIEWS.find((v) => v.id === view)!
  const available = VIEWS.filter((v) => v.id !== 'model' || canRender3d !== false)

  return (
    <div className="grid gap-4 sm:grid-cols-[76px_minmax(0,1fr)] sm:gap-5">
      {/* thumbnails */}
      <div className="order-2 sm:order-1 flex sm:flex-col gap-2.5 overflow-x-auto sm:overflow-visible">
        {available.map((v) => (
          <Thumb
            key={v.id}
            view={v}
            active={view === v.id}
            counting={auto && AUTO.includes(v.id) && view === v.id}
            cycle={cycle}
            onSelect={() => choose(v.id)}
          />
        ))}
      </div>

      {/* main stage */}
      <div className="order-1 sm:order-2">
        <div className="card relative overflow-hidden aspect-square"
             style={{ background: view === 'video' ? 'var(--screen)' : 'var(--surface)' }}>

          {canRender3d && (
            <div className="absolute inset-0 transition-opacity duration-500"
                 style={{ opacity: view === 'model' ? 1 : 0 }} aria-hidden={view !== 'model'}>
              <Scene active={view === 'model'} onAngles={onAngles} />
            </div>
          )}

          <Frame show={view === 'unit'}>
            <Image src="/media/unit.webp" width={1100} height={1100} priority
                   sizes="(max-width: 640px) 90vw, 520px"
                   alt="An assembled Pebble-chan on a desk, its display showing the curious face and an ARMED status line"
                   className="w-full h-full object-cover" />
          </Frame>

          <Frame show={view === 'box'}>
            <Image src="/kit-flatlay.webp" width={1672} height={941}
                   sizes="(max-width: 640px) 90vw, 520px"
                   alt="Everything in the kit laid out beside its box"
                   className="w-full h-full object-contain" />
          </Frame>

          <Frame show={view === 'video'}>
            {view === 'video' && (
              <video data-testid="gallery-video" className="w-full h-full object-contain" poster="/media/demo-poster.webp"
                     preload="none" muted loop playsInline controls autoPlay
                     aria-label="Forty-second film introducing the Pebble-chan kit">
                <source src="/media/demo.webm" type="video/webm" />
                <source src="/media/demo.mp4" type="video/mp4" />
              </video>
            )}
          </Frame>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 min-h-[34px]">
          {view === 'model' ? (
            <>
              <Readout label="Pan M1" ref_={panOut} />
              <Readout label="Tilt M2" ref_={tiltOut} />
              <span className="text-[13px] leading-[20px] text-[var(--muted)]">{shown.caption}</span>
            </>
          ) : (
            <span className="text-[13px] leading-[20px] text-[var(--muted)]">{shown.caption}</span>
          )}
        </div>
      </div>
    </div>
  )
}

function Frame({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 transition-opacity duration-500 grid place-items-center"
         style={{ opacity: show ? 1 : 0, pointerEvents: show ? 'auto' : 'none' }}
         aria-hidden={!show}>
      {children}
    </div>
  )
}

const R = 15
const C = 2 * Math.PI * R

function Thumb({
  view, active, counting, cycle, onSelect,
}: {
  view: View; active: boolean; counting: boolean; cycle: number; onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      aria-label={`Show ${view.label}`}
      title={view.label}
      className="relative shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden card !p-0 grid place-items-center"
      style={active
        ? { borderColor: 'var(--brand)', boxShadow: '0 0 0 2px var(--brand)' }
        : undefined}
    >
      <ThumbArt id={view.id} />
      {counting && (
        <svg className="absolute right-1 bottom-1" width="18" height="18" viewBox="0 0 36 36" aria-hidden="true">
          <circle cx="18" cy="18" r={R} fill="var(--surface)" opacity="0.85" />
          <circle key={cycle} className="ring-progress" cx="18" cy="18" r={R}
                  fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round"
                  transform="rotate(-90 18 18)" strokeDasharray={C}
                  style={{ ['--circumference' as string]: C, ['--hold' as string]: `${HOLD_MS}ms` }} />
        </svg>
      )}
    </button>
  )
}

/** Tiny, self-contained marks — no extra image requests for the thumbnails. */
function ThumbArt({ id }: { id: ViewId }) {
  if (id === 'unit') {
    return <Image src="/media/unit.webp" width={144} height={144} alt=""
                  className="w-full h-full object-cover" />
  }
  if (id === 'box') {
    return <Image src="/kit-flatlay.webp" width={200} height={113} alt=""
                  className="w-full h-full object-cover" />
  }
  if (id === 'video') {
    return (
      <span className="grid place-items-center w-full h-full" style={{ background: 'var(--screen)' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--glow)" aria-hidden="true">
          <path d="M8 5.5v13l11-6.5z" />
        </svg>
      </span>
    )
  }
  return (
    <svg viewBox="0 0 48 48" className="w-full h-full" aria-hidden="true">
      <rect width="48" height="48" fill="var(--surface-2)" />
      <rect x="12" y="11" width="24" height="24" rx="4" fill="var(--ink)" opacity="0.08"
            stroke="var(--ink)" strokeWidth="1.4" />
      <rect x="16" y="15" width="16" height="12" rx="1.5" fill="var(--screen)" />
      <circle cx="21" cy="21" r="2.4" fill="var(--glow)" />
      <circle cx="27" cy="21" r="2.4" fill="var(--glow)" />
    </svg>
  )
}

function fmt(v: number) {
  return (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).padStart(4, '0') + '°'
}

function Readout({ label, ref_ }: { label: string; ref_: React.RefObject<HTMLSpanElement | null> }) {
  return (
    <span className="float t-mono text-[12px] !px-2.5 !py-1.5 flex items-center gap-1.5">
      <span className="t-label">{label}</span>
      <span ref={ref_} className="tabular-nums">+00.0°</span>
    </span>
  )
}
