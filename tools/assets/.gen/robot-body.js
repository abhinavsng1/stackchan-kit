import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
/**
 * The robot: one definition of what it is made of, how it is finished and how
 * it is lit, used by the live robot on the page (lib/live-robot.ts) and by
 * every render (tools/assets/stage-site.html). A render and the live model
 * that disagree read as two different products, so neither has its own copy.
 *
 * The printed parts come from public/models/stackchan-body.glb, which is the
 * assembled v3 preview split by servo (tools/assets/build-body.mjs). Everything
 * bought is modelled here, in the places the CAD leaves for it:
 *
 *   - the CoreS3 Lite on the head's front frame, its housing finished like the
 *     shell, with a curved cover glass over a true-black panel
 *   - the pan SCS0009 standing in the neck, shaft down into the base's horn
 *   - the tilt SCS0009 across the top of the neck, driving the horn plate
 *   - the bus-servo adapter in the base, its 5.5 x 2.1 mm DC socket in the
 *     base's back window, marked 5V 3A
 *
 * Finish: the shell is a satin plastic under a clear coat; the neck is satin;
 * the glass is black and glossy and picks up the studio's softboxes along its
 * curved edges. The studio is a dark room with feathered softboxes, a key
 * light that casts a real shadow, and a rim from behind.
 *
 * Only this file and lib/companion-face.ts need importing; the latter is kept
 * separate so the render pipeline can compile each on its own.
 */
/** Height of the tilt hinge, mm. Head_Tilt sits here in the model. */
export const TILT_Y = 51.7;
/** The head's front frame, where the Lite's back cover sits. */
const LITE_BACK = 17.69;
const LITE_D = 16;
/** Centre of the base's back window (X 6-17.5, Y 2.5-15.3), where the DC socket shows. */
const JACK = new THREE.Vector3(11.75, 8.8, -23.98);
/** The face is drawn into this, then laid into the glass. 24 x 18 cells of 16 px. */
export const FACE = { w: 384, h: 288 };
/** The glass texture: 468 px over the 49.4 mm glass, with the active area at (42, 81). */
const GLASS = { px: 468, mm: 49.4, ax: 42, ay: 81 };
/**
 * Load the printed parts once. Normals are rebuilt with a crease angle: the
 * fillets come out smooth, which is what the clear coat needs to read as a
 * clear coat, and the CAD's real edges stay sharp.
 */
const loaded = new Map();
/** Several live robots on one page share one download and one set of geometry. */
export function loadBody(url = '/models/stackchan-body.glb', dracoPath = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/') {
    let p = loaded.get(url);
    if (!p) {
        p = fetchBody(url, dracoPath);
        p.catch(() => loaded.delete(url));
        loaded.set(url, p);
    }
    return p;
}
async function fetchBody(url, dracoPath) {
    const draco = new DRACOLoader();
    draco.setDecoderPath(dracoPath);
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);
    try {
        const gltf = await loader.loadAsync(url);
        const parts = {};
        gltf.scene.traverse((o) => {
            const mesh = o;
            if (!mesh.isMesh)
                return;
            const geo = toCreasedNormals(mesh.geometry, THREE.MathUtils.degToRad(34));
            geo.computeBoundingSphere();
            parts[mesh.name] = geo;
        });
        for (const name of ['head', 'neck', 'neck_cover', 'horn_plate', 'pivot_plate', 'base', 'bottom_cover']) {
            if (!parts[name])
                throw new Error(`stackchan-body.glb is missing ${name}`);
        }
        return parts;
    }
    finally {
        draco.dispose();
    }
}
/* ------------------------------------------------------------------------ */
/* materials                                                                 */
/* ------------------------------------------------------------------------ */
let shared = null;
function makeShared() {
    return {
        servo: new THREE.MeshPhysicalMaterial({ color: '#1a1b1f', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.18 }),
        white: new THREE.MeshStandardMaterial({ color: '#eeebe4', roughness: 0.5 }),
        metal: new THREE.MeshStandardMaterial({ color: '#d9d9de', roughness: 0.2, metalness: 1 }),
        pcb: new THREE.MeshStandardMaterial({ color: '#0f3a29', roughness: 0.5 }),
        jack: new THREE.MeshPhysicalMaterial({ color: '#0b0b0c', roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }),
        hole: new THREE.MeshBasicMaterial({ color: '#000000' }),
        port: new THREE.MeshStandardMaterial({ color: '#060607', roughness: 0.65 }),
        grove: new THREE.MeshStandardMaterial({ color: '#d8d4cc', roughness: 0.55 }),
        blue: new THREE.MeshStandardMaterial({ color: '#2a63c9', roughness: 0.45 }),
        wires: ['#16161a', '#c8322d', '#e9e6df'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })),
    };
}
/** The shell: satin plastic under a clear coat. */
const shellMaterial = (hex) => new THREE.MeshPhysicalMaterial({
    color: hex, roughness: 0.4, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.14,
});
/** The neck and the hinge plates: satin, no coat. */
const satinMaterial = (hex) => new THREE.MeshPhysicalMaterial({
    color: hex, roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.3,
});
/* ------------------------------------------------------------------------ */
/* geometry helpers                                                          */
/* ------------------------------------------------------------------------ */
function rrShape(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y);
    s.lineTo(x + w - r, y);
    s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
    s.lineTo(x + w, y + h - r);
    s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
    s.lineTo(x + r, y + h);
    s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
    s.lineTo(x, y + r);
    s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
    return s;
}
function rrPath(w, h, r) {
    const p = new THREE.Path();
    p.curves = rrShape(w, h, r).curves;
    return p;
}
/**
 * The curved cover glass: concentric rounded-rectangle rings that roll off
 * at the edge and dome slightly in the middle. The roll-off is what catches
 * the softboxes as bright lines along the edge.
 */
