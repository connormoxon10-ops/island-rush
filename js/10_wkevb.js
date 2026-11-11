/* ================= WORKSHOP EVA CONTENT: the things there are to find on the other worlds =================
   The surface is endless and flat, so everything is generated from hashes of grid cells (stable for a given body and place, nothing stored):
   a boulder field around you, glowing samples to pick up, and landmarks (wrecks, outposts, monoliths, vents, arches, crystal gardens...)
   in a theme per world. Two landmarks are always placed near wherever you land so there is something to walk to. */
const _wkeH = (a, b, c) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, 2147483647)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
const _wkeG = {}, _wkeMt = {};
const _wkeGeo = (k) => _wkeG[k] || (_wkeG[k] = ({
  box: () => new THREE.BoxGeometry(1, 1, 1), cyl: () => new THREE.CylinderGeometry(1, 1, 1, 14), cyl6: () => new THREE.CylinderGeometry(1, 1, 1, 6), cone: () => new THREE.CylinderGeometry(0, 1, 1, 12), tcone: () => new THREE.CylinderGeometry(0.5, 1, 1, 12),
  sph: () => new THREE.SphereGeometry(1, 14, 10), hemi: () => new THREE.SphereGeometry(1, 18, 8, 0, TAU, 0, Math.PI / 2), oct: () => new THREE.OctahedronGeometry(1, 0), arch: () => new THREE.TorusGeometry(1, 0.2, 8, 22, Math.PI),
  disc: () => { const g = new THREE.CircleGeometry(1, 28); g.rotateX(-Math.PI / 2); return g; },
  rock: () => { const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position; for (let i = 0; i < p.count; i++) { const k = 0.78 + 0.34 * _wkeH(Math.round(p.getX(i) * 40), Math.round(p.getY(i) * 40), Math.round(p.getZ(i) * 40)); p.setXYZ(i, p.getX(i) * k, p.getY(i) * k, p.getZ(i) * k); } g.computeVertexNormals(); return g; },
}[k])());
/* a shared material: o = { c: hex, r: roughness, m: metalness, e: emissive hex, ei: emissive intensity, a: additive, o: opacity } */
const _wkeMat = (k, o) => _wkeMt[k] || (_wkeMt[k] = o.a ? new THREE.MeshBasicMaterial({ color: lc(o.c), transparent: true, opacity: o.o == null ? 0.3 : o.o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })
  : new THREE.MeshStandardMaterial({ color: lc(o.c), roughness: o.r == null ? 0.8 : o.r, metalness: o.m || 0, emissive: o.e != null ? lc(o.e) : 0x000000, emissiveIntensity: o.ei == null ? 1 : o.ei, flatShading: !!o.f, transparent: o.o != null, opacity: o.o == null ? 1 : o.o }));
const _wkeW = () => _wkeMat('white', { c: 0xe8eaee, r: 0.75, e: 0x16181c }), _wkeD = () => _wkeMat('dark', { c: 0x2a2d33, r: 0.6, m: 0.4 }), _wkeS = () => _wkeMat('steel', { c: 0x9aa3ad, r: 0.4, m: 0.7 }), _wkeO = () => _wkeMat('orange', { c: 0xf06a1a, r: 0.6 });
/* add a mesh: geometry, material, [x,y,z], [sx,sy,sz], [rx,ry,rz] */
const _wkeM = (grp, geo, mat, p, s, r) => { const m = new THREE.Mesh(_wkeGeo(geo), mat); m.position.set(p[0], p[1], p[2]); if (s) m.scale.set(s[0], s[1], s[2]); if (r) m.rotation.set(r[0], r[1], r[2]); m.castShadow = false; m.receiveShadow = false; grp.add(m); return m; };

