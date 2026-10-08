'use client'

import Clip from '@/components/Clip'
import { motion } from 'motion/react'
import { EASE, Reveal, Stagger, StaggerItem } from '@/components/site/motion'
import { ROLES } from '@/lib/roles'
import { SCRIPT } from '@/lib/talk-script'
import TalkStage from '@/components/site/TalkStage'

/**
 * Talking to it, shown as a moment rather than described as a feature.
 *
 * The exchange plays out line by line the first time it comes into view. It
 * is a script of what the shipped firmware does — wake word heard on the
 * robot, a turn of the head, an answer out loud, a photo to see what you
 * mean — not a transcript of a real conversation, and it says so.
 *
 * The pictures here are rendered loops of the same rig as the live robot:
 * it notices you, looks up, and answers with its mouth moving; it performs;
 * it copies you. Each one is labelled as a render.
 *
 * On a desktop the exchange and the robot sit side by side. On a phone they
 * would stack and the robot would only arrive after the chat had scrolled
 * away, so there the two become one stage card (TalkStage): the robot plays
 * in it and the conversation lands over it, on cue.
 */

const role = (id: string) => ROLES.find((r) => r.id === id)!

export default function Talk() {
  const extras = [
    { ...role('performer'), loop: 'loop-performer', alt: 'PebbleRobo swaying and talking, mid-performance' },
    { ...role('puppet'), loop: 'loop-puppet', alt: 'PebbleRobo turning and tilting its head to copy someone' },
  ]

  return (
    <section id="talk" className="on-stage section scroll-mt-16 overflow-hidden">
      <div className="wrap">
        <div className="grid lg:grid-cols-12 gap-x-10 gap-y-14 items-center">
          <div className="lg:col-span-5">
            <Reveal>
              <p className="t-label m-0 mb-6">Talk to it</p>
              <h2 className="t-display t-h2 m-0">
                Say its name.<br /><span className="accent">It answers.</span>
              </h2>
              <p className="t-lead mt-7 mb-0 max-w-[36ch]">
                No app to open, no phone in your hand. It hears its wake word on
                its own, looks up, and answers out loud.
              </p>
            </Reveal>

            <div className="lg:hidden mt-10"><TalkStage /></div>

            <motion.ol
              className="hidden lg:grid list-none p-0 mt-12 mb-0 gap-3"
              initial="hidden" whileInView="shown" viewport={{ once: true, margin: '0px 0px -20% 0px' }}
              variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.55, delayChildren: 0.2 } } }}
              aria-label="An example exchange"
            >
              {SCRIPT.map((line, i) => (
                <motion.li
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    shown: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
                  }}
                  className={line.who === 'you' ? 'justify-self-end' : 'justify-self-start'}
                >
                  {line.who === 'note' ? (
                    <span className="t-mono text-[12px] text-[var(--muted)] flex items-center gap-2 py-1">
                      <span className="inline-block w-4 h-px" style={{ background: 'var(--accent)' }} aria-hidden="true" />
                      {line.text}
                    </span>
                  ) : (
                    <span className="inline-block px-4 py-2.5 text-[16px] leading-snug"
                          style={line.who === 'you'
                            ? { background: 'var(--stage-ink)', color: 'var(--stage)', borderRadius: '18px 18px 4px 18px' }
                            : { background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: '18px 18px 18px 4px' }}>
                      <span className="sr-only">{line.who === 'you' ? 'You: ' : 'PebbleRobo: '}</span>
                      {line.text}
                    </span>
                  )}
                </motion.li>
              ))}
            </motion.ol>
            <p className="t-mono text-[11.5px] text-[var(--muted-2)] mt-8 mb-0 max-w-[48ch]">
              An illustration, not a recording. The wake word is heard on the robot itself;
              spoken answers come from a speech and language service you connect over Wi-Fi.
            </p>
          </div>

          <Reveal className="hidden lg:block lg:col-span-7" delay={0.1} y={40}>
            <div className="media" style={{ aspectRatio: '4 / 3', background: 'var(--stage)' }}>
              <Clip src="/media/render/loop-talk" poster="/media/render/loop-talk.webp"
                    alt="PebbleRobo turning to look up, then answering out loud" className="absolute inset-0" />
              <span className="tag absolute right-4 bottom-4">Render</span>
            </div>
          </Reveal>
        </div>

        {/* And two more things it does, briefly. */}
        <div className="mt-24 md:mt-36">
          <Reveal>
            <div className="rule mb-10"><span className="t-label">And it can also</span></div>
          </Reveal>
          <Stagger className="grid md:grid-cols-2 gap-6 md:gap-10">
            {extras.map((r) => (
              <StaggerItem key={r.id} as="article" className="group">
                <div className="media" style={{ aspectRatio: '16 / 10', background: 'var(--stage)' }}>
                  <Clip src={`/media/render/${r.loop}`} poster={`/media/render/${r.loop}.webp`}
                        alt={r.alt} className="absolute inset-0" />
                  <span className="tag absolute right-4 bottom-4">Render</span>
                </div>
                <h3 className="t-display t-h3 mt-6 mb-2">{r.title}</h3>
                <p className="text-[16px] leading-[1.6] text-[var(--muted)] m-0 max-w-[46ch]">{r.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </div>
      </div>
    </section>
  )
}
