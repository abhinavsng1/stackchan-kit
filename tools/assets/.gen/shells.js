export const SHELLS = [
    {
        id: 'graphite', name: 'Black', hex: '#26272b',
        head: '#26272b', neck: '#18191c', base: '#26272b',
        note: 'Black, from its head to its feet. Disappears into a dark desk.',
    },
    {
        id: 'bone', name: 'White', hex: '#ece9e2',
        head: '#ece9e2', neck: '#dcd8cf', base: '#ece9e2',
        note: 'White, with a soft white neck. Quiet on a light desk.',
    },
];
/**
 * The colourway ids, derived rather than retyped.
 *
 * The order schema validates against this, so a colourway that is removed
 * from the list stops being orderable in the same commit — rather than the
 * two drifting until someone orders a colour nobody prints any more.
 */
export const SHELL_IDS = SHELLS.map((s) => s.id);
/** What a buyer gets if they never touch the picker. */
export const DEFAULT_SHELL = 'graphite';
/**
 * The colourway the page shows first, and so the one the order form starts
 * on. It differs from DEFAULT_SHELL on purpose: that is what an order with no
 * colour at all is recorded as (a tab opened before colours existed), while
 * this is what a visitor actually sees — and whatever they see is what they
 * order unless they change it.
 */
export const LEAD_SHELL = 'graphite';
export const shellById = (id) => SHELLS.find((s) => s.id === id) ?? SHELLS[0];
