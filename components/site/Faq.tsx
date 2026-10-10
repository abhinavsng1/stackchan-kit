'use client'

import { useId, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { EASE, Reveal } from '@/components/site/motion'
import { FAQS, CONTACT } from '@/lib/kit'
import { EV, track } from '@/lib/analytics'

/**
 * The questions a buyer actually has, in the order they have them. One open
 * at a time would make comparing two answers impossible, so each opens on its
 * own. The height animates; the text is in the DOM either way for search and
 * for find-in-page.
 */
export default function Faq() {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]))
  const base = useId()

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else { next.add(i); track(EV.faqOpened, { question: FAQS[i].q }) }
      return next
    })
  }

  return (
    <section id="faq" className="section scroll-mt-16">
      <div className="wrap grid lg:grid-cols-12 gap-x-10 gap-y-12">
        <Reveal className="lg:col-span-4">
          <p className="t-label m-0 mb-6">Questions</p>
          <h2 className="t-display t-h2 m-0">Good to know.</h2>
          <p className="text-[16px] text-[var(--muted)] mt-6 mb-0 max-w-[30ch]">
            Something we haven’t answered?{' '}
            <a href={`mailto:${CONTACT.email}`} className="link">{CONTACT.email}</a>
          </p>
        </Reveal>

        <div className="lg:col-span-8">
          {FAQS.map((f, i) => {
            const isOpen = open.has(i)
            const id = `${base}-${i}`
            return (
              <div key={f.q} className="faq-item">
                <h3 className="m-0">
                  <button type="button" className="faq-q" aria-expanded={isOpen} aria-controls={id}
                          onClick={() => toggle(i)}>
                    {f.q}
                    <span className="faq-icon" aria-hidden="true">
                      <svg width="12" height="12" viewBox="0 0 12 12"><path d="M6 0v12M0 6h12" stroke="currentColor" strokeWidth="1.5" /></svg>
                    </span>
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={id} role="region"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.45, ease: EASE }}
                                className="overflow-hidden">
                      <p className="m-0 pb-7 pr-12 text-[16.5px] leading-[1.65] text-[var(--muted)] max-w-[64ch]">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
