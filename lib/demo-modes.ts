/**
 * What the "What it does" section shows, as content: each mode's words, how
 * honest a demonstration it is, and — where it plays out over time — its
 * script. components/site/DemoStage.tsx presents it; lib/live-demo.ts moves
 * the robot. Nothing here knows about either.
 *
 * Every claim maps to a capability the product has (see the FAQ and
 * docs/capabilities, as confirmed by the team):
 *
 *   built in      faces, eye movement, head movement, touch
 *   needs Wi-Fi   conversation with the AI agent
 *   app           the companion app: moving its head, its face, its camera
 *   preview       custom faces and colours, shown here on the page
 *
 * A scripted exchange is an illustration and is labelled as one. It is never
 * presented as a live AI.
 */

export type Status = 'built-in' | 'wifi' | 'mixed' | 'app' | 'preview'

export const STATUS_LABEL: Record<Status, string> = {
  'built-in': 'Built in',
  wifi: 'With Wi-Fi and its AI agent',
  mixed: 'Faces built in · talking over Wi-Fi',
  app: 'With the companion app',
  preview: 'Preview',
}

/** One beat of a script, `at` seconds after the mode starts. */
export type Step =
  | { at: number; you: string }
  | { at: number; robot: string; for: number }
  | { at: number; note: string }
  | { at: number; mood: string }
  | { at: number; look: [number, number] }
  | { at: number; nod: number }
  | { at: number; shake: true }
  | { at: number; follow: true }
  /** Clear the conversation from the stage. */
  | { at: number; clear: true }

export type Mode = {
  id: string
  label: string
  /** For the chip grid on a phone: one short word. */
  short: string
  title: string
  body: string
  status: Status
  /** Shown under the stage for anything scripted or previewed. */
  fine?: string
  /** For modes that play out: the steps, and when the loop starts again. */
  script?: Step[]
  loop?: number
}

export const MODES: Mode[] = [
  {
    id: 'meet', label: 'Meet', short: 'Meet', status: 'mixed',
    title: 'It talks, listens and feels.',
    body: 'Left alone it blinks and looks around. Talk to it and it looks up, answers out loud, and wears how it feels on its face. Tap a face to try one.',
    fine: 'The conversation is an illustration, not a recording or a live AI.',
    loop: 19.5,
    script: [
      { at: 0, mood: 'awake' }, { at: 0, follow: true },
      { at: 0.2, note: 'It blinks and looks around on its own.' },
      { at: 2.6, mood: 'listening' }, { at: 2.6, look: [10, 16] },
      { at: 2.8, you: 'I can’t decide what to cook tonight.' },
      { at: 4.8, mood: 'happy' }, { at: 4.8, robot: 'What’s in the fridge?', for: 1.6 },
      { at: 7.0, mood: 'listening' }, { at: 7.0, look: [6, 20] },
      { at: 7.2, you: 'Eggs, spinach and half an onion.' },
      { at: 9.4, mood: 'happy' }, { at: 9.4, nod: 1 },
      { at: 9.6, robot: 'That’s a frittata. Fifteen minutes. Want the steps?', for: 3.2 },
      { at: 13.3, clear: true },
      { at: 13.4, note: 'And it wears how it feels.' },
      { at: 13.4, mood: 'surprised' }, { at: 13.4, look: [0, 24] },
      { at: 14.6, mood: 'sad' }, { at: 14.6, look: [-28, 0] },
      { at: 15.8, mood: 'curious' }, { at: 15.8, look: [22, 16] },
      { at: 17.0, mood: 'happy' }, { at: 17.0, look: [0, 10] }, { at: 17.2, nod: 2 },
      { at: 18.6, follow: true },
    ],
  },
  {
    id: 'touch', label: 'Touch', short: 'Touch', status: 'built-in',
    title: 'It notices your touch.',
    body: 'Pat its head, poke its side, tap its face. Every touch gets its own reaction.',
  },
  {
    id: 'dance', label: 'Dance', short: 'Dance', status: 'built-in',
    title: 'It dances.',
    body: 'Head bobbing, swaying side to side, grinning the whole time. Not useful. Very fun.',
    loop: 4.8,
    script: [
      { at: 0, mood: 'happy' },
      { at: 0, look: [-30, 6] }, { at: 0.3, nod: 1 },
      { at: 0.6, look: [30, 12] }, { at: 0.9, nod: 1 },
      { at: 1.2, look: [-30, 6] }, { at: 1.5, nod: 1 },
      { at: 1.8, look: [30, 12] }, { at: 2.1, nod: 1 },
      { at: 2.4, look: [0, 24] }, { at: 2.4, mood: 'surprised' },
      { at: 2.9, shake: true }, { at: 2.9, mood: 'happy' },
      { at: 3.6, look: [-18, 10] }, { at: 3.9, nod: 2 },
    ],
  },
  {
    id: 'call', label: 'Video call', short: 'Call', status: 'app',
    title: 'Video call it from anywhere.',
    body: 'Open the companion app and you’re looking through its camera. Turn its head to look around the room and change its face, from wherever you are.',
    fine: 'The panel here is a stand-in for the app, driving the robot on this page.',
  },
  {
    id: 'yours', label: 'Make it yours', short: 'Style', status: 'preview',
    title: 'Make it look like yours.',
    body: 'Pick its colour, give it a new face. Small touches that make it feel like it belongs on your desk.',
    fine: 'A preview on this page.',
  },
]

/** The faces offered in the Faces mode, and what the head does with each. */
export const EXPRESSIONS: { id: string; label: string; look: [number, number]; gesture?: 'nod' | 'shake' }[] = [
  { id: 'happy', label: 'Happy', look: [0, 10], gesture: 'nod' },
  { id: 'sad', label: 'Sad', look: [-28, 0] },
  { id: 'angry', label: 'Angry', look: [0, 4], gesture: 'shake' },
  { id: 'surprised', label: 'Surprised', look: [0, 26] },
  { id: 'curious', label: 'Curious', look: [22, 16] },
  { id: 'sleepy', label: 'Sleepy', look: [-10, 0] },
]

/** The three touch zones on its body, and the screen; what each does. */
export const TOUCHES: { id: string; label: string; mood: string; look: [number, number]; gesture?: 'nod' | 'shake' }[] = [
  { id: 'top', label: 'Pat its head', mood: 'happy', look: [0, 12], gesture: 'nod' },
  { id: 'left', label: 'Poke its left side', mood: 'surprised', look: [-30, 10] },
  { id: 'right', label: 'Poke its right side', mood: 'curious', look: [30, 14] },
  { id: 'screen', label: 'Tap the screen', mood: 'pleased', look: [0, 8], gesture: 'nod' },
]

/** Custom faces offered in the Make it yours preview. */
export const CUSTOM_FACES = ['heart', 'wink', 'happy'] as const
