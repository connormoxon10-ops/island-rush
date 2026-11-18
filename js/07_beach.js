/* ================= BEACHES: the whole coastline is a beach, with people on it =================
   Every stretch of shore round the island (and round the lakes) that is low, gentle and away from roads, towns, the marina, the airfield and the raceway is sand,
   and the shore is cut into cells. Each cell is looked at once (and the answer kept), deterministically, so a stretch of beach always has the same things on it:
     family      a striped umbrella, two towels, a cool box, a ball and a sandcastle; someone lying in the sun, someone sitting up, a child playing
     sun         a towel and one or two sunbathers, on their backs or fronts
     chairs      two loungers under an umbrella, two people stretched out on them
     walk        someone strolling along the waterline and back
     tower       a lifeguard tower with its flag, a lifeguard on watch and surfboards stuck in the sand
     swim        out in the shallows: people standing waist-deep in the sea
   The people are the game's Humans in beachwear (men in swim trunks, women in bikinis, girls in a swimsuit; bare feet, sun hats and sunglasses). They are made only near the camera (the nearest
   BCH.CAP), posed every frame through the pedestrians' own pose code and then laid down, sat or stood in the water. A car that hits one knocks them over. */
const Beach = { cells: new Map(), group: null, live: [], scanT: 0, ready: false, geo: null, ppl: 0 };
const BCH = { CELL: 34, R: 260, RP: 130, CAP: 34, SEA: 0 };
const BCH_SWIM = [0x1f6fd1, 0xe0342a, 0xf2c81e, 0x18a89a, 0xff6fa8, 0x23252b, 0xf27a1a, 0x7a3fd1, 0xf4f4f0, 0x2a9d4a].map(lc);
const BCH_TOWEL = [0xe0342a, 0x1f6fd1, 0xf2c81e, 0x18a89a, 0xff6fa8, 0xf27a1a, 0x7a3fd1, 0xf4f4f0].map(lc);
const BCH_UMB = [[0xe0342a, 0xf4f4f0], [0x1f6fd1, 0xf4f4f0], [0xf2c81e, 0x18a89a], [0xff6fa8, 0xf4f4f0], [0x2a9d4a, 0xf2c81e], [0xf27a1a, 0x1f6fd1]];
const BCH_STRAW = [0xd9c27a, 0xe8d49a, 0xc9a85a, 0xf4f0e0].map(lc);
const _bchE = new THREE.Euler(0, 0, 0, 'YXZ'), _bchQ = new THREE.Quaternion(), _bchV = new THREE.Vector3(), _bchS = new THREE.Vector3(), _bchM = new THREE.Matrix4(), _bchC = new THREE.Color();

Beach.site = (x, z) => bchSite(x, z);
Beach.init = function () {
  Beach.group = new THREE.Group(); Beach.group.name = 'beach'; scene.add(Beach.group); Beach.ready = true;
  const G = Beach.geo = {
    box: ni(new THREE.BoxGeometry(1, 1, 1)), cyl: ni(new THREE.CylinderGeometry(1, 1, 1, 10, 1)), ball: ni(new THREE.IcosahedronGeometry(1, 1)),
    cone: ni(new THREE.ConeGeometry(1, 1, 8, 1, true)), board: ni(new THREE.SphereGeometry(1, 12, 8)), umb: []
  };
  /* striped canopies: eight panels in two alternating colours */
  for (const [a, b] of BCH_UMB) {
    const g = ni(new THREE.ConeGeometry(1, 0.32, 16, 1, true)), n = g.attributes.position.count, col = new Float32Array(n * 3), ca = lc(a), cb = lc(b), p = g.attributes.position;
    for (let i = 0; i < n; i += 3) { const x = (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, z = (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, k = Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 8) % 2, c = k ? cb : ca;
      for (let j = 0; j < 3; j++) { col[(i + j) * 3] = c.r; col[(i + j) * 3 + 1] = c.g; col[(i + j) * 3 + 2] = c.b; } }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); G.umb.push(g);
  }
  /* a beach ball: six coloured lunes and white poles */
  { const g = ni(new THREE.IcosahedronGeometry(1, 2)), n = g.attributes.position.count, col = new Float32Array(n * 3), p = g.attributes.position, C = [0xe0342a, 0xf2c81e, 0x1f6fd1, 0xf4f4f0, 0x2a9d4a, 0xf27a1a].map(lc);
    for (let i = 0; i < n; i += 3) { const x = p.getX(i) + p.getX(i + 1) + p.getX(i + 2), y = p.getY(i) + p.getY(i + 1) + p.getY(i + 2), z = p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2), c = Math.abs(y) > 2.6 ? C[3] : C[Math.floor(((Math.atan2(x, z) + Math.PI) / TAU) * 6) % 6];
      for (let j = 0; j < 3; j++) { col[(i + j) * 3] = c.r; col[(i + j) * 3 + 1] = c.g; col[(i + j) * 3 + 2] = c.b; } }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); G.bball = g; }
};