/* what each world holds: [type, weight] */
const WKE_THEME = {
  luna: { crys: 0x66e0ff, t: [['beacon', 3], ['wreck', 2], ['outpost', 2], ['monolith', 0.6], ['crystals', 2], ['cache', 2], ['rover', 2], ['ring', 0.5], ['arch', 0.4]] },
  ember: { crys: 0xffa040, t: [['vent', 4], ['spires', 3], ['crystals', 1.5], ['wreck', 1.5], ['beacon', 2], ['cache', 1.5], ['outpost', 1]] },
  rust: { crys: 0xff6a8a, t: [['arch', 3], ['ring', 2], ['rover', 2], ['outpost', 2], ['beacon', 2], ['cache', 2], ['wreck', 1.5], ['crystals', 1], ['monolith', 0.5], ['geyser', 1]] },
  pebble: { crys: 0xb48cff, t: [['ring', 2.5], ['crystals', 3], ['beacon', 2], ['wreck', 1.5], ['monolith', 1], ['arch', 2], ['cache', 1.5], ['rover', 1]] },
  cinder: { crys: 0xd8ff5a, t: [['vent', 4], ['geyser', 3], ['spires', 2.5], ['crystals', 1.5], ['wreck', 1.5], ['outpost', 1.5], ['beacon', 2], ['cache', 1.5]] },
};
const WKE_LORE = {
  beacon: ['Survey beacon 7 is still transmitting. Your suit radio uploads its logs: forty years of quiet readings, and one line from last year, "Someone is walking."', 'A relay mast with a dead solar skin. Its memory holds a single repeating message: "COME HOME."'],
  wreck: ['The crew log ends mid-sentence: "Day 41. The signal from the east is stronger now, and I think-"', '"Engine cut early. Landed hard. The hatch is jammed and oxygen is at 6%. If you find this, tell mission control I tried." Cdr. Ilse Varga', 'Flight recorder: "Fuel gauge was wrong. Fuel gauge was always wrong."'],
  outpost: ['Power is still on. A kettle sits on the console, and the calendar on the wall is eleven years out of date.', 'Bunks for four. Three are made. The fourth has a drawing taped above it: a stick figure and a very large sun.'],
  monolith: ['Perfectly smooth. Perfectly square. It is warm to the touch, and your suit radio picks up a single note, repeating.', 'You can see yourself in it, and behind you, for a moment, something else. When you turn round there is only the plain.'],
  cache: ['A sealed supply cache stamped EXPEDITION 1. Air, water, a thermos of something that used to be coffee.'],
  arch: ['Wind and time carved this. Or something that wanted a doorway. Your boots leave the only prints for kilometres.'],
  spires: ['Glassy black spires, still ticking as they cool. They sing faintly when you tap them.'],
  vent: ['The ground breathes. Heat shimmers through your visor and the suit thermometer climbs. Do not linger.'],
  crystals: ['Every crystal rings faintly when your glove brushes it. Together they make something close to a chord.'],
  ring: ['Nothing here is natural: the stones are spaced to the centimetre. Whoever built it knew exactly where the sun would rise.', 'Twelve standing stones around a flat slab. The slab has a worn hollow in it, just the size of a gloved hand.'],
  rover: ['Rover "Pilgrim", last log: "Battery 3%. Sun is setting. Goodnight." Its tracks lead back the way you came.', 'A six-wheeled rover buried to its axles. The camera mast still points at the horizon, as if waiting.'],
  geyser: ['A vent of frozen gas erupts every few seconds, climbing far above you, and falls as glittering snow.'],
};
const WKE_NAME = { beacon: 'Survey beacon', wreck: 'Wreck of Expedition 1', outpost: 'Abandoned outpost', monolith: 'The monolith', cache: 'Supply cache', arch: 'Wind-cut arch', spires: 'Obsidian spires', vent: 'Lava fissure', crystals: 'Crystal garden', ring: 'Stone circle', rover: 'Dead rover', geyser: 'Geyser field' };
const WKE_MULT = { beacon: 0.8, wreck: 1.2, outpost: 1.4, monolith: 3, cache: 0.6, arch: 1, spires: 1, vent: 1.2, crystals: 0.9, ring: 1.6, rover: 1.1, geyser: 1 };
const WKE_RD = { beacon: 12, wreck: 16, outpost: 16, monolith: 14, cache: 9, arch: 16, spires: 16, vent: 14, crystals: 12, ring: 18, rover: 11, geyser: 18 };