function glassGeometry(w, h, r, { K = 14, N = 30, roll = 2.6, height = 0.95, dome = 0.45 } = {}) {
    const dmax = Math.min(w, h) / 2 - 0.6;
    const pos = [], nrm = [], uv = [], idx = [];
    let M = 0;
    for (let i = 0; i <= N; i++) {
        const d = dmax * Math.pow(i / N, 1.9);
        const a = w / 2 - d, b = h / 2 - d, rr = Math.max(r - d, 0.0001);
        // The edge rolls off over `roll` mm: a quarter circle in profile.
        const tr = Math.min(d / roll, 1);
        const edge = height * Math.sqrt(Math.max(0, 1 - (1 - tr) * (1 - tr)));
        const slope = tr < 1 ? Math.min(8, height * (1 - tr) / (roll * Math.max(1e-3, Math.sqrt(1 - (1 - tr) * (1 - tr))))) : 0;
        const corners = [[a - rr, b - rr, 0], [-(a - rr), b - rr, Math.PI / 2], [-(a - rr), -(b - rr), Math.PI], [a - rr, -(b - rr), Math.PI * 1.5]];
        M = 0;
        for (const [cx, cy, a0] of corners) {
            for (let k = 0; k <= K; k++, M++) {
                const t = a0 + k / K * Math.PI / 2;
                const ox = Math.cos(t), oy = Math.sin(t);
                const x = cx + rr * ox, y = cy + rr * oy;
                // The dome is a smooth function of position, and the normals are its
                // exact gradient rather than an average of the triangles: the rings
                // collapse to points at the corners, and averaged normals broke
                // along the diagonals into a pyramid of reflections across the screen.
                const u = x / (w / 2), v = y / (h / 2);
                const fu = Math.max(0, 1 - u * u), fv = Math.max(0, 1 - v * v);
                const z = edge + dome * fu * fv;
                const gx = -slope * ox + dome * (-2 * u / (w / 2)) * fv;
                const gy = -slope * oy + dome * (-2 * v / (h / 2)) * fu;
                const n = new THREE.Vector3(-gx, -gy, 1).normalize();
                pos.push(x, y, z);
                nrm.push(n.x, n.y, n.z);
                uv.push(x / w + 0.5, y / h + 0.5);
            }
        }
    }
    const c = pos.length / 3;
    pos.push(0, 0, height + dome);
    nrm.push(0, 0, 1);
    uv.push(0.5, 0.5);
    for (let i = 0; i < N; i++)
        for (let j = 0; j < M; j++) {
            const j2 = (j + 1) % M, a = i * M + j, b = i * M + j2, cc = (i + 1) * M + j, d = (i + 1) * M + j2;
            idx.push(a, b, d, a, d, cc);
        }
    for (let j = 0; j < M; j++)
        idx.push(N * M + j, N * M + (j + 1) % M, c);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
}
function canvasTexture(w, h, paint) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const g = c.getContext('2d');
    paint(g);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}