/* is this point a stretch of open beach (or, for swimmers, the shallows just off one)? */
function bchSite(x, z) {
  if (Math.abs(x) > WORLD_R || Math.abs(z) > WORLD_R) return 0;
  const h = terrainHeight(x, z); if (h > 3.4 || h < -1.4) return 0;
  if (NR.seg >= 0 && NR.d < NR.halfW + 14) return 0;
  if (townAt(x, z, 40)) return 0;
  if (Air.s && x > Air.s.x0 - 60 && x < Air.s.x1 + 60 && z > Air.s.z0 - 60 && z < Air.s.z1 + 60) return 0;
  if (Track.s && x > Track.s.x0 - 60 && x < Track.s.x1 + 60 && z > Track.s.z0 - 60 && z < Track.s.z1 + 60) return 0;
  if (Dock.s && Math.hypot(x - Dock.s.ox, z - Dock.s.oz) < 170) return 0;
  if (Heist.site && Heist.clearTree(x, z)) return 0;   /* not on the Gold Rush run-up */
  if (Dunes.s && Dunes.sand(x, z) > 0) return 0;   /* the Dune Dash is a race track, not a beach */
  return h >= 0.35 ? 1 : h < -0.5 ? 2 : 0;
}
/* a cell of shore: what (if anything) is on it. Looked at once and kept. */
Beach.cell = function (i, j) {
  const key = (i + 4096) * 8192 + (j + 4096); if (Beach.cells.has(key)) return Beach.cells.get(key);
  const r = mulberry32((i * 73856093) ^ (j * 19349663) ^ 0x5bd1e995), C = BCH.CELL, x = (i + 0.2 + 0.6 * r()) * C, z = (j + 0.2 + 0.6 * r()) * C;
  let sp = null; const site = bchSite(x, z);
  if (site) {
    const h = terrainHeight(x, z), gx = terrainHeight(x + 2, z) - terrainHeight(x - 2, z), gz = terrainHeight(x, z + 2) - terrainHeight(x, z - 2), g = Math.hypot(gx, gz) / 4;
    const yaw = g > 0.004 ? Math.atan2(-gx, -gz) : r() * TAU;   /* facing down the beach, to the water */
    if (site === 1 && g < 0.14 && r() < 0.85) {
      const u = r(); sp = { x, z, y: h, yaw, kind: u < 0.22 ? 'family' : u < 0.42 ? 'sun' : u < 0.54 ? 'chairs' : u < 0.68 ? 'walk' : u < 0.8 ? 'group' : u < 0.9 ? 'volley' : 'tower', seed: r() * 1000, ppl: [], mesh: null, i, j };
    } else if (site === 2 && r() < 0.75) sp = { x, z, y: h, yaw, kind: 'swim', seed: r() * 1000, ppl: [], mesh: null, i, j };
    if (sp) bchPlan(sp, mulberry32((sp.seed * 1000) | 0));
  }
  Beach.cells.set(key, sp); return sp;
};
/* spot-local (lx right, lz toward the sea) to world */
function bchW(sp, lx, lz, o) { const s = Math.sin(sp.yaw), c = Math.cos(sp.yaw); o.x = sp.x + lx * c + lz * s; o.z = sp.z - lx * s + lz * c; return o; }
/* beachwear: the person's own build, skin and hair, men and boys in swim trunks, women in bikinis (girls in a swimsuit), barefoot, with a sun hat and sunglasses now and then */
function bchLook(rnd, opt) {
  const R0 = Math.random; let a; Math.random = rnd; try { a = pedRandomLook(); } finally { Math.random = R0; }
  const pk = (arr) => arr[(rnd() * arr.length) | 0];
  a.coat = false; a.skirt = 0; a.tights = false; a.bag = false; a.sleeve = false; a.shorts = true; a.swim = true; a.hat = null; a.glasses = false; a.glassC = null; a.shoe = a.skin; a.sun = rnd() < 0.7;
  if (opt && opt.lie && (a.hst === 'long' || a.hst === 'pony')) a.hst = a.fem ? 'bun' : 'short';   /* (hair lying flat on a towel would hang the wrong way) */
  if (a.fem) { a.shirt = pk(BCH_SWIM); a.pants = rnd() < 0.65 || a.kid ? a.shirt : pk(BCH_SWIM); }   /* a bikini, matching or two-colour (a girl's swimsuit is one colour) */
  else { a.pants = pk(BCH_SWIM); a.shirt = a.skin; }   /* swim trunks, bare-chested */
  if (!a.kid && rnd() < 0.28) a.hat = { k: 'straw', c: pk(BCH_STRAW), bc: null };
  else if (rnd() < 0.12) a.hat = { k: 'cap', c: pk(BCH_SWIM), bc: null };
  if (!a.kid && rnd() < 0.45) { a.glasses = true; a.glassC = lc(0x101014); }
  if (opt && opt.guard) { a.kid = false; a.pants = lc(0xd8262a); a.shirt = a.fem ? lc(0xd8262a) : a.skin; a.hat = { k: 'cap', c: lc(0xd8262a), bc: null }; a.glasses = true; a.glassC = lc(0x101014); }
  return a;
}
function bchPerson(sp, rnd, pose, lx, lz, yawOff, opt) {
  const w = bchW(sp, lx, lz, {}), app = bchLook(rnd, Object.assign({ lie: pose === 'lie' || pose === 'prone' }, opt || {}));
  if (opt && opt.kid && !app.kid) { app.kid = true; app.s = 0.62 + rnd() * 0.12; app.hs = 1.26; app.old = false; app.beard = false; app.hat = null; app.glasses = false; if (!app.fem) app.shirt = app.skin; else app.pants = app.shirt; }
  const p = { app, x: w.x, z: w.z, y: 0, yaw: sp.yaw + (yawOff || 0), v: 0, ph: rnd() * TAU, state: pose === 'walk' ? 'walk' : 'stand', seed: rnd() * 20, pose, pose0: pose, wave: 0, pn: 0, jump: false, phone: false, pw: false, vx: 0, vy: 0, vz: 0, t: 0, hu: null };
  p.y = pose === 'swim' ? Math.max(terrainHeight(w.x, w.z), -1.25) : terrainHeight(w.x, w.z);
  sp.ppl.push(p); return p;
}
/* lay out a spot: its props (built later, when it is near) and its people */
function bchPlan(sp, r) {
  const k = sp.kind, P = sp.props = [];
  const towel = (lx, lz, yo) => { P.push({ t: 'towel', lx, lz, yo: yo || 0, c: (r() * BCH_TOWEL.length) | 0, c2: (r() * BCH_TOWEL.length) | 0 }); };
  if (k === 'family') {
    P.push({ t: 'umb', lx: 0, lz: -0.6, c: (r() * BCH_UMB.length) | 0, tilt: (r() - 0.5) * 0.2 }); towel(-0.8, 0.2, (r() - 0.5) * 0.3); towel(0.8, 0.0, (r() - 0.5) * 0.3);
    P.push({ t: 'cool', lx: 1.9, lz: -0.9, yo: r() }); P.push({ t: 'bball', lx: 2.5 + r(), lz: 2.6 + r() }); if (r() < 0.7) P.push({ t: 'castle', lx: -2.2, lz: 2.8 });
    bchPerson(sp, r, r() < 0.7 ? 'lie' : 'prone', -0.8, 1.05, 0); bchPerson(sp, r, 'sit', 0.8, -0.35, (r() - 0.5) * 0.4); bchPerson(sp, r, 'play', -1.6, 3.4, (r() - 0.5) * 2, { kid: true });
  } else if (k === 'sun') {
    const n = 1 + ((r() * 3) | 0); for (let q = 0; q < n; q++) { const lx = (q - (n - 1) / 2) * 1.5, yo = (r() - 0.5) * 0.3; towel(lx, 0, yo); const ps = r() < 0.6 ? 'lie' : r() < 0.6 ? 'prone' : 'sit'; bchPerson(sp, r, ps, lx, ps === 'sit' ? -0.35 : 0.85, yo); }
    if (r() < 0.5) P.push({ t: 'cool', lx: 1.6, lz: -1.2, yo: r() });
  } else if (k === 'chairs') {
    P.push({ t: 'umb', lx: 0, lz: -1.1, c: (r() * BCH_UMB.length) | 0, tilt: 0 }); P.push({ t: 'lounger', lx: -0.85, lz: 0, c: r() < 0.5 }); P.push({ t: 'lounger', lx: 0.85, lz: 0, c: r() < 0.5 });
    bchPerson(sp, r, 'chair', -0.85, 0.75, 0); if (r() < 0.8) bchPerson(sp, r, 'chair', 0.85, 0.75, 0);
  } else if (k === 'walk') {
    /* a stroll along the beach, staying on the sand: as far each way as the sand goes (up to 30 m) */
    const s = Math.sin(sp.yaw), c = Math.cos(sp.yaw), reach = (dir) => { let L = 4; for (let d = 6; d <= 30; d += 4) { const x = sp.x + c * d * dir, z = sp.z - s * d * dir; if (bchSite(x, z) !== 1) break; L = d; } return L; };
    const a = reach(-1), b = reach(1); const p = bchPerson(sp, r, 'walk', 0, 0, Math.PI / 2); p.ax = sp.x - c * a; p.az = sp.z + s * a; p.bx = sp.x + c * b; p.bz = sp.z - s * b; p.u = r(); p.dir = r() < 0.5 ? 1 : -1; p.vt = 0.95 + r() * 0.35;
    if (r() < 0.35) { const q = bchPerson(sp, r, 'walk', 0, 0, Math.PI / 2); Object.assign(q, { ax: p.ax, az: p.az, bx: p.bx, bz: p.bz, u: p.u, dir: p.dir, vt: p.vt, buddy: p }); }
  } else if (k === 'tower') {
    P.push({ t: 'tower', lx: 0, lz: 0 }); P.push({ t: 'board', lx: 2.4, lz: -0.6, c: (r() * BCH_SWIM.length) | 0, rz: 0.12 }); P.push({ t: 'board', lx: 2.9, lz: -0.4, c: (r() * BCH_SWIM.length) | 0, rz: -0.1 });
    bchPerson(sp, r, 'stand', -1.6, 1.4, 0, { guard: true });
  } else if (k === 'group') {
    /* friends standing about chatting in a ring, a cool box and a towel down */
    const n = 3 + ((r() * 2) | 0), a0 = r() * TAU; for (let q = 0; q < n; q++) { const a = a0 + q * TAU / n, lx = Math.sin(a) * 1.3, lz = Math.cos(a) * 1.3; bchPerson(sp, r, 'stand', lx, lz, Math.atan2(-lx, -lz)); }
    P.push({ t: 'cool', lx: 0.2, lz: 0.1, yo: r() }); towel(2.4, 0.4, r());
  } else if (k === 'volley') {
    /* beach volleyball: a net across, two a side, the ball in the air */
    P.push({ t: 'net', lx: 0, lz: 0 }); P.push({ t: 'ball', lx: 0.6, lz: 0.4, y: 3.2 });
    for (const [lx, lz] of [[-2.2, -3.0], [2.4, -4.2], [-2.6, 3.4], [2.0, 4.0]]) bchPerson(sp, r, 'play', lx, lz, lz < 0 ? 0 : Math.PI);
  } else if (k === 'swim') {
    const n = 2 + ((r() * 3) | 0); for (let q = 0; q < n; q++) bchPerson(sp, r, 'swim', (r() - 0.5) * 7, (r() - 0.5) * 5, Math.PI + (r() - 0.5) * 2.4, { kid: r() < 0.2 });
  }
}
/* the props of a spot as one merged mesh, built when it first comes near */
function bchBuild(sp) {
  const G = Beach.geo, gb = new GB(sp.x, sp.z, false), o = {};
  const put = (g, lx, lz, y, yaw, pitch, roll, sx, sy, sz, col, shade) => { const w = bchW(sp, lx, lz, o); _bchE.set(pitch || 0, sp.yaw + (yaw || 0), roll || 0, 'YXZ'); _bchQ.setFromEuler(_bchE); _bchM.compose(_bchV.set(w.x, y, w.z), _bchQ, _bchS.set(sx, sy, sz)); gb.geo(g, _bchM, col, shade || 0); };
  const gy = (lx, lz) => { const w = bchW(sp, lx, lz, o); return terrainHeight(w.x, w.z); };
  const W = lc(0xf4f4f0), WOOD = lc(0xb98a56), RED = lc(0xd8262a), SAND = lc(0xd8c08a), BLUE = lc(0x1f6fd1), METAL = lc(0xb8bcc0);
  for (const q of sp.props) {
    const y0 = gy(q.lx, q.lz);
    if (q.t === 'towel') { put(G.box, q.lx, q.lz, y0 + 0.012, q.yo, 0, 0, 0.9, 0.02, 1.85, BCH_TOWEL[q.c]); put(G.box, q.lx, q.lz + 0.6, y0 + 0.024, q.yo, 0, 0, 0.9, 0.006, 0.18, BCH_TOWEL[q.c2] === BCH_TOWEL[q.c] ? W : BCH_TOWEL[q.c2]); }
    else if (q.t === 'umb') {
      const t = q.tilt || 0, top = 2.25, tx = Math.sin(t) * top; put(G.cyl, q.lx + tx / 2, q.lz, y0 + top / 2 - 0.2, 0, 0, -t, 0.024, top + 0.4, 0.024, W);
      put(G.umb[q.c], q.lx + tx, q.lz, y0 + top, 0, 0, -t, 1.35, 1, 1.35, _bchC.setRGB(1, 1, 1)); put(G.ball, q.lx + tx * 1.07, q.lz, y0 + top + 0.18, 0, 0, 0, 0.04, 0.04, 0.04, W);
    } else if (q.t === 'cool') { put(G.box, q.lx, q.lz, y0 + 0.17, q.yo, 0, 0, 0.55, 0.34, 0.36, BLUE, 0.2); put(G.box, q.lx, q.lz, y0 + 0.36, q.yo, 0, 0, 0.57, 0.06, 0.38, W); }
    else if (q.t === 'bball') put(G.bball, q.lx, q.lz, y0 + 0.2, 0.7, 0.4, 0, 0.2, 0.2, 0.2, _bchC.setRGB(1, 1, 1));
    else if (q.t === 'castle') {
      put(G.cyl, q.lx, q.lz, y0 + 0.12, 0, 0, 0, 0.32, 0.24, 0.32, SAND, 0.3); for (const [dx, dz] of [[-0.32, -0.32], [0.32, -0.32], [-0.32, 0.32], [0.32, 0.32]]) { put(G.cyl, q.lx + dx, q.lz + dz, y0 + 0.16, 0, 0, 0, 0.11, 0.32, 0.11, SAND, 0.3); put(G.cone, q.lx + dx, q.lz + dz, y0 + 0.38, 0, 0, 0, 0.12, 0.14, 0.12, SAND, 0.2); }
      put(G.cyl, q.lx + 0.7, q.lz, y0 + 0.1, 0, 0, 0, 0.1, 0.2, 0.1, RED, 0.2);   /* the bucket */
    } else if (q.t === 'lounger') {
      const c = q.c ? BLUE : W, y = y0 + 0.32; put(G.box, q.lx, q.lz + 0.35, y, 0, 0, 0, 0.62, 0.05, 1.2, c); put(G.box, q.lx, q.lz - 0.52, y + 0.3, 0, -0.95, 0, 0.62, 0.05, 0.72, c);
      for (const [dx, dz] of [[-0.27, 0.9], [0.27, 0.9], [-0.27, -0.2], [0.27, -0.2]]) put(G.cyl, q.lx + dx, q.lz + dz, y0 + 0.15, 0, 0, 0, 0.02, 0.32, 0.02, METAL);
      put(G.box, q.lx, q.lz - 0.95, y + 0.62, 0, -0.95, 0, 0.5, 0.06, 0.18, W);   /* the pillow */
    } else if (q.t === 'board') put(G.board, q.lx, q.lz, y0 + 0.95, 0, 0, q.rz, 0.27, 1.05, 0.045, BCH_SWIM[q.c]);
    else if (q.t === 'net') {
      for (const sd of [-1, 1]) put(G.cyl, q.lx + sd * 4.6, q.lz, y0 + 1.3, 0, 0, 0, 0.05, 2.6, 0.05, W);
      for (let k = 0; k < 6; k++) put(G.box, q.lx, q.lz, y0 + 1.78 + k * 0.16, 0, 0, 0, 9.2, 0.012, 0.012, lc(0x30343a));   /* the net: strands you can see through */
      for (let k = -14; k <= 14; k++) put(G.box, q.lx + k * 0.32, q.lz, y0 + 2.18, 0, 0, 0, 0.012, 0.82, 0.012, lc(0x30343a));
      put(G.box, q.lx, q.lz, y0 + 2.62, 0, 0, 0, 9.2, 0.07, 0.04, W);
      for (const [x0, z0, x1, z1] of [[-4, -8, 4, -8], [-4, 8, 4, 8], [-4, -8, -4, 8], [4, -8, 4, 8]]) put(G.box, q.lx + (x0 + x1) / 2, q.lz + (z0 + z1) / 2, y0 + 0.02, 0, 0, 0, Math.max(0.05, Math.abs(x1 - x0)), 0.02, Math.max(0.05, Math.abs(z1 - z0)), lc(0x1f6fd1));   /* the court lines */
    } else if (q.t === 'ball') put(G.bball, q.lx, q.lz, y0 + q.y, 0.3, 0.2, 0, 0.11, 0.11, 0.11, _bchC.setRGB(1, 1, 1));
    else if (q.t === 'tower') {
      const H = 2.3; for (const [dx, dz] of [[-0.85, -0.85], [0.85, -0.85], [-0.85, 0.85], [0.85, 0.85]]) put(G.box, q.lx + dx, q.lz + dz, y0 + H / 2, 0, 0, 0, 0.12, H + 0.3, 0.12, W, 0.25);
      put(G.box, q.lx, q.lz, y0 + H + 0.05, 0, 0, 0, 2.0, 0.12, 2.0, WOOD); put(G.box, q.lx, q.lz, y0 + H + 0.25, 0, 0, 0, 1.6, 0.9, 1.4, W, 0.2);
      put(G.box, q.lx, q.lz + 0.71, y0 + H + 0.35, 0, 0, 0, 1.0, 0.36, 0.02, lc(0x2a3038));   /* the window */
      put(G.box, q.lx, q.lz, y0 + H + 0.82, 0, 0, 0, 2.1, 0.08, 1.9, RED); put(G.box, q.lx, q.lz + 0.9, y0 + H + 0.5, 0, 0, 0, 1.9, 0.06, 0.06, RED);
      for (let s = 0; s < 6; s++) put(G.box, q.lx, q.lz + 1.25 + s * 0.2, y0 + H - s * 0.38, 0, 0, 0, 0.7, 0.05, 0.16, WOOD);   /* the ladder */
      put(G.box, q.lx - 0.4, q.lz + 1.55, y0 + H / 2 - 0.2, 0, 0.45, 0, 0.06, H + 0.4, 0.06, WOOD); put(G.box, q.lx + 0.4, q.lz + 1.55, y0 + H / 2 - 0.2, 0, 0.45, 0, 0.06, H + 0.4, 0.06, WOOD);
      put(G.cyl, q.lx + 0.95, q.lz - 0.9, y0 + H + 1.4, 0, 0, 0, 0.025, 2.8, 0.025, W); put(G.box, q.lx + 1.25, q.lz - 0.9, y0 + H + 2.5, 0, 0, 0, 0.6, 0.4, 0.02, RED); put(G.box, q.lx + 1.25, q.lz - 0.9, y0 + H + 2.3, 0, 0, 0, 0.6, 0.2, 0.025, lc(0xf2c81e));
      put(G.cyl, q.lx - 1.5, q.lz - 0.2, y0 + 0.5, 0, 0, 0, 0.3, 0.06, 0.3, lc(0xf27a1a)); /* a rescue ring */
    }
  }
  const m = gb.mesh(MAT.prop, true, true); m.position.set(sp.x, 0, sp.z); return m;
}

