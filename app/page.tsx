import Face from '@/components/Face'
import ReserveForm from '@/components/ReserveForm'
import { ExplodedStack, ServoSweep, SignalFlow } from '@/components/Diagrams'
import { PARTS, CORE_SPECS, PRICE, CONTACT } from '@/lib/kit'

function SheetHead({ sheet, title, note }: { sheet: string; title: string; note?: string }) {
  return (
    <div className="sheet-head">
      <span className="t-anno shrink-0">{sheet}</span>
      <h2>{title}</h2>
      {note && <span className="t-anno shrink-0">{note}</span>}
    </div>
  )
}

export default function Page() {
  return (
    <>
      {/* ---- masthead ---- */}
      <header className="border-b border-[var(--rule)]">
        <div className="sheet flex items-center justify-between gap-4 py-3">
          <span className="t-anno">Stack-chan · build kit</span>
          <span className="t-anno">Rev A · 2026-09</span>
        </div>
      </header>

      <main>
        {/* ================= HERO ================= */}
        <section className="sheet pt-14 pb-20 md:pt-20 md:pb-28">
          <div className="grid gap-14 md:grid-cols-2 md:gap-16 md:items-center">
            <Face />

            <div>
              <p className="t-anno m-0">Open-source desktop robot · build kit</p>

              <h1 className="t-display text-[clamp(46px,10vw,86px)] mt-3 mb-0">
                Stack-chan
              </h1>
              <p className="t-display text-[clamp(19px,3.4vw,27px)] font-medium mt-3 mb-0 text-[var(--ink-soft)]">
                A super-kawaii desktop robot<br />you actually build.
              </p>

              <p className="mt-6 mb-0 max-w-[44ch] text-[var(--ink-soft)]">
                Eleven components, two serial-bus servos and an ESP32-S3 that runs JavaScript.
                It arrives as parts and a printed shell. You wire it, flash it, and teach it
                to look at you.
              </p>

              <div className="mt-9 flex items-end gap-4 flex-wrap">
                <span className="t-data text-[17px] text-[var(--ink-soft)] line-through decoration-1">
                  {PRICE.mrp}
                </span>
                <span className="t-display text-[clamp(34px,7vw,52px)] leading-none">
                  {PRICE.now}
                </span>
              </div>
              <p className="t-anno mt-2.5 mb-0">{PRICE.ship}</p>

              <div className="mt-8">
                <a href="#reserve" className="btn">Reserve a kit</a>
              </div>

              <dl className="title-block mt-10 max-w-[420px]">
                <div><dt>Controller</dt><dd>CoreS3 Lite</dd></div>
                <div><dt>Actuation</dt><dd>2 × SCS0009</dd></div>
                <div><dt>Runtime</dt><dd>Moddable · JS</dd></div>
                <div><dt>Shell</dt><dd>Printed, included</dd></div>
              </dl>
            </div>
          </div>
        </section>

        {/* ================= IN THE BOX ================= */}
        <section className="sheet py-16 md:py-24">
          <SheetHead sheet="Sheet 2" title="In the box" note={`${PARTS.length} line items`} />

          <div className="grid gap-14 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] md:gap-16 mt-10">
            <div className="order-2 md:order-1">
              <ExplodedStack />
            </div>

            <div className="order-1 md:order-2">
              {PARTS.map((p) => (
                <div key={p.desig} className="parts-row">
                  <span className="desig">{p.desig}</span>
                  <div className="min-w-0">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-[13.5px] text-[var(--ink-soft)] mt-0.5">{p.note}</div>
                  </div>
                  <span className="t-data text-[12px] text-[var(--ink-soft)] whitespace-nowrap pt-0.5">
                    {p.qty}
                  </span>
                </div>
              ))}
              <p className="t-anno mt-5 mb-0">
                Everything above ships in one box. Nothing else to buy.
              </p>
            </div>
          </div>
        </section>

        {/* ================= THE BRAIN ================= */}
        <section className="sheet py-16 md:py-24">
          <SheetHead sheet="Sheet 3" title="U1 — the brain" note="M5Stack CoreS3 Lite" />

          <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] md:gap-16 mt-10">
            <div>
              <p className="mt-0 text-[var(--ink-soft)] max-w-[40ch]">
                The controller is the face. Its 2.0-inch display renders the eyes, the camera
                and microphones give it something to react to, and the whole thing is a 54 mm
                cube that sits on two servos.
              </p>
              <p className="mt-4 mb-0 text-[var(--ink-soft)] max-w-[40ch]">
                It is a stock M5Stack module, not a custom board. Anything you write for a
                CoreS3 runs here.
              </p>
            </div>

            <div className="border border-[var(--rule)] overflow-x-auto">
              <table className="spec-table">
                <tbody>
                  {CORE_SPECS.map((s) => (
                    <tr key={s.label}>
                      <th scope="row">{s.label}</th>
                      <td>{s.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ================= MOTION ================= */}
        <section className="sheet py-16 md:py-24">
          <SheetHead sheet="Sheet 4" title="M1 / M2 — motion" note="SCS0009 serial bus" />

          <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16 mt-10 md:items-center">
            <div className="max-w-[400px] mx-auto w-full">
              <ServoSweep />
            </div>

            <div>
              <p className="mt-0 text-[var(--ink-soft)] max-w-[42ch]">
                Two SCS0009 servos give the head pan and tilt. They are bus servos, so both
                share one pair of wires and each answers to its own address — you send a
                position, it reports back where it actually got to.
              </p>
              <dl className="title-block mt-8 max-w-[420px]">
                <div><dt>Travel</dt><dd>300°</dd></div>
                <div><dt>Torque</dt><dd>2.3 kg·cm @ 6 V</dd></div>
                <div><dt>Protocol</dt><dd>RS485 bus</dd></div>
                <div><dt>Feedback</dt><dd>Position readback</dd></div>
              </dl>
              <p className="t-anno mt-5 mb-0">
                The head above moves within a narrower band than the full 300°.
              </p>
            </div>
          </div>
        </section>

        {/* ================= OPEN ================= */}
        <section className="sheet py-16 md:py-24">
          <SheetHead sheet="Sheet 5" title="Open all the way down" note="Apache-2.0" />

          <div className="mt-10 overflow-x-auto">
            <div className="min-w-[560px]">
              <SignalFlow />
            </div>
          </div>

          <div className="grid gap-12 md:grid-cols-2 md:gap-16 mt-12">
            <p className="mt-0 text-[var(--ink-soft)] max-w-[46ch]">
              Stack-chan is an open-source project by Shinya Ishikawa and its community,
              released under the Apache License 2.0. The firmware runs on the Moddable SDK,
              so you write the behaviour in JavaScript and flash it over USB-C.
            </p>
            <p className="mt-0 text-[var(--ink-soft)] max-w-[46ch]">
              We sell the parts, printed and matched, so you skip the sourcing. The software
              is not ours and never will be — it belongs to the project.{' '}
              <a href="https://github.com/meganetaaan/stack-chan" rel="noreferrer noopener"
                 target="_blank" className="text-[var(--ink)] underline underline-offset-4 decoration-[var(--rule)]">
                Read the source
              </a>.
            </p>
          </div>
        </section>

        {/* ================= RESERVE ================= */}
        <section id="reserve" className="sheet py-16 md:py-24 scroll-mt-4">
          <SheetHead sheet="Sheet 6" title="Reserve a kit" note={PRICE.ship} />

          <div className="grid gap-12 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] md:gap-16 mt-10">
            <ReserveForm />

            <aside>
              <dl className="title-block max-w-[420px]">
                <div><dt>Price</dt><dd>{PRICE.now}</dd></div>
                <div><dt>Was</dt><dd>{PRICE.mrp}</dd></div>
                <div><dt>Dispatch</dt><dd>1–2 weeks</dd></div>
                <div><dt>Payment</dt><dd>On confirmation</dd></div>
              </dl>
              <p className="mt-6 mb-0 text-[13.5px] text-[var(--ink-soft)] max-w-[40ch]">
                Reserving holds a kit from the current batch. We email you when yours is
                ready and you pay then — nothing is charged now.
              </p>
            </aside>
          </div>
        </section>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-[var(--rule)] mt-8">
        <div className="sheet py-10 grid gap-8 md:grid-cols-3">
          <div>
            <p className="t-anno m-0">Sold by</p>
            <p className="t-data text-[13px] mt-1.5 mb-0">{CONTACT.entity}</p>
            <p className="t-data text-[13px] mt-1 mb-0">{CONTACT.email}</p>
          </div>
          <div>
            <p className="t-anno m-0">Attribution</p>
            <p className="text-[13px] mt-1.5 mb-0 text-[var(--ink-soft)] max-w-[34ch]">
              Based on Stack-chan by Shinya Ishikawa and contributors, used under the
              Apache License 2.0. This kit is not an official Stack-chan product.
            </p>
          </div>
          <div>
            <p className="t-anno m-0">Your email</p>
            <p className="text-[13px] mt-1.5 mb-0 text-[var(--ink-soft)] max-w-[34ch]">
              An address you give us is stored so we can tell you about your kit. Nothing
              else, and we do not pass it on.
            </p>
          </div>
        </div>
      </footer>
    </>
  )
}
