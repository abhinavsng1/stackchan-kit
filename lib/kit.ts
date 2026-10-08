/**
 * Kit contents, capabilities and copy.
 *
 * Contents transcribed from supplier invoices; specifications from
 * docs.m5stack.com/en/core/CoreS3-Lite (fetched 2026-09-12).
 *
 * Component costs, supplier names and sourcing are deliberately absent. The
 * only price this site states is the kit price.
 *
 * Every capability below names the part that provides it. Nothing is claimed
 * that the bill of materials cannot back.
 */

export type PartArt =
  | 'core' | 'servo' | 'driver' | 'programmer' | 'psu'
  | 'shell' | 'cables' | 'grove' | 'screws' | 'caps'

export type Part = {
  desig: string
  qty: string
  name: string
  note: string
  art: PartArt
}

export const PARTS: Part[] = [
  { desig: 'U1',  qty: '× 1',     art: 'core',       name: 'M5Stack CoreS3 Lite',
    note: 'ESP32-S3 controller with a 2.0" touch display, camera, dual mics and speaker. This is the face and the brain.' },
  { desig: 'M1',  qty: '× 1',     art: 'servo',      name: 'SCS0009 bus servo — pan',
    note: '6 V, 2.3 kg·cm, 300° of travel. Turns the head left and right.' },
  { desig: 'M2',  qty: '× 1',     art: 'servo',      name: 'SCS0009 bus servo — tilt',
    note: 'Same servo, its own address on the bus. Nods the head up and down.' },
  { desig: 'A1',  qty: '× 1',     art: 'driver',     name: 'Waveshare bus servo driver',
    note: 'Drives both servos over one RS485 pair and carries the servo power rail.' },
  { desig: 'PS1', qty: '× 1',     art: 'psu',        name: '5 V 3 A power supply',
    note: '5.5 mm DC plug, sized so both servos can stall at once without a brownout.' },
  { desig: 'H1',  qty: '× 1 set', art: 'shell',      name: '3D-printed shell and brackets',
    note: 'Printed here and shipped with the kit. You do not need a printer.' },
  { desig: 'W1',  qty: '× 1 set', art: 'cables',     name: '20 cm Dupont cable set',
    note: '40-pin, male/male, male/female and female/female.' },
  { desig: 'F1',  qty: '× 1 set', art: 'screws',     name: 'M2×8 and M3×16 fasteners',
    note: 'High-tensile, black oxide, countersunk so the shell sits flush.' },
]

/* ---------------------------------------------------------------- */

export type Capability = {
  key: string
  title: string
  body: string
  /** The part that makes this possible — receipts, not adjectives. */
  source: string
  tone: 'brand' | 'mint' | 'amber' | 'violet'
  /**
   * Slug of the clip in /media/robot that shows this capability, where one
   * exists. Wi-Fi and a microphone are not things a camera can point at, so
   * those tiles stay as text rather than pretend.
   */
  clip?: string
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'move', clip: 'clip-look', tone: 'mint',
    title: 'It turns to look',
    body: 'The head pans on a bus servo that reports the position it actually reached, so the robot knows where it is looking rather than guessing.',
    source: 'M1 · SCS0009 pan',
  },
  {
    key: 'tilt', clip: 'clip-tilt', tone: 'amber',
    title: 'It nods and tilts',
    body: 'A second servo, on its own address on the same bus, tips the head up, down and sideways. Two axes are what make it read as curious.',
    source: 'M2 · SCS0009 tilt',
  },
  {
    key: 'face', clip: 'clip-face', tone: 'brand',
    title: 'It has a face',
    body: 'A 320 × 240 display draws the eyes. Expressions, blinking and a slow breathing idle run from the moment it is plugged in.',
    source: 'U1 · 2.0" IPS display',
  },
  {
    key: 'see', tone: 'amber',
    title: 'It can see',
    body: 'An onboard camera plus a proximity and ambient-light sensor. Pointing the head at a face is the classic first project, and every part for it is in the box.',
    source: 'U1 · GC0308 + LTR-553ALS',
  },
  {
    key: 'talk', tone: 'violet',
    title: 'It talks and listens',
    body: 'A 1 W speaker on an I²S amplifier and two microphones on a full-duplex codec. Speech in, speech out, no extra module.',
    source: 'U1 · AW88298 + ES7210',
  },
  {
    key: 'touch', tone: 'amber',
    title: 'You can touch it',
    body: 'The display is capacitive, so the face doubles as the interface. Tap it, swipe it, put a menu on it — the driver is already wired up.',
    source: 'U1 · FT6336U',
  },
  {
    key: 'net', tone: 'brand',
    title: 'It gets online',
    body: 'Wi-Fi and Bluetooth are on the ESP32-S3. Point it at whichever speech or language API you like — Pebble-chan takes no view on that.',
    source: 'U1 · ESP32-S3',
  },
  {
    key: 'hack', tone: 'mint',
    title: 'You rewrite all of it',
    body: 'Stack-chan runs on the Moddable SDK in JavaScript, and the module is a stock CoreS3 — Arduino and M5Unified work too. Apache-2.0, all the way down.',
    source: 'Open source',
  },
]

