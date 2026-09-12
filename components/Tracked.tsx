'use client'

import { track } from '@/lib/analytics'

type Props = Record<string, string | number | boolean | null | undefined>

/** An anchor that reports the click before following it. */
export function TrackedLink({
  event, props, children, ...rest
}: { event: string; props?: Props } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a {...rest} onClick={() => track(event, props)}>
      {children}
    </a>
  )
}

/** A disclosure that reports only when it is opened, not when it is closed. */
export function TrackedDetails({
  event, props, children, ...rest
}: { event: string; props?: Props } & React.DetailsHTMLAttributes<HTMLDetailsElement>) {
  return (
    <details
      {...rest}
      onToggle={(e) => {
        if ((e.currentTarget as HTMLDetailsElement).open) track(event, props)
      }}
    >
      {children}
    </details>
  )
}

/** Reopens the analytics choice from the footer. */
export function PrivacyChoiceButton() {
  return (
    <button
      type="button"
      className="text-[13.5px] text-[var(--ink)] underline underline-offset-4 bg-transparent border-0 p-0 cursor-pointer"
      onClick={() => window.dispatchEvent(new CustomEvent('sc:privacy'))}
    >
      Change your analytics choice
    </button>
  )
}
