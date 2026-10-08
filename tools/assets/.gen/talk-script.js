/** Length of the chat loop, seconds. */
export const CHAT_LOOP = 14;
export const SCRIPT = [
    { who: 'you', text: 'Hi, Stack-chan.', at: 0.6 },
    { who: 'note', text: 'It looks up, and turns to you.', at: 1.5 },
    { who: 'robot', text: 'Hey! What’s up?', at: 2.6 },
    { who: 'you', text: 'What’s this I’m holding?', at: 5.2 },
    { who: 'note', text: 'It takes a photo to see what you mean.', at: 6.3 },
    { who: 'robot', text: 'A little cactus. It looks thirsty.', at: 8.0 },
];
/** When the robot is speaking each answer, seconds into the loop. */
export const SPEAKING = [[2.6, 4.3], [8.0, 10.6]];
/** The script splits into exchanges at each thing you say after the first. */
export const EXCHANGE_STARTS = SCRIPT.flatMap((l, i) => (l.who === 'you' ? [i] : []));