/* ---------------------------------------------------------------- */

export type Step = { n: number; title: string; body: string }

export const BUILD_STEPS: Step[] = [
  { n: 1, title: 'Check the servos',
    body: 'Both arrive already addressed and centred — pan on one ID, tilt on the other. Power them up and confirm each answers before anything is bolted shut.' },
  { n: 2, title: 'Build the neck',
    body: 'Both servos bolt into the printed brackets with the M2 and M3 fasteners. Pan on the bottom, tilt on top.' },
  { n: 3, title: 'Wire the bus',
    body: 'Servos to the driver board, driver board to the controller, power supply to the rail. One pair of wires for both servos.' },
  { n: 4, title: 'Flash it',
    body: 'Pull the Stack-chan firmware, build with the Moddable SDK, push it over USB-C. The face comes up and the head finds centre.' },
]

/* ---------------------------------------------------------------- */

export type Spec = { label: string; value: string | string[] }
export type SpecTable = { title: string; desig: string; rows: Spec[] }

/**
 * Grouped by subsystem rather than listed flat: a reader looking for "can it
 * hear me" wants one Audio row, not three lines scattered through sixteen.
 * Controller figures come from docs.m5stack.com/en/core/CoreS3-Lite; servo
 * figures from the supplier's line item.
 */
export const SPEC_TABLES: SpecTable[] = [
  {
    title: 'Controller', desig: 'U1',
    rows: [
      { label: 'Main controller', value: [
        'ESP32-S3',
        'Xtensa LX7 dual-core 32-bit, 240 MHz',
        '16 MB Flash, 8 MB PSRAM',
      ] },
      { label: 'Wireless', value: ['2.4 GHz Wi-Fi', 'Bluetooth LE'] },
      { label: 'Wired', value: ['USB-C, OTG and Serial/JTAG', 'HY2.0-4P (PORT.A), M5-BUS'] },
      { label: 'Display', value: [
        '2.0-inch IPS LCD, 320 × 240, ILI9342C driver',
        'Capacitive touch, FT6336U driver',
      ] },
      { label: 'Camera', value: 'GC0308, 0.3 MP' },
      { label: 'Audio', value: [
        'AW88298 16-bit I²S amplifier, 1 W speaker',
        'ES7210 codec, dual microphone input',
      ] },
      { label: 'Sensors', value: [
        'BMI270 6-axis IMU + BMM150 magnetometer',
        'LTR-553ALS-WA proximity and ambient light',
      ] },
      { label: 'Power', value: ['AXP2101 PMIC', 'BM8563 RTC', '200 mAh LiPo'] },
      { label: 'Storage', value: 'microSD slot' },
      { label: 'Dimensions', value: ['54.0 × 54.0 × 16.5 mm', '54 g'] },
    ],
  },
  {
    title: 'Motion', desig: 'M1 · M2',
    rows: [
      { label: 'Servo', value: 'SCS0009 serial bus servo, two supplied' },
      { label: 'Bus', value: ['RS485, individually addressable', 'Position readback'] },
      { label: 'Operating voltage', value: '6 V' },
      { label: 'Stall torque', value: '2.3 kg·cm' },
      { label: 'Travel', value: '300°' },
      { label: 'Axes', value: ['Pan, driven by M1', 'Tilt, driven by M2'] },
    ],
  },
  {
    title: 'Power and driver', desig: 'A1 · PS1',
    rows: [
      { label: 'Driver board', value: ['Waveshare serial bus servo driver', 'ST/SC series compatible'] },
      { label: 'Supply', value: ['5 V, 3 A', '5.5 mm DC barrel plug'] },
      { label: 'Rail', value: 'Servo supply kept off the controller rail' },
    ],
  },
  {
    title: 'Software', desig: '—',
    rows: [
      { label: 'Firmware', value: ['Stack-chan on the Moddable SDK', 'Behaviour written in JavaScript'] },
      { label: 'Also supported', value: 'Arduino core and M5Unified, in C++' },
      { label: 'Licence', value: 'Apache License 2.0' },
      { label: 'Expressions', value: 'Twelve face states, server-authoritative' },
    ],
  },
]

/* ---------------------------------------------------------------- */

export type Build = { title: string; body: string; effort: string; tone: 'brand' | 'mint' | 'amber' | 'violet' }