/* every half second: which shore cells are near, build what has come near, drop what is far */
Beach.update = function (dt) {
  if (!Beach.ready || Rally.on || Derby.on || Drag.on) return;
  Beach.scanT -= dt; if (Beach.scanT > 0) return; Beach.scanT = 0.5;
  const f = pedFocus(), C = BCH.CELL, R = BCH.R, i0 = Math.floor((f.x - R) / C), i1 = Math.floor((f.x + R) / C), j0 = Math.floor((f.z - R) / C), j1 = Math.floor((f.z + R) / C), live = [];
  let budget = 160;   /* cells looked at for the first time this scan (the rest next time) */
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const key = (i + 4096) * 8192 + (j + 4096); let sp = Beach.cells.get(key);
    if (sp === undefined) { if (budget-- <= 0) continue; sp = Beach.cell(i, j); }
    if (!sp) continue; const d = Math.hypot(sp.x - f.x, sp.z - f.z); if (d > R) continue;
    if (!sp.mesh && sp.props && sp.props.length) { sp.mesh = bchBuild(sp); Beach.group.add(sp.mesh); }
    sp.d = d; live.push(sp);
  }
  for (const sp of Beach.live) if (sp.mesh && live.indexOf(sp) < 0) { Beach.group.remove(sp.mesh); sp.mesh.geometry.dispose(); sp.mesh = null; }
  Beach.live = live;
};
/* the people: walkers walk, everyone near enough is posed (called from writePeds, before people who were not drawn are let go) */
Beach.pose = function (time, dt) {
  if (!Beach.ready || !Beach.live.length || Rally.on || Derby.on || Drag.on || save.set.peds === 'off') return;
  const cx = camera.position.x, cz = camera.position.z, c = car, sp2 = Math.hypot(c.vx, c.vz), fs = Math.sin(c.yaw), fc = Math.cos(c.yaw), near = [];
  for (const sp of Beach.live) if (sp.d < BCH.RP + 20) for (const p of sp.ppl) { const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz; if (d2 < BCH.RP * BCH.RP) near.push([d2, p]); }
  near.sort((a, b) => a[0] - b[0]); Beach.ppl = 0;
  for (let n = 0; n < near.length && n < BCH.CAP; n++) {
    const p = near[n][1], d2 = near[n][0]; Beach.ppl++;
    /* knocked over by a car (they get up and stand about for a while before going back to what they were doing) */
    if (p.state !== 'down' && !Foot.on && sp2 > 3) { const dx = p.x - c.x, dz = p.z - c.z, fw = dx * fs + dz * fc, sd = dx * fc - dz * fs; if (Math.abs(fw) < 2.5 && Math.abs(sd) < 1.2 && Math.abs(p.y + (p.pose === 'swim' ? 0.9 : 0) - c.y) < 1.6) { p.state = 'down'; p.t = 0; p.vx = c.vx * 0.7; p.vz = c.vz * 0.7; p.vy = 2.4 + Math.min(4, sp2 * 0.2); p.pose = 'stand'; Snd.beep(180, 0.08); } }
    if (p.state === 'down') { p.t += dt; if (p.t > 4.5) { p.state = 'stand'; p.t = 0; const h = p.hu; if (h && h.rag) { const R = h.rag; p.x = (R.p[0].x + R.p[1].x) / 2; p.z = (R.p[0].z + R.p[1].z) / 2; } p.y = terrainHeight(p.x, p.z); p.back = 8; } }
    else if (p.back > 0) { p.back -= dt; if (p.back <= 0) { p.pose = p.pose0; p.state = p.pose0 === 'walk' ? 'walk' : 'stand'; if (p.pose0 !== 'walk') { const sp = Beach.live.find((s) => s.ppl.indexOf(p) >= 0); if (sp) bchHome(p); } } }
    else if (p.pose === 'walk') {
      const L = Math.hypot(p.bx - p.ax, p.bz - p.az) || 1; p.v = p.vt; p.u += p.dir * p.v * dt / L; if (p.u > 1) { p.u = 1; p.dir = -1; } else if (p.u < 0) { p.u = 0; p.dir = 1; }
      const off = p.buddy ? 0.7 : 0, s = (p.bx - p.ax) / L, cc = (p.bz - p.az) / L; p.x = p.ax + (p.bx - p.ax) * p.u + cc * off; p.z = p.az + (p.bz - p.az) * p.u - s * off; p.yaw = Math.atan2(s * p.dir, cc * p.dir); p.y = terrainHeight(p.x, p.z);
      p.ph += TAU * p.v / pedCyc(p.v, p.app) * dt;
    } else if (p.pose === 'play') { const u = pfr(time * 0.45 + p.seed); p.jump = u > 0.86; p.wave = u > 0.5 && u < 0.62 ? 1 : 0; }
    pedPose(p, time, dt, false, d2 > 780);
    if (p.state !== 'down') bchPoseFix(p, time);
  }
};
/* back to their towel or chair after being knocked over */
function bchHome(p) { p.x = p.x0 != null ? p.x0 : p.x; p.z = p.z0 != null ? p.z0 : p.z; p.y = p.y0 != null ? p.y0 : p.y; p.yaw = p.yaw0 != null ? p.yaw0 : p.yaw; }
/* lying, sitting and wading: take the standing pose the pedestrian code made and lay it down, sit it or stand it in the sea */
function bchPoseFix(p, time) {
  const h = p.hu; if (!h) return; const b = h.b, ps = p.pose, R = h.root;
  if (p.x0 == null) { p.x0 = p.x; p.z0 = p.z; p.y0 = p.y; p.yaw0 = p.yaw; }
  R.rotation.order = 'YXZ';
  if (ps === 'lie' || ps === 'prone') {
    /* on the towel: the feet at the near end, the body along it, face up (or face down with the head turned to one side) */
    const up = ps === 'lie' ? 1 : -1, s = Math.sin(p.yaw), c = Math.cos(p.yaw);
    R.position.set(p.x + s * 0.0, p.y + 0.135, p.z + c * 0.0); R.rotation.set(-up * Math.PI / 2, p.yaw + (up < 0 ? Math.PI : 0), 0);
    b.hips.position.set(0, 0.955, 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(0, 0, 0); b.chest.rotation.set(0.02 * Math.sin(time * 1.4 + p.seed), 0, 0);
    b.neck.rotation.set(0, up < 0 ? 0.5 : 0, 0); b.head.rotation.set(up > 0 ? 0.08 : 0, up < 0 ? 0.75 : 0.15 * Math.sin(time * 0.2 + p.seed), 0);
    const spr = 0.16 + 0.08 * pfr(p.seed * 3.1); b.armL.rotation.set(0.04, 0, -spr); b.armR.rotation.set(0.04, 0, spr); b.elL.rotation.set(-0.12, 0, 0); b.elR.rotation.set(-0.12, 0, 0); b.handL.rotation.set(0, 0, 0); b.handR.rotation.set(0, 0, 0);
    const kn = pfr(p.seed * 5.3) < 0.3 && up > 0 ? 0.9 : 0.04;   /* now and then one knee up */
    b.legL.rotation.set(-kn * 0.5, 0, -0.06); b.knL.rotation.set(kn, 0, 0); b.footL.rotation.set(up > 0 ? 0.6 - kn * 0.5 : -0.9, -0.12, 0);
    b.legR.rotation.set(0, 0, 0.06); b.knR.rotation.set(0.04, 0, 0); b.footR.rotation.set(up > 0 ? 0.6 : -0.9, 0.12, 0);
  } else if (ps === 'sit' || ps === 'chair') {
    /* sitting up on the towel, legs out and leaning back on the hands; or stretched out on a lounger with the back raised */
    const ch = ps === 'chair'; R.position.set(p.x, p.y + (ch ? 0.33 : 0), p.z); R.rotation.set(0, p.yaw, 0);
    b.hips.position.set(0, ch ? 0.2 : 0.16, 0); b.hips.rotation.set(0, 0, 0); b.tor.rotation.set(ch ? -0.55 : -0.28, 0, 0); b.chest.rotation.set(ch ? -0.25 : -0.08, 0, 0);
    b.neck.rotation.set(ch ? 0.3 : 0.12, 0, 0); b.head.rotation.set(ch ? 0.32 : 0.12, 0.25 * Math.sin(time * 0.15 + p.seed), 0);
    if (ch) { b.armL.rotation.set(0.15, 0, -0.2); b.armR.rotation.set(-0.1, 0, 0.2); b.elL.rotation.set(-0.9, 0.3, 0); b.elR.rotation.set(-1.0, -0.3, 0); }
    else { b.armL.rotation.set(0.75, 0, -0.32); b.armR.rotation.set(0.75, 0, 0.32); b.elL.rotation.set(-0.05, 0, 0); b.elR.rotation.set(-0.05, 0, 0); }
    b.handL.rotation.set(0, 0, 0); b.handR.rotation.set(0, 0, 0);
    const kn = !ch && pfr(p.seed * 2.7) < 0.4 ? 1.4 : 0.1;   /* knees drawn up, or legs out */
    b.legL.rotation.set(-1.5 - (kn > 1 ? 0.4 : 0), 0, -0.08); b.knL.rotation.set(kn * 1.3, 0, 0); b.footL.rotation.set(kn > 1 ? 0.2 : 0.35, -0.1, 0);
    b.legR.rotation.set(-1.5 - (kn > 1 ? 0.4 : 0), 0, 0.08); b.knR.rotation.set(kn * 1.3, 0, 0); b.footR.rotation.set(kn > 1 ? 0.2 : 0.35, 0.1, 0);
  } else if (ps === 'swim') {
    /* standing in the sea up to the waist, bobbing with the swell, hands trailing on the water */
    const sw = Math.sin(time * 1.3 + p.seed * 3); R.position.set(p.x, p.y + 0.04 * sw, p.z); R.rotation.set(0, p.yaw + 0.2 * Math.sin(time * 0.3 + p.seed), 0);
    b.armL.rotation.set(-0.35 - 0.1 * sw, 0, -0.75); b.armR.rotation.set(-0.35 + 0.1 * sw, 0, 0.75); b.elL.rotation.set(-0.5, 0, 0); b.elR.rotation.set(-0.5, 0, 0);
  } else if (ps === 'play' && p.jump) R.position.y = p.y + 0.18 * Math.sin(Math.min(1, (pfr(time * 0.45 + p.seed) - 0.86) / 0.14) * Math.PI);   /* a hop */
}
