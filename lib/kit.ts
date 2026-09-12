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
  { desig: 'J1',  qty: '× 1',     art: 'programmer', name: 'FE-URT-1 servo programmer',
    note: 'USB to TTL. Set servo IDs and centre positions from your laptop.' },
  { desig: 'PS1', qty: '× 1',     art: 'psu',        name: '5 V 3 A power supply',
    note: '5.5 mm DC plug, sized so both servos can stall at once without a brownout.' },
  { desig: 'H1',  qty: '× 1 set', art: 'shell',      name: '3D-printed shell and brackets',
    note: 'Printed here and shipped with the kit. You do not need a printer.' },
  { desig: 'W1',  qty: '× 1 set', art: 'cables',     name: '20 cm Dupont cable set',
    note: '40-pin, male/male, male/female and female/female.' },
  { desig: 'W2',  qty: '× 5',     art: 'grove',      name: 'Grove to jumper adapters',
    note: 'Breaks PORT.A out to individual jumpers for bench work.' },
  { desig: 'F1',  qty: '× 1 set', art: 'screws',     name: 'M2×8 and M3×16 fasteners',
    note: 'High-tensile, black oxide, countersunk so the shell sits flush.' },
  { desig: 'C1',  qty: '× 4',     art: 'caps',       name: '1000 µF 16 V capacitors',
    note: 'Bus decoupling. Stops servo inrush from browning out the controller.' },
]

/* ---------------------------------------------------------------- */

export type Capability = {
  key: string
  title: string
  body: string
  /** The part that makes this possible — receipts, not adjectives. */
  source: string
  tone: 'brand' | 'mint' | 'amber' | 'violet'
}

export const CAPABILITIES: Capability[] = [
  {
    key: 'face', tone: 'brand',
    title: 'It has a face',
    body: 'A 320 × 240 display renders the eyes. Expressions, blinking and a slow breathing idle are what the Stack-chan avatar library does out of the box.',
    source: 'U1 · 2.0" IPS display',
  },
  {
    key: 'move', tone: 'mint',
    title: 'It turns to look',
    body: 'Pan and tilt on two bus servos. Each reports the position it actually reached, so your code knows where the head is rather than guessing.',
    source: 'M1 + M2 · SCS0009',
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
    key: 'net', tone: 'brand',
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
  { n: 1, title: 'Set the servo IDs',
    body: 'Plug each servo into the FE-URT-1, give it an address, and centre it. Two minutes each, done once.' },
  { n: 2, title: 'Build the neck',
    body: 'Both servos bolt into the printed brackets with the M2 and M3 fasteners. Pan on the bottom, tilt on top.' },
  { n: 3, title: 'Wire the bus',
    body: 'Servos to the driver board, driver board to the controller, power supply to the rail. One pair of wires for both servos.' },
  { n: 4, title: 'Flash it',
    body: 'Pull the Stack-chan firmware, build with the Moddable SDK, push it over USB-C. The face comes up and the head finds centre.' },
]

/* ---------------------------------------------------------------- */

export type Spec = { label: string; value: string }

/** Source: docs.m5stack.com/en/core/CoreS3-Lite */
export const CORE_SPECS: Spec[] = [
  { label: 'MCU',           value: 'ESP32-S3 · Xtensa LX7 dual-core @ 240 MHz' },
  { label: 'Flash / PSRAM', value: '16 MB / 8 MB' },
  { label: 'Display',       value: '2.0" IPS · 320 × 240 · ILI9342C' },
  { label: 'Touch',         value: 'Capacitive · FT6336U' },
  { label: 'Camera',        value: 'GC0308 · 0.3 MP' },
  { label: 'Microphone',    value: 'ES7210 codec · dual input' },
  { label: 'Speaker',       value: 'AW88298 I²S amplifier · 1 W' },
  { label: 'IMU',           value: 'BMI270 6-axis + BMM150 magnetometer' },
  { label: 'Light sensor',  value: 'LTR-553ALS-WA proximity / ambient' },
  { label: 'Power / RTC',   value: 'AXP2101 PMIC · BM8563 RTC' },
  { label: 'Battery',       value: '200 mAh LiPo' },
  { label: 'Storage',       value: 'microSD slot' },
  { label: 'Ports',         value: 'HY2.0-4P (PORT.A) · M5-BUS' },
  { label: 'USB',           value: 'USB-C · OTG and Serial/JTAG' },
  { label: 'Dimensions',    value: '54.0 × 54.0 × 16.5 mm' },
  { label: 'Mass',          value: '54 g' },
]

export const SERVO_SPECS: Spec[] = [
  { label: 'Model',    value: 'SCS0009 serial bus servo' },
  { label: 'Voltage',  value: '6 V' },
  { label: 'Torque',   value: '2.3 kg·cm' },
  { label: 'Travel',   value: '300°' },
  { label: 'Bus',      value: 'RS485, addressable' },
  { label: 'Feedback', value: 'Position readback' },
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
  mrp: '₹16,999',
  now: '₹11,999',
  save: 'Save ₹5,000',
  ship: 'Ships in 1–2 weeks',
} as const

/** Replace before launch. */
export const CONTACT = {
  email: 'REPLACE-ME@example.com',
  entity: 'REPLACE — SELLING ENTITY NAME',
} as const
