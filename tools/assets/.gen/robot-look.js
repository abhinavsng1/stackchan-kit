/**
 * What the robot looks like — one definition, used by the live robot on the
 * page (lib/live-robot.ts) and by every render (tools/assets/stage-site.html).
 * A render and the live model that disagree about the screen or the frame
 * read as two different products, so neither is allowed its own opinion.
 *
 * THREE is passed in rather than imported, so the render pipeline can compile
 * this file on its own and run it in a page with three from node_modules.
 *
 * Three materials, matching the real unit:
 *   - the display: glass. Rounded corners, glossy, reflecting the room, with
 *     the face lit from behind so it glows rather than being lit by the scene.
 *   - the module's frame: satin light grey, as the controller actually is.
 *   - the printed parts: matte, each in its own colour from the colourway
 *     (head, neck, base — see lib/shells.ts).
 */
/** Which colourway part each printed mesh in pebble-v3.glb belongs to. */
const PART_OF = {
    head: 'head', horn_plate: 'head',
    neck: 'neck', neck_cover: 'neck', pivot_plate: 'neck',
    base: 'base', bottom_cover: 'base',
};
/** A rounded-rectangle alpha mask, so the glass has the panel's real corners. */
function cornerMask(THREE, w, h, r) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    g.fillStyle = '#000';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff';
    g.beginPath();
    g.moveTo(r, 0);
    g.arcTo(w, 0, w, h, r);
    g.arcTo(w, h, 0, h, r);
    g.arcTo(0, h, 0, 0, r);
    g.arcTo(0, 0, w, 0, r);
    g.closePath();
    g.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.NoColorSpace;
    return t;
}
/**
 * Dress a robot (the root of pebble-v3.glb, or a clone of it). Gives every
 * mesh its own material, so several robots can wear different shells at once.
 */
export function dressRobot(THREE, root, { panel = { w: 320, h: 240 } } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = panel.w;
    canvas.height = panel.h;
    const ctx = canvas.getContext('2d');
    const face = new THREE.CanvasTexture(canvas);
    face.colorSpace = THREE.SRGBColorSpace;
    // The panel's UVs come out of the rig turned half round, which shows as the
    // mouth above the eyes. Turning the texture fixes it at the source.
    face.center.set(0.5, 0.5);
    face.rotation = Math.PI;
    const glass = new THREE.MeshPhysicalMaterial({
        color: 0x000000,
        emissive: 0xffffff,
        emissiveMap: face,
        emissiveIntensity: 1.25,
        roughness: 0.06,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.03,
        reflectivity: 0.6,
        alphaMap: cornerMask(THREE, panel.w, panel.h, 22),
        transparent: true,
        // Double-sided on purpose: a single-sided plane facing inward is
        // invisible with no error anywhere.
        side: THREE.DoubleSide,
    });
    // The glass around the lit area: the same black, the same gloss, and the
    // same rounded corners, so the front reads as one panel of glass with the
    // picture inside it — not a square border round a smaller screen.
    const bezel = new THREE.MeshPhysicalMaterial({
        color: 0x070708, roughness: 0.06, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
        alphaMap: cornerMask(THREE, 256, 236, 30), transparent: true, side: THREE.DoubleSide,
    });
    const frame = new THREE.MeshPhysicalMaterial({
        color: 0xb4b5b2, roughness: 0.42, metalness: 0.35, clearcoat: 0.2,
    });
    const printed = [];
    root.traverse((o) => {
        const mesh = o;
        if (!mesh.isMesh)
            return;
        if (mesh.name === 'Screen') {
            mesh.material = glass;
            mesh.renderOrder = 2;
            return;
        }
        if (mesh.name === 'Screen_Bezel') {
            mesh.material = bezel;
            mesh.renderOrder = 1;
            return;
        }
        if (mesh.name === 'CoreS3') {
            mesh.material = frame;
            return;
        }
        const part = PART_OF[mesh.name];
        if (!part)
            return;
        const m = new THREE.MeshStandardMaterial({ roughness: 0.64, metalness: 0 });
        mesh.material = m;
        printed.push([m, part]);
    });
    return {
        ctx,
        update: () => { face.needsUpdate = true; },
        setShell: (way) => { for (const [m, part] of printed)
            m.color = new THREE.Color(way[part]); },
    };
}
