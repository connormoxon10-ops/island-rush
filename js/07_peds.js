/* ================= PEDESTRIANS =================
   Walkers roam the town sidewalks on a corner graph (4 sidewalk corners per intersection, joined by sidewalk edges and
   crosswalks). Bodies are 10 InstancedMeshes (one draw each) animated on the CPU with a small joint hierarchy.
   Traffic stops for people on a crossing, people wait for gaps, dodge a fast car, and get bowled over (then get up) if hit. */
const Peds = { list: [], mesh: {}, group: null, spawnT: 0, hitCool: 0, ready: false, cap: 60 };
const PED_OFF = 7.9;
const PSKIN = [0xf3cfb3, 0xe8b894, 0xd29a6a, 0xb07a4f, 0x8a5a3a, 0x5e3b27].map(lc);
const PSHIRT = [0xc0392b, 0x2e6fa8, 0x3d8b5b, 0xe0b43a, 0xece9e0, 0x2b2f36, 0x8e5ba8, 0xe07a2f, 0x5aa6a6, 0xa9a9a0, 0xd96b8c, 0x4b5d3a, 0x1f3a5f, 0x7a1f2b].map(lc);
const PPANTS = [0x23262d, 0x3a4a63, 0x5b5348, 0x7a6a50, 0x2f3f2f, 0x55565b, 0x1d3557, 0x8a8a84].map(lc);
const PHAIR = [0x1b1511, 0x2e2018, 0x4a3524, 0x7a5a30, 0xb08a4a, 0x9a9a98, 0x0d0d0d, 0x6a3a22].map(lc);
const PSHOE = [0x15151a, 0x2a1d14, 0xe6e6e6, 0x3a3f4a, 0x7a2a22].map(lc);
const _pw = new THREE.Color(1, 1, 1), _pc = new THREE.Color();
const _pM = new THREE.Matrix4(), _pR = new THREE.Matrix4(), _pH = new THREE.Matrix4(), _pT = new THREE.Matrix4(), _pU = new THREE.Matrix4(), _pF = new THREE.Matrix4(), _pZ = new THREE.Matrix4().makeScale(0, 0, 0);
const _pE = new THREE.Euler(), _pQ = new THREE.Quaternion(), _pV = new THREE.Vector3(), _pS = new THREE.Vector3();
const _pr = { x: 0, z: 0 };

function initPeds() {
  const B = Body.init();
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.84, metalness: 0, vertexColors: true });
  const g = Peds.group = new THREE.Group(), cap = (Peds.cap + 2) * 2;
  const white = (geo) => { if (!geo.attributes.color) geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3).fill(1), 3)); return geo; };
  const hmat = new THREE.MeshStandardMaterial({ roughness: 0.58, metalness: 0, vertexColors: true });
  const mk = (name, geo, shadow, mt) => {
    const m = new THREE.InstancedMesh(white(geo), mt || mat, cap); m.frustumCulled = false; m.castShadow = !!shadow; m.receiveShadow = false;
    m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.setColorAt(0, _pw); m.instanceColor.setUsage(THREE.DynamicDrawUsage);
    m.count = 0; m.visible = false; g.add(m); Peds.mesh[name] = { m, n: 0 };
  };
  /* every part is its own InstancedMesh, filled each frame with only the people who have it (compacted slots, one draw call per part) */
  mk('head', B.head, true); mk('eyes', B.eyes); mk('brow', B.brow);
  for (const k in B.hairH) { mk('h_' + k, B.hairH[k], true, hmat); B.hairT[k].forEach((tl, i) => mk('ht_' + k + i, tl.geo, true, hmat)); }
  mk('beard', B.beard);
  mk('torsoM', B.torsoM, true); mk('torsoF', B.torsoF, true); mk('torsoC', B.torsoC, true); mk('hips', B.hips, true); mk('skirt', B.skirt, true);
  mk('thigh', B.thigh, true); mk('shin', B.shin, true); mk('foot', B.foot, true);
  mk('uarm', B.uarm, true); mk('uarm2', B.uarm2, true); mk('farm', B.farm, true); mk('hand', B.hand);
  mk('bag', B.bag, true);
  mk('hdome', new THREE.SphereGeometry(0.12, 12, 8, 0, TAU, 0, Math.PI * 0.55), true); mk('hbrim', new THREE.CylinderGeometry(0.6, 1, 0.05, 20));
  mk('gls', B.gls); mk('lens', B.lens);
  Peds.ready = true;
}

/* ---------- sidewalk graph ---------- */
function pedNodePos(T, n, p, out) { out.x = T.x0 + n.i * T.cell + n.sx * PED_OFF + p.jx; out.z = T.z0 + n.j * T.cell + n.sz * PED_OFF + p.jz; }
function pedEdges(T, n) {
  const N = T.N, r = [], j2 = n.j + n.sz, i2 = n.i + n.sx;
  r.push({ i: n.i, j: n.j, sx: -n.sx, sz: n.sz, cross: 1 }, { i: n.i, j: n.j, sx: n.sx, sz: -n.sz, cross: 1 });
  if (j2 >= 0 && j2 <= N) r.push({ i: n.i, j: j2, sx: n.sx, sz: -n.sz, cross: 0 });
  if (i2 >= 0 && i2 <= N) r.push({ i: i2, j: n.j, sx: -n.sx, sz: n.sz, cross: 0 });
  return r;
}
function distSeg(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz; let t = l2 > 0 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - ax - dx * t, pz - az - dz * t);
}
/* is the crosswalk (a to b) free of moving or parked vehicles over the next few seconds? */
function pedCrossClear(ax, az, bx, bz) {
  const test = (x, z, vx, vz) => {
    if (Math.abs(x - ax) > 60 && Math.abs(z - az) > 60) return true;
    const sp = Math.hypot(vx, vz);
    if (sp < 0.4) return distSeg(x, z, ax, az, bx, bz) > 3.4;
    for (let t = 0; t <= 3.2; t += 0.8) if (distSeg(x + vx * t, z + vz * t, ax, az, bx, bz) < 3.6) return false;
    return true;
  };
  if (!test(car.x, car.z, car.vx, car.vz)) return false;
  for (const d of Dyn.list) if (!test(d.x, d.z, d.vx, d.vz)) return false;
  return true;
}

