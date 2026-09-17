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
   * Slug of the clip that shows this capability, where one exists. Wi-Fi and
   * a software licence are not things a camera can point at, so those two
   * tiles stay drawn rather than filmed.
   */
  clip?: string
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'face', clip: 'face', tone: 'brand',
    title: 'It has a face',
    body: 'A 320 × 240 display renders the eyes. Expressions, blinking and a slow breathing idle are what the Stack-chan avatar library does out of the box.',
    source: 'U1 · 2.0" IPS display',
  },
  {
    key: 'move', clip: 'move', tone: 'mint',
    title: 'It turns to look',
    body: 'Pan and tilt on two bus servos. Each reports the position it actually reached, so your code knows where the head is rather than guessing.',
    source: 'M1 + M2 · SCS0009',
  },
  {
    key: 'see', clip: 'see', tone: 'amber',
    title: 'It can see',
    body: 'An onboard camera plus a proximity and ambient-light sensor. Pointing the head at a face is the classic first project, and every part for it is in the box.',
    source: 'U1 · GC0308 + LTR-553ALS',
  },
  {
    key: 'talk', clip: 'talk', tone: 'violet',
    title: 'It talks and listens',
    body: 'A 1 W speaker on an I²S amplifier and two microphones on a full-duplex codec. Speech in, speech out, no extra module.',
    source: 'U1 · AW88298 + ES7210',
  },
  {
    key: 'touch', clip: 'touch', tone: 'amber',
    title: 'You can touch it',
    body: 'The display is capacitive, so the face doubles as the interface. Tap it, swipe it, put a menu on it — the driver is already wired up.',
    source: 'U1 · FT6336U',
  },
  {
    key: 'net', clip: 'net', tone: 'brand',
    title: 'It gets online',
    body: 'Wi-Fi and Bluetooth are on the ESP32-S3. Point it at whichever speech or language API you like — the kit takes no view on that.',
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

export type Build = { title: string; body: string; effort: string; tone: 'brand' | 'mint' | 'amber' | 'violet'; clip: string }

/** Concrete projects, with an honest sense of how much work each one is. */
export const BUILDS: Build[] = [
  {
    tone: 'brand', effort: 'An evening',
    clip: 'build-1',
    title: 'A desk companion that notices you',
    body: 'Point the camera at your chair. It looks up when you sit down, follows you while you work, and goes sleepy when you leave. About forty lines once the face is drawing.',
  },
  {
    tone: 'mint', effort: 'A weekend',
    clip: 'build-2',
    title: 'A voice assistant with a face',
    body: 'Two microphones in, a 1 W speaker out, Wi-Fi in between. Wire it to whichever speech and language API you already pay for — it reacts while it thinks, which is most of why it feels alive.',
  },
  {
    tone: 'amber', effort: 'An afternoon',
    clip: 'build-3',
    title: 'A standup bot for the team',
    body: 'It turns to whoever is speaking, shows the build status on its face, and goes Error red when CI breaks. The twelve expressions are already there and settable over HTTP.',
  },
  {
    tone: 'violet', effort: 'An hour',
    clip: 'build-4',
    title: 'A very good pomodoro timer',
    body: 'Curious while you work, sleepy on a break, excited when the cycle completes. The least useful thing you can build with it and the one people keep on the desk.',
  },
  {
    tone: 'brand', effort: 'A term',
    clip: 'build-5',
    title: 'A teaching rig',
    body: 'One object that covers RS485, servo addressing, I²S audio, camera capture and an embedded JavaScript runtime. Students can break it and put it back together.',
  },
  {
    tone: 'mint', effort: 'Ongoing',
    clip: 'build-6',
    title: 'Whatever you were going to build anyway',
    body: 'It is a stock CoreS3 on a servo bus with the shell already printed. If you had a robotics idea waiting on a mechanical starting point, this is one.',
  },
]

/* ---------------------------------------------------------------- */

export type Faq = { q: string; a: string }

export const FAQS: Faq[] = [
  { q: 'Do I need a 3D printer?',
    a: 'No. The shell and the servo brackets are printed here and ship in the box. If you would rather print your own, the Stack-chan project publishes the models.' },
  { q: 'What is Pebble-chan, exactly?',
    a: 'It is our build kit, assembled around the open-source Stack-chan project and an M5Stack CoreS3 Lite. It is not the official M5Stack product — that is a different, pre-assembled device with its own hardware. The software is Stack-chan and we take no credit for it.' },
  { q: 'What do I write the software in?',
    a: 'Stack-chan runs on the Moddable SDK, so the behaviour is JavaScript. The controller is a stock CoreS3 Lite, so the Arduino core and M5Unified work as well if you prefer C++.' },
  { q: 'Does it need the internet to work?',
    a: 'No. The face, the motion and the sensors all run on the device. Wi-Fi is there for when you want to reach a speech or language API, and that choice is yours.' },
  { q: 'What do I need that is not in the box?',
    a: 'A USB-C cable and a computer to flash it. Nothing else.' },
  { q: 'When does it ship and when do I pay?',
    a: 'Kits dispatch within 1–2 weeks of your order being confirmed. Reserving costs nothing — you pay when we confirm your batch.' },
]

/* ---------------------------------------------------------------- */

export const PRICE = {
  mrp: '₹13,999',
  now: '₹8,999',
  save: 'Save ₹5,000',
  ship: 'Ships in 1–2 weeks',
} as const

export const CONTACT = {
  email: 'support@pebblerobo.com',
  entity: 'Pebble Robo',
} as const