/* ------------------------------------------------------------------------ */
/* the bought parts                                                          */
/* ------------------------------------------------------------------------ */
const stickers = new Map();
function sticker(id) {
    let t = stickers.get(id);
    if (!t) {
        t = canvasTexture(384, 224, (g) => {
            g.fillStyle = '#1b1c1f';
            g.fillRect(0, 0, 384, 224);
            g.strokeStyle = 'rgba(255,255,255,.18)';
            g.lineWidth = 3;
            g.strokeRect(10, 10, 364, 204);
            g.fillStyle = '#f2efe9';
            g.font = '700 58px Inter, system-ui, sans-serif';
            g.fillText('SCS0009', 30, 96);
            g.font = '500 26px ui-monospace, Menlo, monospace';
            g.fillStyle = '#b8b3ab';
            g.fillText('SERIAL BUS SERVO', 32, 140);
            g.fillStyle = '#ff6a1a';
            g.fillText(id, 32, 186);
        });
        stickers.set(id, t);
    }
    return t;
}
/** An SCS0009. Local frame: shaft along +Y from the origin, body running toward +X. */
function buildServo(id) {
    const m = shared;
    const g = new THREE.Group(), L = 23.2, Wd = 12.1, cx = L / 2 - 5.9;
    const add = (geo, mat, x, y, z) => {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = mesh.receiveShadow = true;
        g.add(mesh);
        return mesh;
    };
    add(new RoundedBoxGeometry(L, 16.5, Wd, 3, 0.7), m.servo, cx, -7 - 8.25, 0);
    add(new RoundedBoxGeometry(32.3, 2.5, Wd, 2, 0.5), m.servo, cx, -5.75, 0);
    add(new RoundedBoxGeometry(L, 4.5, Wd, 3, 0.7), m.servo, cx, -2.25, 0);
    add(new THREE.CylinderGeometry(5.6, 5.8, 1.4, 40), m.servo, 0, 0.7, 0);
    add(new THREE.CylinderGeometry(2.6, 2.7, 1, 24), m.servo, 7.4, 0.5, 0);
    add(new THREE.CylinderGeometry(2.4, 2.4, 3, 20), m.white, 0, 2.9, 0);
    for (const ex of [cx - 14.2, cx + 14.2])
        add(new THREE.CylinderGeometry(1, 1, 2.6, 14), m.hole, ex, -5.75, 0);
    const sm = new THREE.MeshStandardMaterial({ map: sticker(id), roughness: 0.5 });
    add(new THREE.PlaneGeometry(19, 11), sm, cx, -15.5, Wd / 2 + 0.03);
    add(new THREE.PlaneGeometry(19, 11), sm, cx, -15.5, -Wd / 2 - 0.03).rotation.y = Math.PI;
    [-1.05, 0, 1.05].forEach((z, i) => {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-5.6, -21, z), new THREE.Vector3(-9, -21.5, z), new THREE.Vector3(-12, -19, z), new THREE.Vector3(-13.5, -14, z)]);
        add(new THREE.TubeGeometry(curve, 16, 0.5, 8), m.wires[i], 0, 0, 0);
    });
    return g;
}
/** A 20T cross horn, arms set as an x. Local frame: hub along +Y. */
function buildHorn() {
    const m = shared;
    const g = new THREE.Group(), arms = new THREE.Group();
    arms.rotation.y = Math.PI / 4;
    g.add(arms);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 3.4, 24), m.white);
    hub.position.y = 1.7;
    g.add(hub);
    for (const r of [0, Math.PI / 2]) {
        const a = new THREE.Mesh(new RoundedBoxGeometry(20, 1.6, 4.2, 2, 0.7), m.white);
        a.position.y = 0.8;
        a.rotation.y = r;
        arms.add(a);
    }
    return g;
}
/* ------------------------------------------------------------------------ */
/* the robot                                                                 */
/* ------------------------------------------------------------------------ */
export function buildRobot(parts, way) {
    shared ?? (shared = makeShared());
    const m = shared;
    const mats = { head: shellMaterial(way.head), neck: satinMaterial(way.neck), base: shellMaterial(way.base) };
    const root = new THREE.Group();
    root.name = 'Robot';
    const baseG = new THREE.Group();
    baseG.name = 'Base';
    root.add(baseG);
    const pan = new THREE.Group();
    pan.name = 'Neck_Pan';
    root.add(pan);
    const tilt = new THREE.Group();
    tilt.name = 'Head_Tilt';
    tilt.position.y = TILT_Y;
    pan.add(tilt);
    const printed = (name, parent, mat) => {
        const mesh = new THREE.Mesh(parts[name], mat);
        mesh.name = name;
        mesh.castShadow = mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    };
    // The base is lit exactly as the head is: it casts onto the floor but does
    // not take the head's shadow, which otherwise left the feet a shade darker
    // than the rest of the shell and read as a different material.
    printed('base', baseG, mats.base).receiveShadow = false;
    printed('bottom_cover', baseG, mats.base).receiveShadow = false;
    printed('neck', pan, mats.neck);
    printed('neck_cover', pan, mats.neck);
    printed('head', tilt, mats.head);
    printed('horn_plate', tilt, mats.neck);
    printed('pivot_plate', tilt, mats.neck);
    /* ---- the face: drawn by the caller into ctx, laid into the glass ---- */
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = FACE.w;
    faceCanvas.height = FACE.h;
    const ctx = faceCanvas.getContext('2d');
    const glassCanvas = document.createElement('canvas');
    glassCanvas.width = glassCanvas.height = GLASS.px;
    const gctx = glassCanvas.getContext('2d');
    gctx.imageSmoothingEnabled = false;
    const faceTex = new THREE.CanvasTexture(glassCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;
    faceTex.magFilter = THREE.NearestFilter;
    faceTex.anisotropy = 8;
    const update = () => {
        gctx.fillStyle = '#000';
        gctx.fillRect(0, 0, GLASS.px, GLASS.px);
        gctx.drawImage(faceCanvas, GLASS.ax, GLASS.ay);
        faceTex.needsUpdate = true;
    };
    const glassMat = new THREE.MeshPhysicalMaterial({
        color: '#000000', roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
        ior: 1.52, emissive: '#ffffff', emissiveMap: faceTex, emissiveIntensity: 2.1,
    });
    /* ---- CoreS3 Lite ---- */
    const lite = new THREE.Group();
    lite.name = 'CoreS3';
    {
        const W = 54, R = 5, b = 1.4;
        let hg = new THREE.ExtrudeGeometry(rrShape(W - 2 * b, W - 2 * b, R - b), { depth: LITE_D - 2 * b, bevelEnabled: true, bevelThickness: b, bevelSize: b, bevelSegments: 7, curveSegments: 16 });
        hg.translate(0, 0, b);
        hg = toCreasedNormals(hg, THREE.MathUtils.degToRad(50));
        const housing = new THREE.Mesh(hg, mats.head);
        housing.castShadow = housing.receiveShadow = true;
        lite.add(housing);
        const GW = GLASS.mm, GR = 3.4;
        const gs = rrShape(GW + 0.8, GW + 0.8, GR + 0.4);
        gs.holes.push(rrPath(GW - 0.2, GW - 0.2, GR - 0.1));
        const gasket = new THREE.Mesh(new THREE.ShapeGeometry(gs, 16), m.port);
        gasket.position.z = LITE_D + 0.012;
        lite.add(gasket);
        const glass = new THREE.Mesh(glassGeometry(GW, GW, GR), glassMat);
        glass.name = 'Screen';
        glass.position.z = LITE_D + 0.02;
        glass.castShadow = true;
        lite.add(glass);
        // USB side (-X): USB-C, Grove Port A, power button.
        const side = -W / 2;
        const put = (geo, mat, x, y, z) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); lite.add(o); return o; };
        put(new RoundedBoxGeometry(0.5, 9, 3.3, 2, 1.2), m.port, side + 0.18, -10, 8);
        put(new THREE.BoxGeometry(0.12, 6.4, 0.7), m.metal, side - 0.1, -10, 8);
        put(new RoundedBoxGeometry(0.6, 8.2, 5, 2, 0.4), m.grove, side + 0.15, 9, 8);
        put(new THREE.BoxGeometry(0.2, 6.6, 3), m.port, side - 0.2, 9, 8);
        put(new RoundedBoxGeometry(0.9, 4, 2, 2, 0.45), mats.neck, side + 0.1, 21, 8);
        // Speaker grille (+X).
        const holes = new THREE.InstancedMesh(new THREE.CircleGeometry(0.42, 14), m.port, 30);
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0)), one = new THREE.Vector3(1, 1, 1);
        let n = 0;
        for (let r = 0; r < 10; r++)
            for (let c = 0; c < 3; c++)
                holes.setMatrixAt(n++, m4.compose(new THREE.Vector3(W / 2 + 0.03, -7 + r * 1.65, 6.35 + c * 1.65), q, one));
        lite.add(holes);
        lite.position.z = LITE_BACK + 0.05;
        tilt.add(lite);
    }
    /* ---- servos and horns ---- */
    // Pan: shaft down (-Y) on the pan axis, body running back (-Z), top face 21.8 mm up.
    const panServo = buildServo('ID 1 · PAN');
    panServo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, -1, 0), new THREE.Vector3(-1, 0, 0)).setPosition(0, 21.8, 0));
    pan.add(panServo);
    // Tilt: shaft toward the speaker side (+X) on the hinge, body running back.
    const tiltServo = buildServo('ID 2 · TILT');
    tiltServo.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, -1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)).setPosition(12.6, TILT_Y, 0));
    pan.add(tiltServo);
    const panHorn = buildHorn();
    panHorn.position.y = 16.8;
    baseG.add(panHorn);
    const tiltHorn = buildHorn();
    tiltHorn.rotation.z = -Math.PI / 2;
    tiltHorn.position.set(16, 0, 0);
    tilt.add(tiltHorn);
    /* ---- bus adapter and the DC socket ---- */
    {
        const add = (geo, mat, x, y, z) => {
            const o = new THREE.Mesh(geo, mat);
            o.position.set(x, y, z);
            o.castShadow = o.receiveShadow = true;
            baseG.add(o);
            return o;
        };
        add(new RoundedBoxGeometry(32, 1.6, 30, 2, 0.4), m.pcb, 2, 2.5, -7);
        add(new RoundedBoxGeometry(7.6, 8.4, 6.4, 2, 0.4), m.blue, -5.5, 7.5, -18.4);
        for (const x of [-5, 6])
            add(new RoundedBoxGeometry(7.6, 5.8, 3.2, 2, 0.3), m.white, x, 6.2, 5.5);
        add(new RoundedBoxGeometry(6, 1.2, 6, 2, 0.3), m.port, -1, 3.9, -4);
        // 5.5 x 2.1 mm DC jack, its opening facing out through the window.
        add(new RoundedBoxGeometry(9, 11, 11.2, 2, 0.6), m.jack, JACK.x, JACK.y, -14.8);
        const ns = rrShape(9, 11, 0.9);
        ns.holes.push(new THREE.Path().absarc(0, 0, 3.15, 0, Math.PI * 2, true));
        add(new THREE.ExtrudeGeometry(ns, { depth: 3.5, bevelEnabled: false, curveSegments: 24 }), m.jack, JACK.x, JACK.y, -23.9);
        add(new THREE.CylinderGeometry(1, 1, 2.6, 24), m.metal, JACK.x, JACK.y, -21.7).rotation.x = Math.PI / 2;
        // The rating, printed beside the window.
        const tex = canvasTexture(512, 256, (g) => {
            g.fillStyle = 'rgba(0,0,0,.72)';
            g.textAlign = 'center';
            g.font = '700 92px ui-monospace, Menlo, monospace';
            g.fillText('5V⎓3A', 256, 112);
            g.font = '600 64px ui-monospace, Menlo, monospace';
            g.fillText('DC IN', 256, 206);
        });
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 4.6), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.6, depthWrite: false }));
        lbl.position.set(0.8, 9.4, -24.01);
        lbl.rotation.y = Math.PI;
        baseG.add(lbl);
    }
    const rest = { lite: lite.position.clone(), tiltServo: tiltServo.position.clone(), panServo: panServo.position.clone() };
    update();
    return {
        root, ctx, update,
        setShell: (w) => { mats.head.color.set(w.head); mats.neck.color.set(w.neck); mats.base.color.set(w.base); },
        pose: ({ pan: p = 0, tilt: t = 0, explode: e = 0 }) => {
            pan.rotation.y = THREE.MathUtils.degToRad(p);
            tilt.rotation.x = -THREE.MathUtils.degToRad(t);
            // Exploded, along the axes the parts actually go together on: the
            // neck lifts off the base, the head lifts clear of the neck (it is
            // slid on over it), the tilt servo rises out of the top of the neck
            // where it lies, and the Lite comes forward off the head's front
            // frame. Nothing moves sideways through a wall; the pan servo stays
            // seated in the neck, shaft down, as it is assembled.
            pan.position.y = 14 * e;
            tilt.position.y = TILT_Y + 44 * e;
            lite.position.copy(rest.lite).add(new THREE.Vector3(0, 0, 30 * e));
            tiltServo.position.copy(rest.tiltServo).add(new THREE.Vector3(0, 12 * e, 0));
            panServo.position.copy(rest.panServo);
        },
        dispose: () => {
            faceTex.dispose();
            glassMat.dispose();
            for (const mat of Object.values(mats))
                mat.dispose();
        },
    };
}
/** How a renderer is set up for this robot: neutral tone mapping, soft shadows. */
export function configureRenderer(renderer) {
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
}
/**
 * Light a scene the way the robot is shot.
 *
 * `ground` decides what it stands on:
 *   clear  nothing drawn but the shadow, for a page that has its own background
 *   dark   the studio's own near-black backdrop, with a soft reflection
 */