/** Concrete projects, with an honest sense of how much work each one is. */
export const BUILDS: Build[] = [
  {
    tone: 'brand', effort: 'An evening',
    title: 'A desk companion that notices you',
    body: 'Point the camera at your chair. It looks up when you sit down, follows you while you work, and goes sleepy when you leave. About forty lines once the face is drawing.',
  },
  {
    tone: 'mint', effort: 'A weekend',
    title: 'A voice assistant with a face',
    body: 'Two microphones in, a 1 W speaker out, Wi-Fi in between. Wire it to whichever speech and language API you already pay for — it reacts while it thinks, which is most of why it feels alive.',
  },
  {
    tone: 'amber', effort: 'An afternoon',
    title: 'A standup bot for the team',
    body: 'It turns to whoever is speaking, shows the build status on its face, and goes Error red when CI breaks. The twelve expressions are already there and settable over HTTP.',
  },
  {
    tone: 'violet', effort: 'An hour',
    title: 'A very good pomodoro timer',
    body: 'Curious while you work, sleepy on a break, excited when the cycle completes. The least useful thing you can build with it and the one people keep on the desk.',
  },
  {
    tone: 'brand', effort: 'A term',
    title: 'A teaching rig',
    body: 'One object that covers RS485, servo addressing, I²S audio, camera capture and an embedded JavaScript runtime. Students can break it and put it back together.',
  },
  {
    tone: 'mint', effort: 'Ongoing',
    title: 'Whatever you were going to build anyway',
    body: 'It is a stock CoreS3 on a servo bus with the shell already printed. If you had a robotics idea waiting on a mechanical starting point, this is one.',
  },
]

/* ---------------------------------------------------------------- */

export type Faq = { q: string; a: string }

export const FAQS: Faq[] = [
  { q: 'Does it arrive assembled?',
    a: 'Yes, unless you choose otherwise. Pebble-chan ships built, flashed and tested: plug in the supplied power adapter and the face comes up. If you would rather build it yourself, choose the kit — same price, same parts.' },
  { q: 'What is the difference between the robot and the kit?',
    a: 'Only who puts it together. Both have the same CoreS3 Lite, the same two bus servos, the same printed shell and the same power supply, and both cost ₹4,999. The robot is assembled and tested by us; the kit arrives as eight parts and takes an evening, with no soldering.' },
  { q: 'Do I need to know how to code?',
    a: 'Not to enjoy it. It runs the Stack-chan firmware out of the box. When you want to change what it does, the behaviour is JavaScript on the Moddable SDK, and the controller is a stock CoreS3 Lite, so the Arduino core and M5Unified work as well.' },
  { q: 'What is Pebble-chan, exactly?',
    a: 'It is our desktop robot, built around the open-source Stack-chan project and an M5Stack CoreS3 Lite. It is not the official M5Stack product — that is a different device with its own hardware. The software is Stack-chan and we take no credit for it.' },
  { q: 'Does it need the internet to work?',
    a: 'No. The face, the motion and the sensors all run on the device. Wi-Fi is there for when you want to reach a speech or language API, and that choice is yours.' },
  { q: 'What do I need that is not in the box?',
    a: 'For the robot, nothing: the power supply is included. For the kit, a USB-C cable and a computer to flash it. You never need a 3D printer — the shell is printed here and ships with both.' },
  { q: 'When does it ship and when do I pay?',
    a: 'You pay ₹499 now to book your kit — card, UPI, netbanking or EMI. The remaining ₹4,500 is collected in cash when the kit is delivered. Kits dispatch within 1–2 weeks of the batch closing.' },
]

/* ---------------------------------------------------------------- */

/**
 * The catalogue ids. Each has to match in three places that are read by
 * different systems: the page, the Meta pixel's `content_ids`, and a Merchant
 * Center feed. A mismatch there does not error, it just silently reports
 * nothing.
 *
 * SKU is the robot, which is what the page leads with. The kit keeps the id it
 * has always had, so reporting on earlier kit orders still lines up.
 */
export const SKU = 'PBL-BOT-01'
export const KIT_SKU = 'PBL-KIT-01'

/**
 * Two ways to buy the same robot, at the same price.
 *
 * The robot arrives built, flashed and tested. The kit is the same parts in a
 * box for someone who wants to put it together. Assembled is the default
 * everywhere — the page, the buy box, the order form — and the order records
 * which one was chosen, because the two are packed differently.
 */
export const EDITIONS = ['assembled', 'kit'] as const
export type Edition = (typeof EDITIONS)[number]
export const DEFAULT_EDITION: Edition = 'assembled'