function pedPickEdge(p) {
  const T = p.T, edges = pedEdges(T, p.a); let best = null, tot = 0;
  for (const e of edges) { if (p.prev && e.i === p.prev.i && e.j === p.prev.j && e.sx === p.prev.sx && e.sz === p.prev.sz) continue; e.w = e.cross ? 0.75 : 1.4; tot += e.w; }
  let r = Math.random() * tot;
  for (const e of edges) { if (e.w == null) continue; r -= e.w; if (r <= 0) { best = e; break; } }
  if (!best) best = edges.find((e) => e.w != null) || edges[0];
  return best;
}
function pedNext(p) {
  const e = pedPickEdge(p);
  p.next = e; p.crossing = !!e.cross; p.state = 'walk'; p.wait = 0;
  pedNodePos(p.T, e, p, _pr); p.tx = _pr.x; p.tz = _pr.z;
  if (e.cross) {
    pedNodePos(p.T, p.a, p, _pr); p.cax = _pr.x; p.caz = _pr.z;
    if (!pedCrossClear(p.cax, p.caz, p.tx, p.tz)) { p.state = 'wait'; p.wait = 0; }
  } else if (Math.random() < 0.09) { p.state = 'stand'; p.wait = 1.5 + Math.random() * 4; p.phone = Math.random() < 0.6; }
}
function pedArrive(p) {
  p.prev = p.a; p.a = p.next; p.crossing = false; p.onRoad = false; pedNext(p);
}
function pedLook() { /* colours are written per frame in writePed (parts are compacted per frame) */ }
const PGLASS = new THREE.Color(0.02, 0.02, 0.026);
/* hats: dome sphere + brim disc, positions in head space */
const HAT = {
  cap: { y: 0.125, z: -0.004, rx: -0.12, sx: 1.03, sy: 1.0, sz: 1.1, br: [0.078, 0.062], by: 0.168, bz: 0.104 },
  beanie: { y: 0.11, z: 0, rx: -0.05, sx: 1.08, sy: 1.22, sz: 1.12 },
  hard: { y: 0.125, z: 0, rx: 0, sx: 1.06, sy: 1.08, sz: 1.12, br: [0.1, 0.09], by: 0.15, bz: 0.092 },
  straw: { y: 0.135, z: 0, rx: 0, sx: 1.0, sy: 0.72, sz: 1.06, br: [0.24, 0.24], by: 0.158, bz: 0 },
  cowboy: { y: 0.142, z: 0, rx: 0, sx: 0.98, sy: 0.88, sz: 1.04, br: [0.215, 0.2], by: 0.158, bz: 0.01 },
  top: { y: 0.15, z: 0, rx: 0, sx: 0.9, sy: 1.5, sz: 0.95, br: [0.17, 0.17], by: 0.158, bz: 0 }
};
let _RL = null;
function pedRegionLook(p) {
  const a = p.app, T = p.T, ri = T ? towns.indexOf(T) : -1; if (ri < 0) return; const key = REG[ri % REG.length].key, r = Math.random;
  if (!_RL) { const f = (arr) => arr.map(lc); _RL = {
    hv: f([0xf08a1c, 0xe8d21c, 0xf2f2f2, 0xd8d8d0]), work: f([0x3a4a63, 0x4a5058, 0x6a5a48, 0x2b2f36]), hardc: f([0xe8d21c, 0xf08a1c, 0xf2f2f2, 0xd33a2a]),
    dsh: f([0xe6dcc0, 0xd9c49a, 0xf0ece0, 0xc9a574, 0x9a7a4a, 0xb4452b]), dpa: f([0x8a7a5a, 0xb09a72, 0x5b5348, 0x6a5a40]), straw: f([0xd9c27a, 0xe8d49a, 0xc9a85a]), cow: f([0x6a4a2c, 0x3a2a1c, 0xc9a574, 0x8a5a38]),
    fsh: f([0xb4452b, 0x3d6b3a, 0xc9a574, 0x2e5a8a, 0xd9c38a, 0x8a3a2b]), fpa: f([0x3a4a63, 0x4a5a78, 0x6a5a48]), capc: f([0x3d6b3a, 0xb4452b, 0x2e5a8a, 0xd8d8d0, 0x2b2f36]),
    bsh: f([0x2fc4c0, 0xff7a6a, 0xf5d04a, 0xf5f0e6, 0xff5a9a, 0x5ac26a, 0x8a5be0]), spa: f([0xf0e6d0, 0x2e6fa8, 0xf5f0e6, 0xe9b44a]), sun: f([0xf5ecd0, 0xff9a8a, 0xf5f0e6, 0x2fc4c0]),
    ajk: f([0xd33a2a, 0x2e6fa8, 0xf2f2f2, 0xf0a21c, 0x2a2f36, 0x3d8b5b, 0xe0e4ea]), apa: f([0x23262d, 0x2f3b4f, 0x4a4f5a]), bea: f([0xd33a2a, 0x2e6fa8, 0xf2f2f2, 0x2a2f36, 0xf0a21c, 0x7a2f8a]),
    lfl: f([0xb4452b, 0x3d6b3a, 0x2e5a8a, 0x6a4a2c, 0x3a3f3a, 0x8a3a2b]), lpa: f([0x3a4a63, 0x4a5058, 0x5b5348, 0x2f3f2f]), lcap: f([0x3d6b3a, 0x2b2f36, 0x6a4a2c, 0xb4452b]),
    cs: f([0x1f2430, 0x2a2f3a, 0x38404f, 0x16181d, 0x4a4f5a, 0x6a7280]), cw: f([0xf2f2f2, 0xdfe6ee, 0xc9d8e8]), cpa: f([0x1d1f26, 0x2a2f3a, 0x38404f]), cpt: f([0xf0d9c9, 0xd9e6f0, 0xf4f4f4, 0xff8a7a, 0xcfe0ff]) }; }
  const R = _RL, pk = (arr) => arr[(r() * arr.length) | 0], hat = (k, arr, bc) => { a.hat = { k, c: pk(arr), bc: bc || null }; };
  a.hat = null; a.glasses = false; a.shorts = false; a.glassC = null;
  if (key === 'harbor') { if (r() < 0.65) a.shirt = pk(R.hv); a.pants = pk(R.work); a.sleeve = true; if (r() < 0.38) hat('hard', R.hardc); else if (r() < 0.2) hat('cap', R.capc); }
  else if (key === 'desert') { a.shirt = pk(R.dsh); a.pants = pk(R.dpa); if (r() < 0.45) hat(r() < 0.5 ? 'straw' : 'cowboy', r() < 0.5 ? R.straw : R.cow); a.glasses = r() < 0.4; a.sleeve = r() < 0.6; }
  else if (key === 'farm') { a.shirt = pk(R.fsh); a.pants = pk(R.fpa); a.sleeve = true; if (r() < 0.4) { if (r() < 0.5) hat('cowboy', R.cow); else hat('cap', R.capc); } }
  else if (key === 'tropic') { a.shirt = pk(R.bsh); a.sleeve = r() < 0.25; a.shorts = r() < 0.6; a.pants = a.shorts ? pk(R.spa) : a.pants; a.glasses = r() < 0.5; if (r() < 0.3) hat('straw', R.sun); a.shoe = PSHOE[2]; }
  else if (key === 'alpine') { a.shirt = pk(R.ajk); a.pants = pk(R.apa); a.sleeve = true; if (r() < 0.55) hat('beanie', R.bea); a.glasses = r() < 0.25; a.glassC = a.glasses ? lc(0xff9a2a) : null; }
  else if (key === 'lake') { a.shirt = pk(R.lfl); a.pants = pk(R.lpa); a.sleeve = true; if (r() < 0.3) { if (r() < 0.5) hat('beanie', R.bea); else hat('cap', R.lcap); } }
  else if (key === 'city') { const suit = r() < 0.55; if (suit) { a.shirt = pk(R.cs); a.pants = a.shirt; a.sleeve = true; } else { a.shirt = pk(R.cpt); a.pants = pk(R.cpa); } a.glasses = r() < 0.3; a.shoe = PSHOE[0]; a.bag = !a.kid && r() < 0.4; }
  if (a.kid) { a.hat = a.hat && a.hat.k !== 'hard' ? a.hat : null; a.glasses = false; }
  if (a.old && !a.kid && r() < 0.3) a.glasses = true;
  if (a.skirt) a.shorts = false;
  if (key === 'tropic' || key === 'desert') a.sun = r() < 0.6;
}
const PHAIR_GREY = [0x9a9a98, 0xb8b8b4, 0xd0d0cc].map(lc);
function pedRandomLook() {
  const R = Math.random, r = (a) => a[(R() * a.length) | 0];
  const kid = R() < 0.09, old = !kid && R() < 0.13, fem = R() < 0.5, grey = old && R() < 0.7;
  let hst, t = R();
  if (kid) hst = t < 0.4 ? 'short' : t < 0.7 ? 'pony' : t < 0.88 ? 'curly' : 'long';
  else if (fem) hst = t < 0.28 ? 'long' : t < 0.46 ? 'pony' : t < 0.58 ? 'bun' : t < 0.82 ? 'short' : 'curly';
  else hst = t < 0.5 ? 'short' : t < 0.64 ? 'buzz' : t < 0.76 ? 'curly' : t < 0.84 + (old ? 0.1 : 0) ? 'bald' : t < 0.93 ? 'long' : t < 0.97 ? 'pony' : 'bun';
  const a = {
    s: kid ? 0.62 + R() * 0.12 : fem ? 0.88 + R() * 0.1 : 0.94 + R() * 0.1, hs: kid ? 1.26 : 1, skin: r(PSKIN), hair: grey ? r(PHAIR_GREY) : r(PHAIR), shirt: r(PSHIRT), pants: r(PPANTS), shoe: r(PSHOE),
    sleeve: R() < 0.4, bag: !kid && R() < 0.3 || kid && R() < 0.5, bagc: r(PSHIRT), kid, stout: (fem ? 0.9 : 0.94) + R() * (old ? 0.2 : 0.14),
    fem: !kid && fem || kid && R() < 0.5, hst, beard: !kid && !fem && hst !== 'bald' && R() < (old ? 0.34 : 0.2) || (!kid && !fem && hst === 'bald' && R() < 0.3), old,
    skirt: 0, tights: R() < 0.4, coat: !kid && R() < 0.13, shorts: false, glasses: !kid && R() < (old ? 0.38 : 0.1), glassC: null, sun: R() < 0.3, hat: null
  };
  if (a.fem && !kid && R() < 0.36) { a.skirt = R() < 0.4 ? 2 : 1; a.coat = false; if (a.skirt === 2) a.shirt = r(PSHIRT); }
  if (kid && a.fem && R() < 0.45) a.skirt = 1;
  if (a.coat) a.sleeve = true;
  return a;
}