/* ---------- landmark builders: each fills a group and returns { cols: [[dx,dz,r]...], tick(t) } ---------- */
const WKE_BUILD = {
  beacon(B, g, rn) { const m = _wkeW(); _wkeM(g, 'box', _wkeD(), [0, 0.3, 0], [1.8, 0.6, 1.8]); _wkeM(g, 'cyl', _wkeS(), [0, 7, 0], [0.14, 14, 0.14]); const dish = _wkeM(g, 'hemi', m, [0.6, 9.2, 0], [1.3, 1.3, 1.3], [0, 0, -1.9]); dish.scale.y = 0.5;
    const lamp = _wkeM(g, 'sph', _wkeMat('blinkR', { c: 0xff3030, e: 0xff2020, ei: 2.5 }), [0, 14.2, 0], [0.28, 0.28, 0.28]); _wkeM(g, 'box', _wkeO(), [1.1, 0.8, 0], [0.5, 1.0, 0.7]);
    return { cols: [[0, 0, 1.3]], tick(t) { lamp.visible = (t * 1.4) % 2 < 0.25; } }; },
  wreck(B, g, rn) { const a = rn() * TAU; _wkeM(g, 'disc', _wkeMat('scorch', { c: 0x16130f, r: 1 }), [0, 0.05, 0], [9, 1, 9]); const cap = new THREE.Group(); cap.position.set(0, 1.1, 0); cap.rotation.set(0.45, a, 0.3); g.add(cap);
    _wkeM(cap, 'tcone', _wkeW(), [0, 0, 0], [1.5, 2.4, 1.5]); _wkeM(cap, 'cyl', _wkeMat('shield', { c: 0x1d1814, r: 1 }), [0, -1.3, 0], [1.6, 0.25, 1.6]); _wkeM(cap, 'box', _wkeD(), [0.9, 0.2, 0], [0.05, 0.7, 0.55]); _wkeM(cap, 'cyl', _wkeO(), [0, 0.7, 0], [1.2, 0.18, 1.2]);
    for (let i = 0; i < 7; i++) { const b = rn() * TAU, d = 3.5 + rn() * 8; _wkeM(g, 'box', i % 2 ? _wkeS() : _wkeW(), [Math.cos(b) * d, 0.12 + rn() * 0.2, Math.sin(b) * d], [0.2 + rn() * 1.4, 0.05 + rn() * 0.1, 0.4 + rn() * 1.2], [rn() * 0.5, rn() * 3, rn() * 0.5]); }
    _wkeM(g, 'cyl', _wkeS(), [4.5, 0.3, -2.5], [0.55, 0.9, 0.55], [1.4, 0.4, 0]); return { cols: [[0, 0, 2.2]] }; },
  outpost(B, g, rn) { const w = _wkeW(), d = _wkeD(); _wkeM(g, 'hemi', w, [0, 0, 0], [3.6, 3.2, 3.6]); _wkeM(g, 'hemi', w, [7, 0, 1.5], [2.4, 2.2, 2.4]); _wkeM(g, 'cyl', _wkeS(), [3.6, 0.7, 0.7], [0.5, 4.2, 0.5], [0, 0, Math.PI / 2]);
    _wkeM(g, 'box', _wkeMat('win', { c: 0x223040, e: 0xffd78a, ei: 1.4 }), [0, 1.2, 3.55], [1.6, 0.7, 0.1]); _wkeM(g, 'box', d, [-1.8, 0.1, 3.1], [0.9, 2.0, 0.2], [0, 0.5, 0]);
    for (let i = 0; i < 4; i++) { _wkeM(g, 'cyl', d, [-9 + i * 2.1, 0.55, -5], [0.06, 1.1, 0.06]); _wkeM(g, 'box', _wkeMat('panel', { c: 0x15264a, r: 0.3, m: 0.5, e: 0x0a1630 }), [-9 + i * 2.1, 1.25, -5], [1.8, 0.05, 1.2], [-0.5, 0, 0]); }
    _wkeM(g, 'cyl', _wkeS(), [-5, 1.0, 5], [1.0, 2.0, 1.0]); _wkeM(g, 'cyl', _wkeS(), [11, 3, -2], [0.08, 6, 0.08]); _wkeM(g, 'hemi', w, [11, 6, -2], [0.9, 0.9, 0.9], [0.9, 0, 0]);
    return { cols: [[0, 0, 3.7], [7, 1.5, 2.5], [-5, 5, 1.1]] }; },
  monolith(B, g, rn) { const mm = _wkeMat('mono', { c: 0x050507, r: 0.12, m: 0.9 }), em = _wkeMat('monoE', { c: 0x000000, e: 0x88aaff, ei: 1.2 }); _wkeM(g, 'box', mm, [0, 4.5, 0], [3, 9, 0.9]);
    const e1 = _wkeM(g, 'box', em, [1.52, 4.5, 0.46], [0.05, 9, 0.05]), e2 = _wkeM(g, 'box', em, [-1.52, 4.5, 0.46], [0.05, 9, 0.05]);
    const rk = WkE.rockMat(B); for (let i = 0; i < 7; i++) { const a = i / 7 * TAU, dd = 6 + rn() * 2; _wkeM(g, 'rock', rk, [Math.cos(a) * dd, 0.3, Math.sin(a) * dd], [0.5 + rn() * 0.8, 0.35, 0.5 + rn() * 0.6], [0, rn() * 3, 0]); } void e1; void e2;
    return { cols: [[0, 0, 1.9]], tick(t) { em.emissiveIntensity = 0.8 + 0.6 * Math.sin(t * 1.3); } }; },
  cache(B, g, rn) { const o = _wkeO(), w = _wkeW(); for (let i = 0; i < 5; i++) _wkeM(g, 'box', i % 2 ? o : w, [(i % 3) * 1.1 - 1, 0.4 + (i > 2 ? 0.8 : 0), (i > 2 ? 0.4 : 0) + (i % 2) * 0.1], [1, 0.8, 1], [0, rn() * 0.5, 0]);
    _wkeM(g, 'cyl', _wkeS(), [2.0, 0.6, 0.3], [0.22, 1.2, 0.22]); _wkeM(g, 'cyl', _wkeS(), [2.5, 0.6, -0.2], [0.22, 1.2, 0.22]); _wkeM(g, 'cyl', _wkeD(), [-2, 1.2, 1], [0.05, 2.4, 0.05]);
    const lamp = _wkeM(g, 'sph', _wkeMat('blinkG', { c: 0x30ff80, e: 0x20ff70, ei: 2.5 }), [-2, 2.45, 1], [0.15, 0.15, 0.15]); return { cols: [[0, 0, 1.8]], tick(t) { lamp.visible = (t * 1.1) % 2 < 0.5; } }; },
  arch(B, g, rn) { const rk = WkE.rockMat(B); const a = rn() * 3; const h = 10 + rn() * 5, wd = 6 + rn() * 3;
    _wkeM(g, 'rock', rk, [-wd, h * 0.3, 0], [2.4, h * 0.32, 2.4], [0, a, 0]); _wkeM(g, 'rock', rk, [wd, h * 0.3, 0], [2.5, h * 0.32, 2.2], [0, a + 1, 0]);
    _wkeM(g, 'arch', rk, [0, h * 0.5, 0], [wd, h * 0.5, 12]);
    return { cols: [[-wd, 0, 2.9], [wd, 0, 2.9]] }; },
  spires(B, g, rn) { const dk = _wkeMat('obsid', { c: 0x0c0c10, r: 0.15, m: 0.6 }), em = _wkeMat('obsidE', { c: 0x1a0a05, e: 0xff5a1a, ei: 0.6 }); const cols = [];
    for (let i = 0; i < 8; i++) { const a = rn() * TAU, d = i ? 2 + rn() * 9 : 0, h = 3 + rn() * (i ? 12 : 20), r = 0.6 + rn() * 1.1, x = Math.cos(a) * d, z = Math.sin(a) * d; _wkeM(g, 'cone', dk, [x, h / 2, z], [r, h, r], [(rn() - 0.5) * 0.25, 0, (rn() - 0.5) * 0.25]); _wkeM(g, 'cone', em, [x, h * 0.2, z], [r * 1.02, h * 0.4, r * 1.02]); cols.push([x, z, r * 0.8]); }
    return { cols, tick(t) { em.emissiveIntensity = 0.5 + 0.35 * Math.sin(t * 0.8); } }; },
  vent(B, g, rn) { const em = _wkeMat('lava', { c: 0x2a0a00, e: 0xff5a10, ei: 2.2 }), dk = _wkeMat('basalt', { c: 0x15110f, r: 1 }); _wkeM(g, 'disc', dk, [0, 0.04, 0], [11, 1, 11]); const cols = [];
    for (let i = 0; i < 6; i++) { const a = rn() * TAU, d = 1 + rn() * 5; _wkeM(g, 'box', em, [Math.cos(a) * d, 0.06, Math.sin(a) * d], [4 + rn() * 5, 0.06, 0.4 + rn() * 0.5], [0, rn() * 3, 0]); }
    for (let i = 0; i < 7; i++) { const a = i / 7 * TAU + rn() * 0.5, d = 7 + rn() * 2, s = 0.9 + rn() * 1.4; _wkeM(g, 'rock', dk, [Math.cos(a) * d, s * 0.3, Math.sin(a) * d], [s, s * 0.7, s]); cols.push([Math.cos(a) * d, Math.sin(a) * d, s * 0.8]); }
    const pl = WkE.plume(g, 0xffa060, 22, 9); return { cols, hot: 9, tick(t, dt) { em.emissiveIntensity = 1.8 + 0.9 * Math.sin(t * 2.1); pl(t, 0.7, 0.9); } }; },
  crystals(B, g, rn) { const c = (WKE_THEME[B.id] || WKE_THEME.luna).crys, m = _wkeMat('crys' + c, { c, e: c, ei: 1.1, r: 0.2, m: 0.1, o: 0.88 }), cols = [], n = 9 + (rn() * 6 | 0);
    for (let i = 0; i < n; i++) { const a = rn() * TAU, d = i ? 0.7 + rn() * 3.6 : 0, h = 0.8 + rn() * (i ? 3.2 : 5.5), r = 0.14 + rn() * 0.3, x = Math.cos(a) * d, z = Math.sin(a) * d, lean = d * 0.09 + rn() * 0.2; const cr = _wkeM(g, 'cyl6', m, [x, h / 2, z], [r, h, r], [Math.sin(a) * lean, 0, -Math.cos(a) * lean]); _wkeM(g, 'cone', m, [x, h + r * 0.5, z], [r, r * 1.5, r], cr.rotation.toArray()); if (i < 4) cols.push([x, z, r + 0.2]); }
    _wkeM(g, 'rock', WkE.rockMat(B), [0, 0.2, 0], [4.4, 0.5, 4.4]); return { cols, tick(t) { m.emissiveIntensity = 0.8 + 0.5 * Math.sin(t * 1.7 + n); } }; },
  ring(B, g, rn) { const rk = WkE.rockMat(B), cols = [], n = 11 + (rn() * 3 | 0), R = 13 + rn() * 3; for (let i = 0; i < n; i++) { const a = i / n * TAU, h = 3.4 + rn() * 2.6, x = Math.cos(a) * R, z = Math.sin(a) * R;
      if (rn() < 0.14) { _wkeM(g, 'box', rk, [x, 0.45, z], [1.5, 0.9, 3.6], [0.1, a + 1.5, 0.15]); } else { _wkeM(g, 'box', rk, [x, h / 2, z], [1.5, h, 0.9], [(rn() - 0.5) * 0.14, a + Math.PI / 2, (rn() - 0.5) * 0.14]); cols.push([x, z, 0.95]); } }
    const rune = _wkeMat('rune', { c: 0x101418, e: 0x66ffd0, ei: 0.9 }); _wkeM(g, 'cyl', rk, [0, 0.3, 0], [2.4, 0.6, 2.4]); const ro = _wkeM(g, 'cyl', rune, [0, 0.62, 0], [1.6, 0.03, 1.6]); void ro;
    return { cols, tick(t) { rune.emissiveIntensity = 0.5 + 0.5 * Math.sin(t * 0.9); } }; },
  rover(B, g, rn) { const w = _wkeW(), d = _wkeD(), tilt = [0.12, rn() * TAU, 0.18], r = new THREE.Group(); r.rotation.set(tilt[0], tilt[1], tilt[2]); r.position.y = 0.2; g.add(r);
    _wkeM(r, 'box', w, [0, 0.9, 0], [2.6, 0.5, 1.5]); _wkeM(r, 'box', d, [-0.2, 1.3, 0], [1.2, 0.3, 1.2]); _wkeM(r, 'cyl', _wkeS(), [0.9, 1.9, 0], [0.05, 1.8, 0.05]); _wkeM(r, 'box', d, [0.9, 2.8, 0], [0.5, 0.3, 0.3]);
    for (const x of [-1, 0, 1]) for (const z of [-0.95, 0.95]) _wkeM(r, 'cyl', d, [x * 1.0, 0.45, z], [0.45, 0.35, 0.45], [Math.PI / 2, 0, 0]); _wkeM(r, 'box', _wkeMat('panel', { c: 0x15264a, r: 0.3, m: 0.5, e: 0x0a1630 }), [-0.9, 1.65, 0], [1.6, 0.05, 1.3], [0, 0, 0.1]);
    const tr = _wkeMat('track', { c: 0x2a2724, r: 1 }); for (let i = 0; i < 26; i++) { _wkeM(r, 'box', tr, [-2.2 - i * 1.2, -0.12, -0.95], [0.9, 0.02, 0.4]); _wkeM(r, 'box', tr, [-2.2 - i * 1.2, -0.12, 0.95], [0.9, 0.02, 0.4]); } return { cols: [[0, 0, 1.9]] }; },
  geyser(B, g, rn) { const rk = WkE.rockMat(B); _wkeM(g, 'tcone', rk, [0, 0.7, 0], [3, 1.4, 3]); _wkeM(g, 'disc', _wkeMat('frost', { c: 0xa8aeb4, r: 1, o: 0.55 }), [0, 0.04, 0], [10, 1, 10]); const col = B.id === 'cinder' ? 0xe8e070 : 0xe8f2ff, pl = WkE.plume(g, col, 34, 12), ph = rn() * 9; return { cols: [[0, 0, 2.6]], tick(t) { const c = Math.sin((t + ph) * 0.7); pl(t, c > 0.45 ? 1 : 0.12, 1); } }; },
};
/* a rising column of puffs: returns update(t, strength, speed) */
WkE.plume = function (g, color, height, n) {
  const gm = _wkeGeo('sph'), puffs = [], own = g.userData.own || (g.userData.own = []);
  for (let i = 0; i < n; i++) { const m = new THREE.MeshBasicMaterial({ color: lc(color), transparent: true, opacity: 0, depthWrite: false, fog: true }); own.push(m); const p = new THREE.Mesh(gm, m); p.castShadow = false; p.position.y = 1; g.add(p); puffs.push(p); }
  return (t, str, spd) => { for (let i = 0; i < n; i++) { const a = ((t * 0.16 * spd + i / n) % 1), p = puffs[i], k = a * a * (3 - 2 * a); p.position.set(Math.sin(i * 2.4 + t * 0.2) * a * 3.2, 1 + k * height, Math.cos(i * 1.7) * a * 3.2); p.scale.setScalar(0.7 + a * 3.4); p.material.opacity = (1 - a) * 0.42 * str * Math.min(1, a * 6); } };
};
WkE.rockMat = function (B) { return _wkeMat('rock' + B.id, { c: new THREE.Color(B.c2).lerp(new THREE.Color(B.c1), 0.35).getHex(), r: 1, f: true }); };

