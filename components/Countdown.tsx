'use client'

import { useEffect, useState } from 'react'
import { CAMPAIGN, campaignLeft, campaignActive } from '@/lib/kit'

/**
 * Time left in the early bird campaign.
 *
 * Renders nothing on the server and nothing on the first client paint. That
 * is deliberate: the deadline is absolute but "now" is not, so a server-
 * rendered figure would be stale by the time it reached the browser and
 * React would then correct it in front of the visitor. A number that visibly
 * changes the instant the page settles reads as a fake urgency widget, which
 * is the one thing a real deadline must not look like.
 *
 * Once the deadline passes it says so rather than disappearing. A page that
 * quietly drops a closed offer leaves whoever arrived from an ad wondering
 * what they missed.
 */
export default function Countdown({
  className = '', tone = 'dark',
}: {
  className?: string
  /** 'dark' sits on paper; 'light' sits on media or an ink block. */
  tone?: 'dark' | 'light'
}) {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null

  const on = campaignActive(now)
  const ink = tone === 'light' ? 'rgba(243,241,237,.92)' : 'var(--ink)'
  const dim = tone === 'light' ? 'rgba(243,241,237,.58)' : 'var(--muted)'

  if (!on) {
    return (
      <p className={`t-mono text-[11.5px] m-0 ${className}`} style={{ color: dim }}>
        {CAMPAIGN.closedLine}
      </p>
    )
  }

  const { days, hours, minutes, seconds } = campaignLeft(now)
  const pad = (n: number) => String(n).padStart(2, '0')

  return (
    <div className={`flex items-baseline gap-2 ${className}`}>
      <span className="t-label" style={{ color: dim }}>Ends in</span>
      <span className="t-mono text-[13.5px] tabular-nums" style={{ color: ink }}>
        {days}d {pad(hours)}:{pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  )
}
