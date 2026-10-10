/**
 * What the robot's screen shows besides its own face, for the renders.
 *
 * Drawn on the same 24 x 18 grid of cells as lib/companion-face.ts, in the
 * same chunky pixels, so a scene reads as something on that screen rather
 * than a picture pasted onto it. Standalone (no imports) so the render
 * pipeline can compile it on its own.
 *
 *   drawCaller  someone on a video call: their camera, on the robot's face
 *   drawNotes   music notes over the face, for the dance
 */
const COLS = 24;
const ROWS = 18;
function grid(ctx) {
    const w = ctx.canvas.width, h = ctx.canvas.height;
    const C = w / COLS;
    const oy = (h - ROWS * C) / 2;
    const cell = (x, y, cw, ch, fill) => {
        ctx.fillStyle = fill;
        ctx.fillRect(Math.round(x * C), Math.round(oy + y * C), Math.round(cw * C), Math.round(ch * C));
    };
    return { w, h, C, oy, cell };
}
/**
 * A person on a video call, as pixel art: a warm room behind them, their
 * head and shoulders, and a mouth that moves while they talk. A small call
 * bar along the top — a live dot and the time — says what this is.
 *
 * @param t     Milliseconds, for the blink and the call timer.
 * @param talk  How open their mouth is, 0 to 1.
 */
export function drawCaller(ctx, t, talk = 0) {
    const { w, h, C, oy, cell } = grid(ctx);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    // The room behind them: a wall, a window of warm light, a shelf.
    cell(0, 0, 24, 18, '#2a2320');
    cell(15, 2, 7, 7, '#5a4433');
    cell(15.5, 2.5, 6, 6, '#e9a45c');
    cell(18.25, 2.5, 0.5, 6, '#5a4433');
    cell(15.5, 5.25, 6, 0.5, '#5a4433');
    cell(1, 6, 6, 0.5, '#4a3a30');
    cell(1.5, 4.5, 1, 1.5, '#7f9b55');
    cell(3, 5, 1.5, 1, '#c96a3a');
    // Shoulders and a shirt.
    cell(5, 15, 14, 3, '#3d5a80');
    cell(6, 14, 12, 1, '#3d5a80');
    cell(10.5, 13, 3, 2, '#c98a62'); // neck
    // Head and hair.
    cell(8, 5, 8, 8.5, '#d9a07a');
    cell(7.5, 6, 9, 6.5, '#d9a07a');
    cell(7.5, 3.5, 9, 2.5, '#2b1d16');
    cell(7, 4.5, 1.5, 4, '#2b1d16');
    cell(15.5, 4.5, 1.5, 4, '#2b1d16');
    cell(7, 8, 1, 2, '#c98a62'); // ears
    cell(16, 8, 1, 2, '#c98a62');
    // Eyes, with a blink on its own slow timer.
    const blink = (t / 1000) % 4.1 < 0.12;
    if (blink) {
        cell(9.5, 8.25, 1.5, 0.5, '#2b1d16');
        cell(13, 8.25, 1.5, 0.5, '#2b1d16');
    }
    else {
        cell(9.5, 7.5, 1.5, 1.5, '#ffffff');
        cell(13, 7.5, 1.5, 1.5, '#ffffff');
        cell(10, 8, 1, 1, '#2b1d16');
        cell(13.5, 8, 1, 1, '#2b1d16');
    }
    cell(9.5, 6.5, 1.5, 0.5, '#2b1d16');
    cell(13, 6.5, 1.5, 0.5, '#2b1d16'); // brows
    cell(11.75, 9, 0.5, 1.5, '#c98a62'); // nose
    // Mouth: a smile at rest, open while talking.
    const open = Math.round(talk * 3) / 2;
    if (open > 0) {
        cell(10.5, 11, 3, 0.5 + open, '#7a2e2a');
        cell(11, 11, 2, 0.5, '#ffffff');
    }
    else {
        cell(10, 11, 1, 0.5, '#7a2e2a');
        cell(10.5, 11.5, 3, 0.5, '#7a2e2a');
        cell(13, 11, 1, 0.5, '#7a2e2a');
    }
    // The call bar: a live dot and the call's running time.
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, Math.round(oy), w, Math.round(C * 1.6));
    cell(0.6, 0.45, 0.7, 0.7, '#ff4d4d');
    const secs = Math.floor(t / 1000) % 60;
    ctx.fillStyle = '#ffffff';
    ctx.font = `${Math.round(C * 0.95)}px ui-monospace, Menlo, monospace`;
    ctx.textBaseline = 'middle';
    ctx.fillText(`00:${String(12 + secs).padStart(2, '0')}`, Math.round(C * 1.7), Math.round(oy + C * 0.82));
    ctx.textAlign = 'right';
    ctx.fillText('Dad', Math.round(w - C * 0.6), Math.round(oy + C * 0.82));
    ctx.textAlign = 'left';
}
/**
 * Music notes drifting up across the face, on the beat — drawn over whatever
 * face is already there.
 *
 * @param beat  Beats elapsed; notes rise one row per beat and loop.
 */
export function drawNotes(ctx, beat) {
    const { cell } = grid(ctx);
    const note = (x, y, fill) => {
        cell(x, y, 1.5, 1, fill); // head
        cell(x + 1, y - 3, 0.5, 3, fill); // stem
        cell(x + 1.5, y - 3, 1, 0.5, fill); // flag
    };
    const notes = [[1.5, 0, '#ffd98a'], [20, 0.4, '#ff8a6a'], [3, 0.7, '#9fe8ff']];
    for (const [x, phase, fill] of notes) {
        const p = ((beat / 4 + phase) % 1 + 1) % 1;
        const y = 16 - p * 13;
        if (p > 0.08 && p < 0.92)
            note(x + Math.sin((beat + phase * 7) * 1.6) * 0.5, y, fill);
    }
}