/* ---------- landmark placement ---------- */
WkE.chooseType = function (B, h) { const t = (WKE_THEME[B.id] || WKE_THEME.luna).t; let tot = 0; for (const e of t) tot += e[1]; let x = h * tot; for (const e of t) { x -= e[1]; if (x <= 0) return e[0]; } return t[0][0]; };
WkE.makeLm = function (B, key, x, z, type, salt) {
  const h = _wkeH(Math.round(x), Math.round(z), salt + 17), lore = WKE_LORE[type], lm = { key, x, z, type, name: WKE_NAME[type], lore: lore[(h * lore.length) | 0], rd: WKE_RD[type] || 14, grp: null, beam: null, found: !!WkE.done('dc:' + key), cols: [], rot: h * TAU, seed: (h * 1e9) | 0, tick: null, used: false };
  return lm;
};
WkE.done = (k) => (save.wk.done || (save.wk.done = {}))[k];
/* make the landmarks of the 700 m cells around (x,z) that do not exist yet; plus two that are always close to where you landed */
WkE.genLandmarks = function (B, P) {
  const x = P.x, z = P.z, LC = 700, ci = Math.floor(x / LC), cj = Math.floor(z / LC), salt = (WK.BODIES.indexOf(B) + 1) * 1000;
  for (let i = ci - 3; i <= ci + 3; i++) for (let j = cj - 3; j <= cj + 3; j++) {
    const key0 = B.id + ':' + i + ':' + j; if (WkE.cells.has(key0)) continue; WkE.cells.add(key0);
    const h = _wkeH(i, j, salt + 1), n = h < 0.46 ? (h < 0.06 ? 2 : 1) : 0;
    for (let k = 0; k < n; k++) { const lx = (i + 0.1 + 0.8 * _wkeH(i, j, salt + 3 + k * 7)) * LC, lz = (j + 0.1 + 0.8 * _wkeH(i, j, salt + 4 + k * 7)) * LC; if (Math.hypot(lx - WkE.site.x, lz - WkE.site.z) < 110) continue; const type = WkE.chooseType(B, _wkeH(i, j, salt + 5 + k * 7)), key = B.id + ':' + i + ':' + j + ':' + k; WkE.lms.push(WkE.makeLm(B, key, lx, lz, type, salt)); }
  }
};
WkE.siteLandmarks = function (B) {
  const sx = Math.round(WkE.site.x / 60), sz = Math.round(WkE.site.z / 60), salt = (WK.BODIES.indexOf(B) + 1) * 1000 + 500;
  const rings = [[260, 420, ['beacon', 'wreck', 'outpost', 'rover', 'crystals', 'cache']], [800, 1400, null]];
  rings.forEach((rg, k) => { const a = _wkeH(sx, sz, salt + k * 3) * TAU, d = rg[0] + _wkeH(sx, sz, salt + 1 + k * 3) * (rg[1] - rg[0]); const type = rg[2] ? rg[2][(_wkeH(sx, sz, salt + 2 + k * 3) * rg[2].length) | 0] : WkE.chooseType(B, _wkeH(sx, sz, salt + 2 + k * 3)); const th = (WKE_THEME[B.id] || WKE_THEME.luna).t.map((e) => e[0]); const ty = th.includes(type) ? type : 'beacon';
    WkE.lms.push(WkE.makeLm(B, B.id + ':s' + sx + ':' + sz + ':' + k, WkE.site.x + Math.cos(a) * d, WkE.site.z + Math.sin(a) * d, ty, salt)); });
};
/* build or drop the meshes of landmarks as you move */
WkE.streamLm = function (B, P, t) {
  for (const lm of WkE.lms) {
    const d = Math.hypot(lm.x - P.x, lm.z - P.z);
    if (d < 900 && !lm.grp) { const g = new THREE.Group(); g.position.set(lm.x, 0, lm.z); g.rotation.y = lm.rot; let k = 0; const rnd = () => _wkeH(lm.seed, k++, 99); const o = WKE_BUILD[lm.type](B, g, rnd); lm.cols = (o.cols || []).map((c) => [lm.x + c[0] * Math.cos(lm.rot) + c[1] * Math.sin(lm.rot), lm.z - c[0] * Math.sin(lm.rot) + c[1] * Math.cos(lm.rot), c[2]]); lm.tick = o.tick || null; lm.hot = o.hot || 0; WkE.root.add(g); lm.grp = g; }
    else if (d > 1400 && lm.grp) { WkE.root.remove(lm.grp); for (const m of lm.grp.userData.own || []) m.dispose(); lm.grp = null; lm.tick = null; lm.cols = []; }
    if (!lm.beam && !lm.found && d < 1700) { const c = (WKE_THEME[B.id] || WKE_THEME.luna).crys, bm = new THREE.Mesh(_wkeGeo('cyl'), _wkeMat('beam' + c, { c, a: true, o: 0.13 })); bm.scale.set(0.45, 70, 0.45); bm.position.set(lm.x, 45, lm.z); bm.castShadow = false; WkE.root.add(bm); lm.beam = bm; }
    if (lm.beam && (lm.found || d >= 1800)) { WkE.root.remove(lm.beam); lm.beam = null; }
    if (lm.beam) lm.beam.visible = d > 40;
  }
};

