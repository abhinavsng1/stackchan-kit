/**
 * When you actually see each face.
 *
 * The atlas in lib/faces.ts already records what sets each one, but it records
 * it for whoever is wiring the thing: "bus fault, torque refused", "write
 * rejected". Those are the real triggers and they stay there. This is the same
 * list of triggers said the way the person buying it would say them, and it
 * lives beside the product page rather than in the atlas because the kit page
 * wants the engineering wording.
 *
 * Every line here describes behaviour the firmware really has. Nothing is
 * aspirational — a mood the robot cannot reach is a promise the box breaks.
 */
export const WHEN: Record<string, string> = {
  neutral: 'Resting. Every other mood drifts back to this one.',
  happy: 'It heard you, and it has got it.',
  excited: 'Something happened worth reacting to.',
  love: 'Right after something goes the way you wanted.',
  sleepy: 'A few minutes with nobody about. It dozes.',
  sad: 'It tried and could not. The gentle version of no.',
  angry: 'Something is stuck, or you asked it to scowl at someone.',
  surprised: 'Someone turned up, or it got a nudge while it was idle.',
  curious: 'The head-tilt. It is working out what it just saw.',
  doubt: 'It heard you. It is not convinced.',
  wink: 'Noted. Gone again before it gets annoying.',
  error: 'Only the robot can set this one, and only when something is genuinely wrong. It stays until you fix it.',
}
