/**
 * A hole in the page shaped exactly like the real photo or video that goes
 * here. It says what it is waiting for rather than pretending to be content —
 * swap the inner element for an <Image> or <video> and the layout does not move.
 */
export default function MediaSlot({
  label, ratio = '16 / 9', note,
}: { label: string; ratio?: string; note?: string }) {
  return (
    <div
      className="card relative overflow-hidden grid place-items-center text-center px-6"
      style={{ aspectRatio: ratio, background: 'var(--surface-2)' }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, transparent 0 13px, color-mix(in srgb, var(--muted) 13%, transparent) 13px 14px)',
        }}
      />
      <div className="relative">
        <span className="badge"><span className="dot" style={{ background: 'var(--amber)', boxShadow: '0 0 0 3px color-mix(in srgb, var(--amber) 22%, transparent)' }} />Media slot</span>
        <p className="t-display text-[19px] mt-3 mb-1">{label}</p>
        {note && <p className="text-[13px] text-[var(--muted)] m-0 max-w-[32ch] mx-auto">{note}</p>}
      </div>
    </div>
  )
}