/* ---------- samples: glowing crystals on little rocks, one per roughly seven 90 m cells ---------- */
WkE.sampleAt = function (B, ci, cj) { const salt = (WK.BODIES.indexOf(B) + 1) * 1000 + 800; if (_wkeH(ci, cj, salt) > 0.14) return null; const x = (ci + 0.15 + 0.7 * _wkeH(ci, cj, salt + 1)) * 90, z = (cj + 0.15 + 0.7 * _wkeH(ci, cj, salt + 2)) * 90; if (Math.hypot(x - WkE.site.x, z - WkE.site.z) < 20) return null; const key = B.id + ':' + ci + ':' + cj; return WkE.done('sk:' + key) ? null : { key, x, z }; };
WkE.updateSamples = function (B, P) {
  if (!WkE.sPool) { WkE.sPool = []; const c = (WKE_THEME[B.id] || WKE_THEME.luna).crys; for (let i = 0; i < 12; i++) { const g = new THREE.Group(), cm = _wkeMat('smp' + c, { c, e: c, ei: 1.6, r: 0.2 }); _wkeM(g, 'rock', WkE.rockMat(B), [0, 0.12, 0], [0.45, 0.3, 0.4]); const cr = _wkeM(g, 'oct', cm, [0, 0.6, 0], [0.2, 0.34, 0.2]); const bm = _wkeM(g, 'cyl', _wkeMat('beam' + c, { c, a: true, o: 0.22 }), [0, 6, 0], [0.12, 12, 0.12]); g.visible = false; WkE.root.add(g); WkE.sPool.push({ g, cr, bm, s: null }); } }
  const LC = 90, ci = Math.floor(P.x / LC), cj = Math.floor(P.z / LC), found = []; for (let i = ci - 4; i <= ci + 4; i++) for (let j = cj - 4; j <= cj + 4; j++) { const s = WkE.sampleAt(B, i, j); if (s) { s.d = Math.hypot(s.x - P.x, s.z - P.z); found.push(s); } }
  found.sort((a, b) => a.d - b.d); WkE.samples = found.slice(0, 12); WkE.sPool.forEach((p, i) => { const s = WkE.samples[i]; p.s = s || null; p.g.visible = !!s; if (s) p.g.position.set(s.x, 0, s.z); });
};
WkE.tickSamples = function (t) { for (const p of WkE.sPool || []) if (p.s) { p.cr.rotation.y = t * 1.2; p.cr.position.y = 0.55 + 0.08 * Math.sin(t * 2 + p.s.x); } };

