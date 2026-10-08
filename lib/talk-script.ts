/**
 * The exchange in "Talk to it", and when each line lands.
 *
 * It is a script of what the shipped firmware does — wake word heard on the
 * robot, a turn of the head, an answer out loud, a photo to see what you
 * mean — not a transcript of a real conversation, and the page says so.
 *
 * `at` is seconds into public/media/render/loop-chat, the loop the phone
 * layout plays behind the conversation. That loop is rendered from these
 * same numbers (tools/assets/build-site.mjs compiles this file), so the
 * robot turns when it hears its name and its mouth moves while it answers,
 * exactly under the line that says so.
 */
export type Line = { who: 'you' | 'robot' | 'note'; text: string; at: number }

/** Length of the chat loop, seconds. */
export const CHAT_LOOP = 14

export const SCRIPT: Line[] = [
  { who: 'you', text: 'Hi, Stack-chan.', at: 0.6 },
  { who: 'note', text: 'It looks up, and turns to you.', at: 1.5 },
  { who: 'robot', text: 'Hey! What’s up?', at: 2.6 },
  { who: 'you', text: 'What’s this I’m holding?', at: 5.2 },
  { who: 'note', text: 'It takes a photo to see what you mean.', at: 6.3 },
  { who: 'robot', text: 'A little cactus. It looks thirsty.', at: 8.0 },
]

/** When the robot is speaking each answer, seconds into the loop. */
export const SPEAKING: [number, number][] = [[2.6, 4.3], [8.0, 10.6]]

/** The script splits into exchanges at each thing you say after the first. */
export const EXCHANGE_STARTS = SCRIPT.flatMap((l, i) => (l.who === 'you' ? [i] : []))