/* ---------- spawning ---------- */
const _pf = { x: 0, z: 0 };
function pedFocus() { if (devOn('free')) { _pf.x = Dev.fx; _pf.z = Dev.fz; } else { _pf.x = Pl.x; _pf.z = Pl.z; } return _pf; }
function pedInView(x, z) {
  const dx = x - camera.position.x, dz = z - camera.position.z, d = Math.hypot(dx, dz); if (d < 4) return true;
  const fx = -Math.sin(camera.rotation.y), fz = -Math.cos(camera.rotation.y); return (dx * fx + dz * fz) / d > 0.35 && d < 125;
}
function pedPlace(p, initial) {
  const f = pedFocus();
  for (let tries = 0; tries < 16; tries++) {
    let T = null, bd = 1e9;
    for (const t of towns) { const d = Math.max(Math.abs(f.x - t.cx), Math.abs(f.z - t.cz)) - t.half; if (d < 150 && d < bd) { bd = d; T = t; } }
    if (!T) return false;
    const N = T.N, fi = (f.x - T.x0) / T.cell, fj = (f.z - T.z0) / T.cell;
    const i = clamp(Math.round(fi + (Math.random() - 0.5) * 3.6), 0, N), j = clamp(Math.round(fj + (Math.random() - 0.5) * 3.6), 0, N);
    const a = { i, j, sx: Math.random() < 0.5 ? -1 : 1, sz: Math.random() < 0.5 ? -1 : 1 };
    const walk = pedEdges(T, a).filter((e) => !e.cross), e = walk.length && Math.random() < 0.85 ? walk[(Math.random() * walk.length) | 0] : pedEdges(T, a)[0];
    p.jx = (Math.random() - 0.5) * 0.7; p.jz = (Math.random() - 0.5) * 0.7;
    pedNodePos(T, a, p, _pr); const ax = _pr.x, az = _pr.z; pedNodePos(T, e, p, _pr);
    const t = Math.random(), x = ax + (_pr.x - ax) * t, z = az + (_pr.z - az) * t, d = Math.hypot(x - f.x, z - f.z);
    if (d < (initial ? 12 : 30) || d > (initial ? 135 : 140)) continue;
    if (!initial && pedInView(x, z)) continue;
    p.T = T; p.a = a; p.prev = null; p.x = x; p.z = z; p.y = T.baseH + 0.1; p.next = e; p.crossing = false; p.onRoad = false;
    pedNext(p); if (p.state === 'wait') { p.state = 'walk'; } p.yaw = Math.atan2(p.tx - p.x, p.tz - p.z);
    return true;
  }
  return false;
}
function pedSpawn(initial) {
  const p = { app: pedRandomLook(), x: 0, z: 0, y: 0, yaw: 0, v: 0, vt: 1.15 + Math.random() * 0.5, ph: Math.random() * TAU, state: 'walk', wait: 0, tilt: 0, jx: 0, jz: 0, t: 0, vx: 0, vz: 0, vy: 0, spin: 0, phone: false, runner: Math.random() < 0.07, onRoad: false, seed: Math.random() * 20, fleeT: 0 };
  if (p.runner) p.vt = 2.7 + Math.random() * 0.8;
  if (p.app.old) { p.runner = false; p.vt = 0.85 + Math.random() * 0.25; }
  p.pw = !p.app.kid && !p.runner && Math.random() < 0.07;
  if (!pedPlace(p, initial)) return false;
  pedRegionLook(p); Rel.adopt(p); Peds.list.push(p); return true;
}
function pedRespawn(p, i) {
  Fight.clear(p); Rel.release(p); p.pers = null; p.reg = null; p.wave = 0; p.gz = p.gp = 0; p.app = pedRandomLook(); p.runner = Math.random() < 0.07; p.vt = p.runner ? 2.7 + Math.random() * 0.8 : 1.15 + Math.random() * 0.5;
  if (p.app.old) { p.runner = false; p.vt = 0.85 + Math.random() * 0.25; } p.pw = !p.app.kid && !p.runner && Math.random() < 0.07;
  p.state = 'walk'; p.tilt = 0; p.v = 0;
  if (pedPlace(p, false)) { pedRegionLook(p); Rel.adopt(p); return true; } p.state = 'gone'; return false;
}