/* ---------- the boulder field around you ---------- */
WkE.updateRocks = function (B, P) {
  if (!WkE.rocks) { const m = new THREE.InstancedMesh(_wkeGeo('rock'), WkE.rockMat(B), 800); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.count = 0; WkE.root.add(m); WkE.rocks = m; WkE.rcell = [1e9, 1e9]; }
  const CS = 14, ci = Math.floor(P.x / CS), cj = Math.floor(P.z / CS); if (ci === WkE.rcell[0] && cj === WkE.rcell[1]) return; WkE.rcell = [ci, cj];
  const m = WkE.rocks, R = 17, salt = (WK.BODIES.indexOf(B) + 1) * 1000 + 300, mx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), ps = new THREE.Vector3(), sc = new THREE.Vector3(), col = new THREE.Color(); let n = 0; WkE.rcols = [];
  for (let i = ci - R; i <= ci + R && n < 800; i++) for (let j = cj - R; j <= cj + R && n < 800; j++) {
    const h = _wkeH(i, j, salt); if (h > 0.4) continue; const x = (i + _wkeH(i, j, salt + 1)) * CS, z = (j + _wkeH(i, j, salt + 2)) * CS, dd = Math.hypot(x - P.x, z - P.z); if (dd > R * CS || Math.hypot(x - WkE.site.x, z - WkE.site.z) < 9) continue;
    const u = _wkeH(i, j, salt + 3); let s = 0.22 + 2.3 * u * u * u + (u > 0.985 ? 2.4 : 0); s *= clamp((R * CS - dd) / 60, 0.25, 1); const sy = s * (0.5 + 0.4 * _wkeH(i, j, salt + 4));
    e.set(_wkeH(i, j, salt + 5) * 0.6, _wkeH(i, j, salt + 6) * TAU, _wkeH(i, j, salt + 7) * 0.6); q.setFromEuler(e); ps.set(x, sy * 0.35, z); sc.set(s * (0.8 + 0.5 * _wkeH(i, j, salt + 8)), sy, s); mx.compose(ps, q, sc); m.setMatrixAt(n, mx);
    const sh = 0.72 + 0.4 * _wkeH(i, j, salt + 9); col.setRGB(sh, sh * 0.98, sh * 0.96); if (m.setColorAt) m.setColorAt(n, col); if (s > 0.9) WkE.rcols.push([x, z, s * 0.78]); n++;
  }
  m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
};