export const EDITION: Record<Edition, {
  /** What it is called on a receipt or a packing slip. */
  name: string
  /** The choice, as a button label. */
  label: string
  /** One line under the label. */
  pitch: string
  sku: string
  assembly: string
  /** What we do between payment and dispatch. */
  prep: string
}> = {
  assembled: {
    name: 'Pebble-chan robot, fully assembled',
    label: 'Fully assembled',
    pitch: 'Built, flashed and tested. Plug it in and it wakes up.',
    sku: SKU,
    assembly: 'Done for you',
    prep: 'We build it, flash the firmware, and test the face and both servos before it is boxed.',
  },
  kit: {
    name: 'Pebble-chan build kit',
    label: 'Build-it-yourself kit',
    pitch: 'The same robot as eight parts. One evening, no soldering.',
    sku: KIT_SKU,
    assembly: 'You build it',
    prep: 'We match the parts, print the shell, and address and centre the servos.',
  },
}

export function isEdition(v: unknown): v is Edition {
  return typeof v === 'string' && (EDITIONS as readonly string[]).includes(v)
}

export const PRICE = {
  mrp: '₹13,999',
  /** What a kit costs in total. Not what is charged at checkout — see below. */
  now: '₹4,999',
  /**
   * The full price in paise. Kept because it is what the kit is worth and
   * what the balance is derived from, but it is NOT what the gateway is asked
   * for. A unit test asserts it matches the display string.
   */
  nowPaise: 499_900,

  /**
   * Booking is a deposit; the rest is collected on delivery.
   *
   * This is the only figure Razorpay is ever asked for, and it is decided
   * here rather than anywhere a browser can reach — see lib/razorpay.ts. The
   * balance is deliberately stored as its own constant rather than computed
   * at the point of use, so a rounding slip cannot put a different number on
   * the packing slip than the one the buyer was shown.
   */
  deposit: '₹499',
  depositPaise: 49_900,
  balance: '₹4,500',
  balancePaise: 450_000,

  save: 'Save ₹9,000',
  ship: 'Ships in 1–2 weeks',
} as const

/** The deposit and the balance must reconstruct the price, always. */
export function balancePaiseFor(qty: number): number {
  return PRICE.balancePaise * qty
}

/**
 * The early bird campaign.
 *
 * `endsAt` is an absolute instant, not a duration. A countdown computed as
 * "seven days from whenever you arrived" restarts for every visitor and for
 * the same visitor twice, which makes the scarcity claim untrue — and this is
 * a page whose whole argument is that its claims can be checked. One deadline,
 * the same for everyone, stated in full.
 *
 * When it passes the page must still be correct, so nothing anywhere reads
 * "7 days" as a constant; everything derives from this.
 */
export const CAMPAIGN = {
  name: 'Early bird',
  /**
   * 2026-10-02, 23:59:59 IST — the end of the seventh day, counting the
   * launch day (26 September) as day one. "7 days only" then means exactly
   * seven days rather than approximately seven.
   */
  endsAt: '2026-10-02T23:59:59+05:30',
  /** Shown while the campaign is live. */
  line: 'Early bird pricing — 7 days only',
  /** Shown once it has closed, so the page never advertises a dead offer. */
  closedLine: 'Early bird pricing has closed',
} as const

export type CampaignLeft = { days: number; hours: number; minutes: number; seconds: number }

/** Milliseconds until the campaign closes; 0 once it has. Pure, so it is tested. */
export function campaignMsLeft(now: Date = new Date()): number {
  return Math.max(0, new Date(CAMPAIGN.endsAt).getTime() - now.getTime())
}

export function campaignActive(now: Date = new Date()): boolean {
  return campaignMsLeft(now) > 0
}

/** The remaining time, split for display. */
export function campaignLeft(now: Date = new Date()): CampaignLeft {
  let ms = campaignMsLeft(now)
  const days = Math.floor(ms / 86_400_000); ms -= days * 86_400_000
  const hours = Math.floor(ms / 3_600_000); ms -= hours * 3_600_000
  const minutes = Math.floor(ms / 60_000); ms -= minutes * 60_000
  return { days, hours, minutes, seconds: Math.floor(ms / 1000) }
}

/**
 * The two people who make this.
 *
 * A first batch from an unknown company is a stranger asking for money, and
 * the ordinary fix — an "About us" page — is just more copy from the same
 * stranger. Two real profiles someone else hosts are checkable in a way
 * nothing on this domain can be, which is the same reason every part on the
 * page cites a shop.
 *
 * No titles. Two people who both do everything do not have titles, and
 * inventing them would be the one unverifiable thing in this block.
 */
export const BUILDERS = [
  { name: 'Abhinav Singh', href: 'https://www.linkedin.com/in/abhinav-singh-10164014b/' },
  { name: 'Surya Shekhawat', href: 'https://www.linkedin.com/in/suryashekhawat/' },
] as const

export const CONTACT = {
  email: 'support@pebblerobo.com',
  entity: 'Pebble Robo',
} as const