/* ---------- behaviour ---------- */
const _pcp = [0, 0];
function pedHit(p, c) {
  if (p.cop) { if (Peds.hitCool <= 0) { Peds.hitCool = 1.6; Police.copRunOver(p, c); } return; }
  const k = clamp(Math.abs(c.speed) / 14, 0.3, 1.5); const was = p.called; Fight.clear(p); if (was) p.keep = true;
  p.state = 'down'; p.t = 0; p.air = true; p.vx = c.vx * 0.7 + (Math.random() - 0.5) * 2; p.vz = c.vz * 0.7 + (Math.random() - 0.5) * 2; p.vy = 2.6 + k * 2.6;
  p.spin = (Math.random() < 0.5 ? -1 : 1) * (4 + k * 3); p.tilt = 0; p.crossing = false; p.onRoad = false;
  if (Peds.hitCool <= 0) {
    Peds.hitCool = 1.6; Snd.crash(7 + k * 6); Cam.shake = Math.max(Cam.shake, 0.7); if (p.reg) Rel.hurt(p.reg.id, 35, 'you hit them with your car', 1800);
    if (!devOn('god')) { const sue = save.set.suits !== 'off'; const fee = sue ? 0 : Math.min(75, save.money); save.money -= fee; UI.toast('Careful! You hit a pedestrian' + (fee ? ' · fee ' + money(fee) : ''), 'bad'); if (sue) Court.file(p, c); if (Math.abs(c.speed) > 16 && Math.random() < 0.6) Wanted.crime('Hit and run', 1); } else UI.toast('Pedestrian hit', 'bad');
  }
}
function pedTrim(want) {
  const L = Peds.list; let mid = false;
  for (let i = L.length - 1; i >= 0 && L.length > want; i--) { if (L[i].keep) continue; Rel.release(L[i]); L.splice(i, 1); if (i < L.length) mid = true; }
  if (mid) L.forEach((p, i) => pedLook(p, i));
}
function pedReattach(p) {
  const T = p.T, i = clamp(Math.round((p.x - T.x0) / T.cell), 0, T.N), j = clamp(Math.round((p.z - T.z0) / T.cell), 0, T.N);
  p.a = { i, j, sx: p.x > T.x0 + i * T.cell ? 1 : -1, sz: p.z > T.z0 + j * T.cell ? 1 : -1 }; p.prev = null; p.crossing = false; p.onRoad = false; pedNext(p);
  if (p.state === 'wait') p.state = 'walk';
}
function updatePeds(dt) {
  if (!Peds.ready) return;
  const c = car, f = pedFocus(), setting = save.set.peds || 'high';
  Peds.hitCool -= dt; Peds.dt = dt;
  const want = Math.min(Peds.cap - 4, Math.round((Q.ped || 50) * (setting === 'off' ? 0 : setting === 'low' ? 0.4 : 1) * Biome.atm.peds));
  Peds.spawnT -= dt;
  if (Peds.list.length < want && Peds.spawnT <= 0) { for (let k = 0; k < 2 && Peds.list.length < want; k++) pedSpawn(false); Peds.spawnT = 0.12; }
  if (Peds.list.length > want) pedTrim(want);
  const cs = Math.sin(c.yaw), cc = Math.cos(c.yaw), sp = Math.abs(c.speed), hl = CUR.hl;
  let recycled = 0;
  for (let i = 0; i < Peds.list.length; i++) {
    const p = Peds.list[i];
    const dxf = p.x - f.x, dzf = p.z - f.z;
    if (p.state === 'gone' || (dxf * dxf + dzf * dzf > 165 * 165 && !p.keep)) { if (recycled < 2 && Peds.spawnT <= 0.1) { recycled++; pedRespawn(p, i); } else if (p.state === 'gone') pedRespawn(p, i); if (p.state === 'gone') continue; }
    const dxc = p.x - c.x, dzc = p.z - c.z, dc2 = dxc * dxc + dzc * dzc;
    /* a fast car bearing down: run sideways out of its path */
    if ((p.state === 'walk' || p.state === 'stand' || p.state === 'wait') && sp > 5 && dc2 < 30 * 30) {
      const fwd = dxc * c.vx + dzc * c.vz, along = fwd / sp, lat = (dxc * cc - dzc * cs);
      if (along > -1 && along < 4 + sp * 0.9 && Math.abs(lat) < 2.4 + hl * 0.1) {
        p.state = 'flee'; p.fleeT = 1.3 + Math.random() * 0.4; const sg = Math.abs(lat) < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(lat);
        p.fx = cc * sg; p.fz = -cs * sg; p.crossing = false; p.onRoad = false; p.yaw = Math.atan2(p.fx, p.fz);
      }
    }
    let vTarget = 0;
    if (p.state === 'walk') {
      const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
      if (d < 0.45) { pedArrive(p); }
      else {
        vTarget = p.vt * (p.crossing ? 1.15 : 1); const want = Math.atan2(dx, dz); p.yaw += angDiff(p.yaw, want) * Math.min(1, dt * 7);
        if (p.crossing) { p.onRoad = d > 0.8 && distSeg(p.x, p.z, p.cax, p.caz, p.tx, p.tz) < 0.7 && Math.hypot(p.x - p.cax, p.z - p.caz) > 0.8; }
      }
    } else if (p.state === 'wait') {
      p.wait += dt; p.yaw += angDiff(p.yaw, Math.atan2(p.tx - p.x, p.tz - p.z)) * Math.min(1, dt * 5);
      if (pedCrossClear(p.cax, p.caz, p.tx, p.tz) || p.wait > 9) { p.state = 'walk'; }
    } else if (p.state === 'stand') {
      p.wait -= dt; if (p.wait <= 0) p.state = 'walk';
    } else if (p.state === 'talk') {
      p.yaw += angDiff(p.yaw, Math.atan2(Pl.x - p.x, Pl.z - p.z)) * Math.min(1, dt * 6);
    } else if (p.state === 'follow') {
      const tx = car.x + cc * 1.9, tz = car.z - cs * 1.9, dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz); p.yaw += angDiff(p.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 8); vTarget = d > 0.7 ? 1.9 : 0; p.crossing = false; p.onRoad = false;
    } else if (p.state === 'flee') {
      p.fleeT -= dt; p.x += p.fx * 3.9 * dt; p.z += p.fz * 3.9 * dt; vTarget = 3.9; if (p.fleeT <= 0) pedReattach(p);
    } else if (p.state === 'down') {
      p.t += dt;
      if (p.air) {
        p.x += p.vx * dt; p.z += p.vz * dt; p.y += p.vy * dt; p.vy -= 9.8 * dt; p.tilt += p.spin * dt;
        const g0 = p.T.baseH + 0.1; if (p.vy < 0 && p.y <= g0 + 0.12) { p.air = false; p.y = g0 + 0.12; p.vx *= 0.5; p.vz *= 0.5; p.lieT = p.tilt < 0 ? -1.5 : 1.5; p.tilt = p.lieT + Math.round((p.tilt - p.lieT) / TAU) * TAU; }
      } else {
        const k = Math.exp(-3.2 * dt); p.vx *= k; p.vz *= k; p.x += p.vx * dt; p.z += p.vz * dt;
        p.tilt += (p.lieT - p.tilt) * Math.min(1, dt * 9);
        if (p.t > 4.2) { p.state = 'rise'; p.t = 0; }
      }
    } else if (p.state === 'rise') {
      p.t += dt; p.tilt += (0 - p.tilt) * Math.min(1, dt * 4.5); p.y += ((p.T.baseH + 0.1) - p.y) * Math.min(1, dt * 6);
      if (p.t > 0.9 && p.report) { p.tilt = 0; p.y = p.T.baseH + 0.1; Fight.afterRise(p); }
      else if (p.t > 0.9) { p.tilt = 0; p.y = p.T.baseH + 0.1; p.fleeT = 2.2; p.state = 'flee'; const a = Math.atan2(p.x - c.x, p.z - c.z); p.fx = Math.sin(a); p.fz = Math.cos(a); p.yaw = a; }
    } else if (p.own) { Fight.pedUpdate(p, dt); }
    /* blocking: slide round vehicles instead of walking through them */
    if (p.state !== 'down' && p.state !== 'rise') {
      if (dc2 < 36) {
        for (let k = 0; k < 3; k++) {
          const px = c.x + cs * CIRC[k][0], pz = c.z + cc * CIRC[k][0], ex = p.x - px, ez = p.z - pz, rr = CIRC[k][1] + 0.32, d2 = ex * ex + ez * ez;
          if (d2 < rr * rr) {
            const d = Math.sqrt(d2) || 0.01;
            if (sp > 2.2 && p.state !== 'flee' || sp > 6) { pedHit(p, c); break; }
            p.x += ex / d * (rr - d); p.z += ez / d * (rr - d);
          }
        }
      }
      if (p.state !== 'down') for (const d of Dyn.list) {
        const dx = p.x - d.x, dz = p.z - d.z; if (dx * dx + dz * dz > 25) continue;
        const ds = Math.sin(d.yaw), dco = Math.cos(d.yaw);
        for (let k = 0; k < 3; k++) { const qx = d.x + ds * _cs[k], qz = d.z + dco * _cs[k], ex = p.x - qx, ez = p.z - qz, rr = 1.25, d2 = ex * ex + ez * ez; if (d2 < rr * rr) { const dd = Math.sqrt(d2) || 0.01; p.x += ex / dd * (rr - dd); p.z += ez / dd * (rr - dd); } }
      }
    }
    if (p.state === 'walk' || p.state === 'flee' || p.state === 'follow') {
      p.v += (vTarget - p.v) * Math.min(1, dt * 6);
      if (p.state === 'walk' || p.state === 'follow') { p.x += Math.sin(p.yaw) * p.v * dt; p.z += Math.cos(p.yaw) * p.v * dt; }
    } else if (p.state !== 'down' && !p.own) p.v += (0 - p.v) * Math.min(1, dt * 8);
    if (p.state !== 'down' && p.state !== 'rise' && !p.own) p.y = p.T.baseH + (p.crossing && p.onRoad ? 0.12 : 0.09);
    if (p.wave > 0) p.wave -= dt;
    /* gait phase advances with distance covered */
    const cyc = 1.45 + Math.max(0, p.v - 1.4) * 0.55; p.ph += TAU * p.v / cyc * dt;
  }
  /* separate people who are walking into each other */
  const L = Peds.list;
  for (let i = 0; i < L.length; i++) { const a = L[i]; if (a.state !== 'walk' && a.state !== 'stand') continue; for (let j = i + 1; j < L.length; j++) { const b = L[j]; const dx = b.x - a.x, dz = b.z - a.z; if (dx * dx + dz * dz < 0.3 && (b.state === 'walk' || b.state === 'stand')) { const d = Math.sqrt(dx * dx + dz * dz) || 0.05, k = (0.55 - d) * 0.5; a.x -= dx / d * k; a.z -= dz / d * k; b.x += dx / d * k; b.z += dz / d * k; } } }
  if (Foot.on) for (const p of L) { if (p.state === 'down' || p.state === 'rise' || p.state === 'talk' || p.state === 'gone') continue; const dx = p.x - Foot.x, dz = p.z - Foot.z, d2 = dx * dx + dz * dz; if (d2 < 0.5 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (0.72 - d) * 0.6; p.x += dx / d * k; p.z += dz / d * k; } }
  writePeds(App.time);
}