export function makeStudio(renderer, scene, { ground = 'clear', shadow = 0.38, reflectionSize = [1024, 1024], } = {}) {
    const disposables = [];
    // The room: dark above, with feathered softboxes, so the clear coat and
    // the glass show soft gradients instead of hard-edged reflections.
    //
    // Below the horizon is the surface it stands on. On a light page that is a
    // white table, and it matters: the base is all flat vertical walls, and a
    // flat glossy wall seen from above reflects what is below the horizon. A
    // black floor left the feet looking matte while the rounded head caught
    // the softboxes; a white one gives the whole shell the same gloss, top to
    // bottom. The dark stage keeps its dark floor.
    //
    // The display's glass always sees the dark room, white table or not: a
    // black panel that mirrored the table showed a grey pyramid across its
    // curved edges instead of the deep black and the softbox glints it should.
    const buildRoom = (darkFloor) => {
        const room = new THREE.Scene();
        const sphere = new THREE.SphereGeometry(100, 64, 32);
        const col = [], p = sphere.attributes.position;
        const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
        for (let i = 0; i < p.count; i++) {
            const y = p.getY(i) / 100;
            const ceiling = 0.03 + 0.05 * Math.max(0, y);
            const floor = darkFloor ? 0.018 + 0.01 * (1 + Math.min(0, y)) : 0.46 - 0.16 * Math.abs(Math.min(0, y));
            const v = floor + (ceiling - floor) * smooth(-0.1, 0.22, y);
            col.push(v, v, v * 1.03);
        }
        sphere.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        room.add(new THREE.Mesh(sphere, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
        const soft = (fx, fy) => {
            const c = document.createElement('canvas');
            c.width = c.height = 256;
            const g = c.getContext('2d');
            const lin = (horiz, f) => {
                const gr = horiz ? g.createLinearGradient(0, 0, 256, 0) : g.createLinearGradient(0, 0, 0, 256);
                gr.addColorStop(0, 'rgba(255,255,255,0)');
                gr.addColorStop(f, '#fff');
                gr.addColorStop(1 - f, '#fff');
                gr.addColorStop(1, 'rgba(255,255,255,0)');
                return gr;
            };
            g.fillStyle = lin(true, fx);
            g.fillRect(0, 0, 256, 256);
            g.globalCompositeOperation = 'destination-in';
            g.fillStyle = lin(false, fy);
            g.fillRect(0, 0, 256, 256);
            return new THREE.CanvasTexture(c);
        };
        const box = (w, h, pos, k, tint = [1, 1, 1], fx = 0.3, fy = 0.2) => {
            const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({
                color: new THREE.Color(tint[0] * k, tint[1] * k, tint[2] * k), map: soft(fx, fy), side: THREE.DoubleSide,
                transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
            }));
            mesh.position.set(...pos);
            mesh.lookAt(0, 0, 0);
            room.add(mesh);
        };
        box(90, 70, [0, 90, 10], 1.6, [1, 1, 1], 0.35, 0.35); // overhead
        box(18, 90, [-70, 12, 38], 4.6, [1, 0.95, 0.88], 0.42); // key strip, front-left
        box(14, 90, [76, 8, -12], 2.6, [0.88, 0.94, 1], 0.42); // cool strip, right
        box(50, 18, [24, 30, 82], 1.8, [1, 1, 1], 0.35, 0.4); // front panel: the glint on the glass
        box(4, 64, [-30, 30, 80], 2.6, [1, 1, 1], 0.25, 0.3); // thin vertical glint line
        box(70, 12, [0, 36, -86], 3.0, [1, 1, 1], 0.3, 0.35); // back rim
        return room;
    };
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(buildRoom(ground === 'dark'), 0.02);
    const glassEnv = ground === 'dark' ? env : pmrem.fromScene(buildRoom(true), 0.02);
    pmrem.dispose();
    if (glassEnv !== env)
        disposables.push(glassEnv);
    const glasses = [];
    scene.environment = env.texture;
    scene.environmentIntensity = 1;
    disposables.push(env);
    // A warm key from front-left that casts the shadow, and a cool rim.
    const key = new THREE.DirectionalLight('#fff3e6', 1.5);
    key.position.set(-90, 200, 150);
    key.target.position.set(0, 30, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.3;
    const rim = new THREE.DirectionalLight('#dce6ff', 1.0);
    rim.position.set(90, 130, -170);
    scene.add(key, key.target, rim);
    // The shadow fades out with distance from each robot, so it never runs into
    // the edge of a canvas as a hard line.
    const shadowMat = new THREE.ShadowMaterial({ opacity: shadow });
    const fade = { uCentre: { value: new THREE.Vector2() }, uRadius: { value: new THREE.Vector2(16, 64) }, uSpan: { value: 0 } };
    shadowMat.onBeforeCompile = (s) => {
        Object.assign(s.uniforms, fade);
        s.vertexShader = s.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvFadeWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        s.fragmentShader = s.fragmentShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vFadeWorld;\nuniform vec2 uCentre; uniform vec2 uRadius; uniform float uSpan;')
            .replace('gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );', `vec2 dd = vFadeWorld.xz - uCentre; dd.x = max(abs(dd.x) - uSpan, 0.0);
        float fadeOut = 1.0 - smoothstep(uRadius.x, uRadius.y, length(dd));
        gl_FragColor = vec4( color, opacity * fadeOut * ( 1.0 - getShadowMask() ) );`);
    };
    const catcher = new THREE.Mesh(new THREE.PlaneGeometry(1200, 1200), shadowMat);
    catcher.rotation.x = -Math.PI / 2;
    catcher.position.y = 0.03;
    catcher.receiveShadow = true;
    scene.add(catcher);
    // Contact: the dark band right where the base meets the floor.
    const blobTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const g = c.getContext('2d');
        const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
        r.addColorStop(0, 'rgba(0,0,0,.75)');
        r.addColorStop(0.45, 'rgba(0,0,0,.35)');
        r.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = r;
        g.fillRect(0, 0, 256, 256);
        return new THREE.CanvasTexture(c);
    })();
    const blobMat = new THREE.MeshBasicMaterial({ map: blobTex, transparent: true, depthWrite: false, opacity: ground === 'dark' ? 1 : 0.7 });
    const blobs = [];
    const blobFor = (x, z) => {
        const b = new THREE.Mesh(new THREE.PlaneGeometry(92, 104), blobMat);
        b.rotation.x = -Math.PI / 2;
        b.position.set(x, 0.05, z - 2);
        scene.add(b);
        blobs.push(b);
    };
    blobFor(0, 0);
    let reflector = null;
    if (ground === 'dark') {
        const c = document.createElement('canvas');
        c.width = c.height = 1024;
        const g = c.getContext('2d');
        const r = g.createRadialGradient(560, 420, 10, 540, 520, 760);
        r.addColorStop(0, '#26262a');
        r.addColorStop(0.42, '#121214');
        r.addColorStop(1, '#050506');
        g.fillStyle = r;
        g.fillRect(0, 0, 1024, 1024);
        const id = g.getImageData(0, 0, 1024, 1024), d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            const n = (Math.random() - 0.5) * 3;
            d[i] += n;
            d[i + 1] += n;
            d[i + 2] += n;
        }
        g.putImageData(id, 0, 0);
        const bg = new THREE.CanvasTexture(c);
        bg.colorSpace = THREE.SRGBColorSpace;
        scene.background = bg;
        disposables.push(bg);
        reflector = new Reflector(new THREE.CircleGeometry(600, 64), {
            clipBias: 0.003, textureWidth: reflectionSize[0], textureHeight: reflectionSize[1],
            shader: {
                name: 'FloorReflection',
                uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStrength: { value: 0.2 }, uRadius: { value: 92 } },
                vertexShader: `uniform mat4 textureMatrix; varying vec4 vUvP; varying vec2 vXY;
          void main(){ vUvP = textureMatrix*vec4(position,1.0); vXY = position.xy; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
                fragmentShader: `uniform vec3 color; uniform sampler2D tDiffuse; uniform float uStrength; uniform float uRadius; varying vec4 vUvP; varying vec2 vXY;
          void main(){
            vec2 uv = vUvP.xy/vUvP.w; vec3 c = vec3(0.); float b = 0.006;
            c += texture2D(tDiffuse, uv).rgb*0.2;
            c += texture2D(tDiffuse, uv+vec2(b,0.)).rgb*0.1;  c += texture2D(tDiffuse, uv-vec2(b,0.)).rgb*0.1;
            c += texture2D(tDiffuse, uv+vec2(0.,b)).rgb*0.1;  c += texture2D(tDiffuse, uv-vec2(0.,b)).rgb*0.1;
            c += texture2D(tDiffuse, uv+vec2(b,b)*1.8).rgb*0.1; c += texture2D(tDiffuse, uv-vec2(b,b)*1.8).rgb*0.1;
            c += texture2D(tDiffuse, uv+vec2(b,-b)*1.8).rgb*0.1; c += texture2D(tDiffuse, uv-vec2(b,-b)*1.8).rgb*0.1;
            float d = length(vXY)/uRadius; float fade = 1.0-smoothstep(0.0,1.0,d); fade *= fade;
            gl_FragColor = vec4(c*uStrength*fade, 1.0);
          }`,
            },
        });
        reflector.rotation.x = -Math.PI / 2;
        reflector.position.y = -0.02;
        Object.assign(reflector.material, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        scene.add(reflector);
    }
    return {
        fitShadow: (b, at = [{ x: 0, z: 0 }]) => {
            const size = b.getSize(new THREE.Vector3()), c = b.getCenter(new THREE.Vector3());
            const half = Math.max(85, Math.max(size.x, size.z) / 2 + 60);
            Object.assign(key.shadow.camera, { left: -half, right: half, top: half, bottom: -half, near: 40, far: 900 });
            key.target.position.set(c.x, 30, c.z);
            key.position.set(c.x - 90, 200, c.z + 150);
            key.shadow.camera.updateProjectionMatrix();
            // The cast shadow fades around the row of robots.
            fade.uCentre.value.set(c.x, c.z - 20);
            fade.uSpan.value = Math.max(0, size.x / 2 - 30);
            // One contact patch under each robot's base.
            while (blobs.length < at.length)
                blobFor(0, 0);
            blobs.forEach((bl, i) => {
                bl.visible = i < at.length;
                if (i < at.length)
                    bl.position.set(at[i].x, 0.05, at[i].z - 2);
            });
            if (reflector)
                reflector.position.x = c.x;
        },
        adopt: (root) => {
            root.traverse((o) => {
                const m = o.material;
                if (o.name === 'Screen' && m && !glasses.includes(m)) {
                    m.envMap = glassEnv.texture;
                    m.needsUpdate = true;
                    glasses.push(m);
                }
            });
        },
        turn: (r) => {
            scene.environmentRotation.y = r;
            for (const m of glasses)
                m.envMapRotation.y = r;
        },
        dispose: () => {
            for (const d of disposables)
                d.dispose();
            scene.remove(key, key.target, rim, catcher, ...blobs);
            if (reflector) {
                scene.remove(reflector);
                reflector.dispose();
            }
        },
    };
}