/* ---------- the flag ---------- */
WkE.buildFlag = function () {
  const g = new THREE.Group(), wh = _wkeW(); _wkeM(g, 'cyl', _wkeS(), [0, 1.3, 0], [0.025, 2.6, 0.025]); _wkeM(g, 'cyl', _wkeS(), [0.5, 2.5, 0], [0.012, 1.0, 0.012], [0, 0, Math.PI / 2]);
  _wkeM(g, 'box', _wkeMat('flagA', { c: 0xff8a1f, r: 0.9 }), [0.52, 2.18, 0], [1.0, 0.7, 0.02]); _wkeM(g, 'box', wh, [0.52, 2.3, 0.012], [1.0, 0.14, 0.01]); _wkeM(g, 'box', _wkeD(), [0, 0.04, 0], [0.5, 0.08, 0.5]); return g;
};
WkE.syncFlags = function (B) {
  if (!WkE.flagG) { WkE.flagG = WkE.buildFlag(); WkE.flagG.visible = false; WkE.root.add(WkE.flagG); }
  const f = WkE.done('fl:' + B.id); if (f) { WkE.flagG.visible = true; WkE.flagG.position.set(WkF.ox + f[0], 0, WkF.oz + f[1]); WkE.flagG.rotation.y = f[2] || 0; } else WkE.flagG.visible = false;
};