/* ---------- pose + upload ---------- */
function relM(out, parent, x, y, z, rx, ry, rz, sc) {
  _pE.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _pQ.setFromEuler(_pE); _pU.compose(_pV.set(x, y, z), _pQ, _pS.set(sc || 1, sc || 1, sc || 1));
  return out.multiplyMatrices(parent, _pU);
}
function relMS(out, parent, x, y, z, rx, sx, sy, sz) {
  _pE.set(rx || 0, 0, 0, 'YXZ'); _pQ.setFromEuler(_pE); _pU.compose(_pV.set(x, y, z), _pQ, _pS.set(sx, sy, sz));
  return out.multiplyMatrices(parent, _pU);
}
const _pA = new THREE.Matrix4(), _pB = new THREE.Matrix4(), _pC = new THREE.Matrix4(), _pD = new THREE.Matrix4(), _pG = new THREE.Matrix4(), _pJ = new THREE.Matrix4();
function relMX(out, parent, x, y, z, rx, ry, rz, sx, sy, sz) {
  _pE.set(rx || 0, ry || 0, rz || 0, 'YXZ'); _pQ.setFromEuler(_pE); _pU.compose(_pV.set(x, y, z), _pQ, _pS.set(sx == null ? 1 : sx, sy == null ? 1 : sy, sz == null ? 1 : sz));
  return out.multiplyMatrices(parent, _pU);
}
const pfr = (x) => x - Math.floor(x);
function pput(name, M, col) { const o = Peds.mesh[name], k = o.n++; o.m.setMatrixAt(k, M); o.m.setColorAt(k, col); }
function writePeds(time) {
  const m = Peds.mesh, L = Peds.list, n = L.length, av = Foot.on && Foot.ped && !Bust.on ? 1 : 0, cx = camera.position.x, cz = camera.position.z;
  for (const k in m) m[k].n = 0;
  for (let i = 0; i < n; i++) { const p = L[i]; if (Bust.on && p.cop) continue; const dx = p.x - cx, dz = p.z - cz; writePed(p, time, false, dx * dx + dz * dz > 2400); }
  if (av) writePed(Foot.ped, time, !Foot.tp, false);
  for (const k in m) { const o = m[k]; o.m.count = o.n; o.m.visible = o.n > 0; if (o.n) { o.m.instanceMatrix.needsUpdate = true; o.m.instanceColor.needsUpdate = true; } }
}
/* one person: gait with pelvis sway / counter-rotating shoulders / heel-toe feet, breathing, weight shifts, idle habits, mood body language, eye contact */
function writePed(p, time, hideHead, far) {
  const a = p.app, s = a.s, st = p.state, sd = p.seed, dt = Peds.dt || 0.016, pers = p.pers, mood = pers ? pers.mood : '';
  _pE.set(p.tilt, p.yaw, 0, 'YXZ'); _pQ.setFromEuler(_pE); _pR.compose(_pV.set(p.x, p.y, p.z), _pQ, _pS.set(s * a.stout, s, s));
  const moving = st === 'walk' || st === 'flee' || st === 'follow' || st === 'chase' || st === 'fight';
  const wlk = moving ? clamp(p.v / 1.1, 0, 1) : 0, rn = moving ? clamp((p.v - 1.9) / 1.5, 0, 1) : 0, ph = p.ph, sp1 = Math.sin(ph), cp1 = Math.cos(ph);
  const sw = 0.7 + 0.8 * pfr(sd * 3.77), asw = 0.75 + 0.5 * pfr(sd * 7.13), slouch = 0.025 * pfr(sd * 5.1) + (a.old ? 0.1 : 0), old = a.old ? 0.8 : 1, down = st === 'down' || st === 'rise';
  const A = wlk * (0.4 + 0.38 * rn) * old, B = (0.5 + 0.7 * rn) * old, armA = wlk * (0.5 + 0.55 * rn) * asw * old, elb = 0.18 + wlk * (0.08 + 1.0 * rn);
  let lean = wlk * (0.04 + 0.2 * rn) + slouch * (0.4 + 0.6 * wlk), twist = 0, nod = 0, hx = 0, roll = 0, gyaw = 0, gpit = 0, hroll = 0, bounce = 0;
  const psi = 0.09 * wlk * (1 + 0.9 * rn) * sw;
  let hipYaw = psi * sp1, torYaw = -2.1 * psi * sp1;
  hx = 0.02 * sw * wlk * cp1 * (1 - 0.5 * rn); roll = 0.04 * sw * wlk * cp1;
  const kn = (c, s_) => (down ? 0 : wlk * (0.08 + B * Math.max(0, c) + 0.32 * Math.max(0, s_) * Math.max(0, -c))), toe = (c, s_) => wlk * 0.9 * Math.max(0, -s_) * Math.max(0, -c);
  let thL = A * sp1, thR = -thL, bnL = kn(cp1, sp1), bnR = kn(-cp1, -sp1), toL = toe(cp1, sp1), toR = toe(-cp1, -sp1);
  let aL = -armA * sp1, aR = armA * sp1, eL = elb + wlk * 0.45 * Math.max(0, -sp1) * armA, eR = elb + wlk * 0.45 * Math.max(0, sp1) * armA, spread = 0.05 + 0.02 * wlk, eyL = 0, eyR = 0, wrL = 0.12, wrR = 0.12;
  const still = st === 'stand' || st === 'wait' || st === 'talk' || st === 'accuse' || st === 'arrest' || (st === 'fight' && p.v < 0.8);
  if (still) {
    const br = Math.sin(time * 1.9 + sd), ws = Math.sin(time * 0.37 + sd * 2.1) * (st === 'talk' ? 0.6 : 1), wl = Math.max(0, ws), wr_ = Math.max(0, -ws);
    lean = 0.02 + br * 0.012 + slouch * 0.6; hipYaw = torYaw = 0; hx = 0.022 * ws; roll = 0.03 * ws; thL = 0.07 * wl; thR = 0.07 * wr_; bnL = 0.03 + 0.22 * wl; bnR = 0.03 + 0.22 * wr_; toL = toR = 0;
    aL = 0.04 + 0.03 * br; aR = 0.04 - 0.03 * br; eL = eR = 0.2 + 0.05 * br; spread = 0.06;
    if ((st === 'stand' || st === 'wait') && !p.phone) {
      /* idle habits: every ~10 s a different one fades in and out */
      const tt = time + sd * 37, slot = Math.floor(tt / 10), u = tt / 10 - slot, kind = Math.floor(pfr(Math.sin(slot * 12.9898 + sd * 78.233) * 43758.5453) * 8), e = sm01(clamp(Math.min(u / 0.12, (1 - u) / 0.15), 0, 1)), M2 = (c, t) => c + (t - c) * e;
      if (kind === 1) gyaw += 0.95 * Math.sin(u * TAU * 1.4) * e;
      else if (kind === 2) { aL = M2(aL, 0.95); eL = M2(eL, 2.0); nod = M2(nod, 0.3); wrL = M2(wrL, 0.5); }
      else if (kind === 3) { aL = M2(aL, 0.35); aR = M2(aR, 0.38); eL = M2(eL, 1.95); eR = M2(eR, 2.05); eyL = M2(eyL, 1.2); eyR = M2(eyR, -1.2); spread = M2(spread, 0.0); lean = M2(lean, 0.03); }
      else if (kind === 4) { aL = M2(aL, -0.3); aR = M2(aR, -0.3); eL = M2(eL, 0.65); eR = M2(eR, 0.65); eyL = M2(eyL, 0.55); eyR = M2(eyR, -0.55); spread = M2(spread, 0.08); }
      else if (kind === 5) { aR = M2(aR, -0.15); eR = M2(eR, 1.5); eyR = M2(eyR, -1.15); spread = M2(spread, 0.5); hx += 0.012 * e; }
      else if (kind === 6) { aR = M2(aR, 2.25); eR = M2(eR, 2.0 + 0.22 * Math.sin(time * 9)); spread = M2(spread, 0.25); hroll += 0.12 * e; }
      else if (kind === 7) { hroll += 0.16 * e * Math.sin(u * TAU * 0.8); gpit -= 0.22 * e; }
    }
    if (st === 'wait') { gyaw += 0.7 * Math.sin(time * 1.3 + sd) * 0.8; }
    if (st === 'talk') {
      const sp = p.spk || 0, g = 0.3 + 0.7 * sp, bt = Math.sin(time * 3.4 + sd);
      aR = 0.45 + g * 0.5 * (0.5 + 0.5 * Math.sin(time * 2.3 + sd)); eR = 1.05 + g * 0.45 * Math.sin(time * 3.1 + sd); aL = 0.1 + g * 0.32 * Math.max(0, Math.sin(time * 1.7 + sd * 2)); eL = 0.3 + g * 0.9 * Math.max(0, Math.sin(time * 1.7 + sd * 2)); nod = 0.03 + sp * 0.1 * bt; spread = 0.09 + g * 0.1; wrR = 0.2;
      if (mood === 'grumpy') { aL = 0.35; aR = 0.38; eL = 1.95; eR = 2.05; eyL = 1.2; eyR = -1.2; spread = 0; nod = -0.05 + sp * 0.05 * bt; gpit -= 0.06; }
      else if (mood === 'shy') { aL = 0.3; aR = 0.3; eL = 1.4; eR = 1.45; eyL = 0.95; eyR = -0.95; spread = 0.02; gpit += 0.22; gyaw += 0.25 * Math.sin(time * 0.6 + sd); lean = 0.05; hroll += 0.07; }
      else if (mood === 'busy') { aL = 0.9 * Math.max(0, Math.sin(time * 0.35 + sd)) ** 4; eL = 0.3 + 1.7 * Math.max(0, Math.sin(time * 0.35 + sd)) ** 4; thR = 0.12 * Math.max(0, Math.sin(time * 6)); bnR = 0.1; }
      else if (mood === 'sporty') { bounce = 0.012 * Math.abs(Math.sin(time * 5 + sd)); aL = 0.35 + 0.2 * Math.sin(time * 5 + sd); eL = 1.2; }
      else if (mood === 'dreamy') { gpit -= 0.24; hroll += 0.14; nod = 0; }
      else if (mood === 'kid') { bounce = 0.008 * Math.abs(Math.sin(time * 4 + sd)); hx = 0.035 * Math.sin(time * 1.3 + sd); }
      else if (mood === 'chatty') { aL = 0.55 + 0.4 * Math.sin(time * 3.7 + sd); eL = 0.9 + 0.5 * Math.sin(time * 4.3 + sd); }
    }
    else if (p.phone && st === 'stand') { aR = 0.95; eR = 1.55; nod = 0.38; lean = 0.07; aL = 0.0; wrR = 0.3; }
    else if (st === 'accuse') { if (!p.called) { aR = 0.95; eR = 1.55; nod = 0.3; lean = 0.05; aL = 1.45; eL = 0.12; wrR = 0.3; } else { aL = 1.5 + 0.1 * Math.sin(time * 9 + sd); eL = 0.1; aR = 0.9; eR = 1.5; nod = 0.12 * Math.sin(time * 7 + sd); lean = 0.08; } }
    else if (st === 'arrest') { aL = 0.18; aR = 0.18; eL = 0.7; eR = 0.7; lean = 0.03; }
    else if (st === 'fight') { aL = 0.5; aR = 0.5; eL = 1.75; eR = 1.75; lean = 0.1 + 0.03 * br; spread = 0.12; bnL = bnR = 0.22; thL = 0.18; thR = -0.1; }
  } else if (down) {
    const lie = st === 'down' ? clamp(p.t / 0.5, 0, 1) : 1 - clamp(p.t / 0.9, 0, 1), fl = p.air ? 1 : Math.exp(-p.t * 2) * 0.6;
    thL = (0.25 + 0.6 * Math.sin(time * 11 + sd) * fl) * lie; thR = (-0.35 + 0.6 * Math.sin(time * 9 + sd * 2) * fl) * lie; bnL = 0.5 * lie; bnR = 0.9 * lie; toL = toR = 0; hx = roll = hipYaw = torYaw = 0;
    aL = (1.0 + 0.9 * Math.sin(time * 12 + sd * 3) * fl) * lie; aR = (1.6 + 0.9 * Math.sin(time * 10 + sd) * fl) * lie; eL = 0.4 + 0.3 * lie; eR = 0.6 * lie; spread = 0.05 + 0.55 * lie; lean = 0; twist = 0;
  } else if (p.pw && st === 'walk') { aR = 0.95; eR = 1.55; nod = 0.34; lean += 0.05; wrR = 0.3; gpit += 0.1; }
  if (p.jump) { thL = 0.6; thR = -0.3; bnL = 1.0; bnR = 0.35; aL = 1.0; aR = 1.2; eL = 0.5; eR = 0.6; lean = 0.08; twist = 0; spread = 0.25; hipYaw = torYaw = roll = hx = 0; toL = toR = 0; }
  if (p.wave > 0 && !down) { aR = 2.75; eR = 0.35 + 0.5 * Math.sin(time * 10); eyR = 0; spread = 0.2; }
  if (p.pn > 0 && !down) {
    /* punch: rest -> guard -> strike -> hold -> back; the other fist stays up, the torso twists into it */
    const u = p.pn, sdd = p.hand ? 1 : 0, aP = sdd ? aR : aL, eP = sdd ? eR : eL;
    let a2, e2, ex = 0;
    if (u < 0.2) { const k = sm01(u / 0.2); a2 = lerp(aP, 0.35, k); e2 = lerp(eP, 1.9, k); }
    else if (u < 0.4) { const k = sm01((u - 0.2) / 0.2); a2 = lerp(0.35, 1.55, k); e2 = lerp(1.9, 0.1, k); ex = k; }
    else if (u < 0.55) { a2 = 1.55; e2 = 0.1; ex = 1; }
    else { const k = sm01((u - 0.55) / 0.45); a2 = lerp(1.55, aP, k); e2 = lerp(0.1, eP, k); ex = 1 - k; }
    const guard = sm01(Math.min(1, u / 0.2, (1 - u) / 0.3)), oa = lerp(sdd ? aL : aR, 0.45, guard), oe = lerp(sdd ? eL : eR, 1.8, guard);
    eyL = eyR = 0;
    if (sdd) { aR = a2; eR = e2; aL = oa; eL = oe; } else { aL = a2; eL = e2; aR = oa; eR = oe; }
    twist += (sdd ? -0.42 : 0.42) * ex; lean += 0.12 * ex; spread = Math.min(spread, 0.1);
  }
  /* eye contact: people near the player glance at them (regulars who know you always do) */
  if (!p.avatar && !far && !hideHead && !down) {
    let ty = 0, tp = 0;
    const dxp = Pl.x - p.x, dzp = Pl.z - p.z, d2 = dxp * dxp + dzp * dzp;
    if (st === 'talk') { ty = 0; }
    else if (d2 < 110 && d2 > 0.5) {
      const friend = p.reg && Rel.knows(p.reg.id), look = friend || (pfr(sd * 1.7) < 0.55 && pfr((time + sd * 13) / 6.5) < 0.55), rel = angDiff(p.yaw, Math.atan2(dxp, dzp));
      if (look && Math.abs(rel) < 2.0) { ty = clamp(rel, -1.0, 1.0); tp = -0.04; }
    }
    p.gz = (p.gz || 0) + (ty - (p.gz || 0)) * Math.min(1, dt * 5); p.gp = (p.gp || 0) + (tp - (p.gp || 0)) * Math.min(1, dt * 5);
    gyaw += p.gz; gpit += p.gp;
  }
  /* hips sit as low as the straightest leg allows, so feet plant on the ground */
  const dL = 0.43 * Math.cos(thL) + 0.43 * Math.cos(thL - bnL) + 0.076, dR = 0.43 * Math.cos(thR) + 0.43 * Math.cos(thR - bnR) + 0.076, yHip = Math.max(dL, dR) - 0.004 + bounce;
  const bre = 1 + 0.011 * Math.sin(time * 1.9 + sd * 1.3) * (1 - 0.5 * wlk);
  relMX(_pH, _pR, hx, yHip, 0, 0, hipYaw - twist * 0.5, roll, 1, 1, 1);
  relMX(_pT, _pH, -hx * 0.4, 0.085, 0, lean, torYaw + twist, -roll * 0.6, bre, 1, bre);
  const sk = a.skin, hasSk = a.skirt > 0;
  pput(a.coat ? 'torsoC' : a.fem ? 'torsoF' : 'torsoM', _pT, a.shirt);
  pput('hips', _pH, a.skirt === 2 ? a.shirt : a.pants);
  if (hasSk) pput('skirt', _pH, a.skirt === 2 ? a.shirt : a.pants);
  if (a.bag) pput('bag', _pT, a.bagc);
  /* head */
  if (!hideHead) {
    const hy = gyaw - (hipYaw + torYaw + twist * 0.5) * 0.85;
    relMX(_pF, _pT, 0, 0.545, 0.004, nod - lean * 0.7 + gpit, hy, hroll - roll * 0.3, a.hs, a.hs, a.hs);
    pput('head', _pF, sk);
    if (!far) { pput('eyes', _pF, _pw); pput('brow', _pF, a.hair); }
    const hs = a.hat && HAT[a.hat.k], hst = a.hst || 'short';
    if (hs) {
      if (hst !== 'bald') pput((hst === 'curly' || hst === 'bun' || hst === 'buzz' || hst === 'short') ? 'h_rim' : 'h_' + hst, _pF, a.hair);
      relMS(_pM, _pF, 0, hs.y + 0.004, hs.z, hs.rx, hs.sx * 0.95, hs.sy * 1.14, hs.sz * 0.95); pput('hdome', _pM, a.hat.c);
      if (hs.br) { relMS(_pM, _pF, 0, hs.by - 0.012, hs.bz, 0, hs.br[0], 1, hs.br[1]); pput('hbrim', _pM, a.hat.bc || a.hat.c); }
    } else if (hst !== 'bald') pput('h_' + hst, _pF, a.hair);
    { const TL = Body.G.hairT[hst]; if (hst !== 'bald' && TL && TL.length) { let par = _pF; for (let ti = 0; ti < TL.length; ti++) { relMX(ti ? _pA : _pB, par, TL[ti].pv[0], TL[ti].pv[1], TL[ti].pv[2], 0, 0, 0, 1, 1, 1); par = ti ? _pA : _pB; pput('ht_' + hst + ti, par, a.hair); } } }
    if (a.beard && !far) pput('beard', _pF, a.hair);
    if (a.glasses && !far) { pput('gls', _pF, a.glassC || PGLASS); if (a.glassC || a.sun) pput('lens', _pF, a.glassC || PGLASS); }
  }
  const shx = a.fem ? 0.18 : 0.198, slv = a.sleeve || a.coat ? a.shirt : sk, legSk = hasSk && !a.tights || a.shorts;
  for (let sdd = 0; sdd < 2; sdd++) {
    const sg = sdd ? 1 : -1, th = sdd ? thR : thL, bn = sdd ? bnR : bnL, ar = sdd ? aR : aL, el = sdd ? eR : eL, ey = sdd ? eyR : eyL, wr = sdd ? wrR : wrL, tz = sdd ? toR : toL;
    relMX(_pA, _pT, sg * shx, 0.46, 0, -ar, 0, sg * spread, 1, 1, 1); pput('uarm', _pA, a.shirt); pput('uarm2', _pA, slv);
    relMX(_pB, _pA, 0, -0.31, 0, -el, ey, 0, 1, 1, 1); pput('farm', _pB, slv);
    if (!far) { relMX(_pJ, _pB, 0, -0.3, 0, -wr, 0, sg * 0.04, 1, 1, 1); pput('hand', _pJ, sk); }
    relMX(_pC, _pH, sg * 0.098, -0.02, 0, -th, 0, sg * 0.03, 1, 1, 1); pput('thigh', _pC, hasSk && !a.tights ? sk : a.pants);
    relMX(_pD, _pC, 0, -0.43, 0, bn, 0, 0, 1, 1, 1); pput('shin', _pD, legSk ? sk : a.pants);
    relMX(_pG, _pD, 0, -0.43, 0, (th - bn) * 0.9 + tz * 0.6, sg * 0.1, 0, 1, 1, 1); pput('foot', _pG, a.shoe);
  }
}
