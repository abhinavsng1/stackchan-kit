/**
 * Kit contents and specifications.
 *
 * Contents are transcribed from supplier invoices; specifications from vendor
 * documentation (docs.m5stack.com/en/core/CoreS3-Lite, fetched 2026-09-12).
 *
 * Component costs, supplier names and sourcing are deliberately absent. The
 * only price this site states is the kit price.
 *
 * Designators (U1, M1, A1 ...) follow schematic convention and map to real
 * parts, so the numbering carries information rather than decoration.
 */

export type Part = {
  desig: string
  qty: string
  name: string
  note: string
}

export const PARTS: Part[] = [
  {
    desig: 'U1',
    qty: '1',
    name: 'M5Stack CoreS3 Lite',
    note: 'ESP32-S3 controller. The face and the brain — 2.0" touch display, camera, dual mics, speaker, IMU.',
  },
  {
    desig: 'M1',
    qty: '1',
    name: 'SCS0009 serial-bus servo — pan',
    note: '6 V, 2.3 kg·cm, 300° of travel. Addressable over the RS485 bus.',
  },
  {
    desig: 'M2',
    qty: '1',
    name: 'SCS0009 serial-bus servo — tilt',
    note: 'Identical to M1, addressed separately. Two servos, one pair of wires.',
  },
  {
    desig: 'A1',
    qty: '1',
    name: 'Waveshare serial bus servo driver board',
    note: 'Drives ST/SC-series bus servos and carries the servo supply rail.',
  },
  {
    desig: 'J1',
    qty: '1',
    name: 'FE-URT-1 servo bus programmer',
    note: 'USB to TTL. Set servo IDs and calibrate centre positions from your laptop.',
  },
  {
    desig: 'PS1',
    qty: '1',
    name: '5 V 3 A power supply',
    note: '5.5 mm DC plug. Sized for both servos stalling at once.',
  },
  {
    desig: 'H1',
    qty: '1 set',
    name: '3D-printed shell and servo brackets',
    note: 'Printed and shipped with the kit. No printer required.',
  },
  {
    desig: 'W1',
    qty: '1 set',
    name: '20 cm Dupont cable set',
    note: '40-pin, male/male, male/female and female/female.',
  },
  {
    desig: 'W2',
    qty: '5',
    name: 'Grove to female-jumper adapters',
    note: 'Breaks PORT.A out to individual jumpers for bench work.',
  },
  {
    desig: 'F1',
    qty: '1 set',
    name: 'M2×8 and M3×16 hex CSK fasteners',
    note: 'High-tensile, black oxide. Countersunk so the shell sits flush.',
  },
  {
    desig: 'C1–C4',
    qty: '4',
    name: '1000 µF 16 V electrolytic capacitors',
    note: 'Bus decoupling. Keeps servo inrush from browning out the controller.',
  },
]

export type Spec = { label: string; value: string }

/** Source: docs.m5stack.com/en/core/CoreS3-Lite */
export const CORE_SPECS: Spec[] = [
  { label: 'MCU', value: 'ESP32-S3 · Xtensa LX7 dual-core @ 240 MHz' },
  { label: 'Flash / PSRAM', value: '16 MB / 8 MB' },
  { label: 'Display', value: '2.0" IPS · 320 × 240 · ILI9342C' },
  { label: 'Touch', value: 'Capacitive · FT6336U' },
  { label: 'Camera', value: 'GC0308 · 0.3 MP' },
  { label: 'Microphone', value: 'ES7210 codec · dual input' },
  { label: 'Speaker', value: 'AW88298 I²S amplifier · 1 W' },
  { label: 'IMU', value: 'BMI270 6-axis + BMM150 magnetometer' },
  { label: 'Light sensor', value: 'LTR-553ALS-WA proximity / ambient' },
  { label: 'Power / RTC', value: 'AXP2101 PMIC · BM8563 RTC' },
  { label: 'Battery', value: '200 mAh LiPo' },
  { label: 'Storage', value: 'microSD slot' },
  { label: 'Ports', value: 'HY2.0-4P (PORT.A) · M5-BUS' },
  { label: 'USB', value: 'USB-C · OTG and Serial/JTAG' },
  { label: 'Dimensions', value: '54.0 × 54.0 × 16.5 mm' },
  { label: 'Mass', value: '54 g' },
]

export const PRICE = {
  mrp: '₹16,999',
  now: '₹11,999',
  ship: 'Ships in 1–2 weeks',
} as const

/** Replace before launch. */
export const CONTACT = {
  email: 'REPLACE-ME@example.com',
  entity: 'REPLACE — SELLING ENTITY NAME',
} as const
