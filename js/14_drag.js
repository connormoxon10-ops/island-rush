/* ================= DRAG STRIP =================
   "Saltmarsh Dragway": a quarter-mile (402.34 m) two-lane strip you reach from the race office (E, then Drag strip). You bring your own car, upgrades and all.
   Like the rally stage it is its own little world at a far-off origin: while Drag.on is set, groundAt() answers with the strip's flat tarmac, collideStatic() asks
   Drag.collide for the walls, the physics sub-step runs the rival through the same stepCar(), and the island stops updating.
   A run: both cars are held at the line (STAGED), then after a random pause the tree drops three ambers half a second apart and then green. Your car is NOT held once
   the tree starts: roll through the start beam before green and you red-light and lose. Reaction time is green to leaving the beam, elapsed time is beam to the finish
   line, and the first car across the line wins. The rival drives a copy of your own car (same mass, gearing, tyres and upgrades) with its power scaled by the bracket
   you pick, launches after its own reaction time and, in the upper brackets, uses nitro from the same size of tank as yours. */
const DG = { X0: -7000, Z0: 7000, Y: 20, LEN: 402.336, LANE: 3.5, HW: 9.4, BACK: 70, END: 830, TRAP: 90 };
const DG_TIERS = [
  { n: 'Street', pw: 0.93, gr: 0.98, rt: [0.3, 0.3], nit: false, prize: 350 },
  { n: 'Pro', pw: 1.0, gr: 1.0, rt: [0.16, 0.2], nit: true, prize: 800 },
  { n: 'Outlaw', pw: 1.07, gr: 1.03, rt: [0.08, 0.12], nit: true, prize: 1800 },
  { n: 'Legend', pw: 1.14, gr: 1.06, rt: [0.02, 0.07], nit: true, prize: 4000 }
];
const DG_NAMES = ['"Nitro" Nell Ortega', 'Buck Sandoval', 'Marisol Quade', 'Duke Harlan', 'Kit "Redlight" Moreau', 'Ada Brightwater'];
const Drag = { on: false, lobby: false, loading: false, phase: 'off', t: 0, tier: 1, hidden: [], saved: null, rival: null, el: null, group: null, lamps: null, hudT: 0, clock: 0, tGreen: 0, treeT: 0, lit: -1 };
const _dgG = { h: 0 };

Drag.rec = function () { const d = save.drag || (save.drag = {}); if (!d.best || typeof d.best !== 'object') d.best = {}; for (const k of ['runs', 'wins', 'earned', 'bestRt']) d[k] = +d[k] || 0; d.tier = clamp(d.tier == null ? 1 : d.tier | 0, 0, DG_TIERS.length - 1); return d; };

/* ---------------- physics hooks ---------------- */
Drag.ground = function (x, z, o) {
  const dz = z - DG.Z0, dx = Math.abs(x - DG.X0);
  o.h = DG.Y; o.water = false; o.loose = 0;
  if (dx < DG.HW && dz > DG.END) { o.mu = 0.55; o.rr = 0.32; o.rough = 0.3; o.road = false; return; }                 /* the sand trap at the far end */
  if (dx < DG.HW) { const prep = dz > -12 && dz < 110 && dx < DG.LANE * 2 ? 0.08 : 0; o.mu = 1.02 + prep; o.rr = 0.013; o.rough = 0.008; o.road = true; return; }   /* the launch pad is sticky with rubber */
  o.mu = 0.7; o.rr = 0.06; o.rough = 0.2; o.road = false;
};
Drag.collide = function (c, px, pz, R, P) {
  const lx = px - DG.X0, lz = pz - DG.Z0, w = DG.HW - 0.35;
  if (lx > w - R) contact(c, px, pz, -1, 0, lx - (w - R), 0, 0, P); else if (lx < -(w - R)) contact(c, px, pz, 1, 0, -(w - R) - lx, 0, 0, P);
  if (lz < -DG.BACK + R) contact(c, px, pz, 0, 1, -DG.BACK + R - lz, 0, 0, P); else if (lz > DG.END + DG.TRAP - R) contact(c, px, pz, 0, -1, lz - (DG.END + DG.TRAP - R), 0, 0, P);
};
/* one timing lane: where the nose is, and the moments it left the start beam and crossed each mark (interpolated inside the sub-step) */
function dgLane() { return { z0: 0, zPrev: 0, tBeam: -1, t60: -1, t8: -1, tFin: -1, vFin: 0, v8: 0, foul: false }; }
function dgTrack(L, c, noseOff, t0, h) {
  const z = c.z + Math.cos(c.yaw) * noseOff - DG.Z0, zp = L.zPrev; L.zPrev = z; if (!(z > zp)) return;
  const at = (m) => t0 + h * (m - zp) / (z - zp);
  if (L.tBeam < 0 && zp < 0 && z >= 0) { L.tBeam = at(0); if (Drag.phase !== 'run' || L.tBeam < Drag.tGreen) L.foul = true; }
  if (L.tBeam < 0) return;
  if (L.t60 < 0 && z >= 18.288) L.t60 = at(18.288);
  if (L.t8 < 0 && z >= DG.LEN / 2) { L.t8 = at(DG.LEN / 2); L.v8 = Math.abs(c.speed); }
  if (L.tFin < 0 && z >= DG.LEN) { L.tFin = at(DG.LEN); L.vFin = Math.abs(c.speed); }
}
Drag.sub = function (c, h) {
  const b = Drag.rival, t0 = Drag.clock; Drag.clock += h;
  if (Drag.phase === 'tree' || Drag.phase === 'run' || Drag.phase === 'done') dgTrack(Drag.me, c, CARP.a, t0, h);
  if (!b) return;
  Drag.think(b, h); stepCar(h, b.c, b.P, b.T, b.circ);
  if (Drag.phase === 'tree' || Drag.phase === 'run' || Drag.phase === 'done') dgTrack(b.lane, b.c, b.P.a, t0, h);
  const sl = Bots.list, so = Bots.on; Bots.list = Drag.field; Bots.on = true; Crash.run(c); Bots.list = sl; Bots.on = so;
};
/* the rival: holds its lane, launches its own reaction time after green, lights the nitro once it is hooked up, brakes after the line */
Drag.think = function (b, h) {
  const c = b.c; c.crashFlag = 0;
  if (Drag.phase === 'stage' || Drag.phase === 'tree' || (Drag.phase === 'run' && Drag.clock < Drag.tGreen + b.rt)) { c.thr = 0; c.brk = 1; c.hand = 1; c.steer = 0; c.nit = false; return; }
  const spd = Math.abs(c.speed), done = b.lane.tFin >= 0;
  const al = wrapPi(Math.atan2(b.x0 - c.x, 22 + spd * 0.4) - c.yaw), maxS = clamp(1.5 * G * b.P.L / Math.max(spd * spd, 1) + 0.05, 0.07, 0.56);
  c.steerIn = clamp(al / maxS * 1.2, -1, 1); c.steer = approach(c.steer, c.steerIn, 8 * h); c.hand = 0;
  if (done) { c.thr = 0; c.brk = spd > 2 ? 0.75 : 0; c.nit = false; if (spd < 2) c.hand = 1; }
  else { c.thr = 1; c.brk = 0; c.nit = b.nit && Drag.clock > Drag.tGreen + b.rt + 0.9 && c.nitro > 0; }
  if (c.nitroUse) c.nitro = Math.max(0, c.nitro - (b.P.nitDrain || 24) * h);
};

/* ---------------- the place ---------------- */
function dgTex(w, h, draw, rx, ry) { const cv = mkCanvas(w, h); draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso; if (rx) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); } return t; }
Drag.build = function () {
  if (Drag.group) return; const g = Drag.group = new THREE.Group(); g.name = 'drag'; g.position.set(DG.X0, DG.Y, DG.Z0);
  const rnd = mulberry32(4021), std = (o) => new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o));
  const add = (geo, mat, x, y, z, shadow) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; m.castShadow = !!shadow; g.add(m); return m; };
  const flat = (w, l, mat, x, y, z) => { const m = add(new THREE.PlaneGeometry(w, l), mat, x, y, z); m.rotation.x = -Math.PI / 2; return m; };
  const L0 = -DG.BACK, L1 = DG.END, len = L1 - L0, mid = (L0 + L1) / 2;
  /* the land around: flat salt-marsh grass out to the haze */
  flat(3600, 3600, std({ map: dgTex(256, 256, (x, w, h) => { x.fillStyle = '#6f7a43'; x.fillRect(0, 0, w, h); for (let i = 0; i < 2600; i++) { x.fillStyle = ['#5f6b38', '#7d8750', '#8a8a58', '#566233'][i & 3]; x.globalAlpha = 0.5; x.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 5, 1 + rnd() * 3); } }, 240, 240) }), 0, -0.3, mid);
  /* tarmac: aggregate speckle, a darker groove down each lane, patched seams */
  const tar = dgTex(256, 1024, (x, w, h) => {
    x.fillStyle = '#3a3b3e'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = 40 + rnd() * 50; x.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 3) + ')'; x.fillRect(rnd() * w, rnd() * h, 1.5, 1.5); }
    for (const cx of [w * 0.31, w * 0.69]) { const gr = x.createLinearGradient(cx - 34, 0, cx + 34, 0); gr.addColorStop(0, 'rgba(18,18,20,0)'); gr.addColorStop(0.5, 'rgba(18,18,20,0.5)'); gr.addColorStop(1, 'rgba(18,18,20,0)'); x.fillStyle = gr; x.fillRect(cx - 34, 0, 68, h); }
    x.strokeStyle = 'rgba(20,20,22,0.55)'; x.lineWidth = 2; for (let i = 0; i < 5; i++) { x.beginPath(); x.moveTo(0, rnd() * h); x.lineTo(w, rnd() * h); x.stroke(); }
  }, 1, len / 60);
  flat(DG.HW * 2, len, std({ map: tar, roughness: 0.82 }), 0, 0, mid); add(new THREE.BoxGeometry(DG.HW * 2 + 1.4, 0.34, len + DG.TRAP + 1.6), std({ color: lc(0x77746c) }), 0, -0.18, mid + DG.TRAP / 2);   /* the strip stands on a low concrete apron, clear of the grass */
  /* rubber laid down off the line, fading out by the eighth */
  const rub = dgTex(64, 512, (x, w, h) => { const gr = x.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(8,8,9,0.9)'); gr.addColorStop(0.25, 'rgba(8,8,9,0.75)'); gr.addColorStop(1, 'rgba(8,8,9,0)'); x.fillStyle = gr; for (const cx of [14, 50]) x.fillRect(cx - 9, 0, 18, h); });
  for (const sx of [-1, 1]) { const m = flat(2.3, 230, new THREE.MeshStandardMaterial({ map: rub, transparent: true, roughness: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), sx * DG.LANE, 0.012, 85); m.rotation.z = Math.PI; }
  /* paint: edge lines, the centre line, the start line, the finish stripe */
  const white = new THREE.MeshStandardMaterial({ color: lc(0xe8e8e2), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 }), yel = new THREE.MeshStandardMaterial({ color: lc(0xe9b520), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 });
  for (const sx of [-1, 1]) flat(0.16, len, white, sx * (DG.HW - 1.3), 0.015, mid);
  flat(0.2, len, yel, 0, 0.015, mid); flat(DG.HW * 2 - 2.6, 0.3, white, 0, 0.016, 0);
  flat(DG.HW * 2 - 2.6, 2.4, new THREE.MeshStandardMaterial({ map: dgTex(256, 32, (x, w, h) => { for (let i = 0; i < 32; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) & 1 ? '#111' : '#eee'; x.fillRect(i * 8, j * 8, 8, 8); } }), roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -3 }), 0, 0.016, DG.LEN + 1.2);
  /* sand trap and the catch wall */
  flat(DG.HW * 2, DG.TRAP, std({ color: lc(0xc9b384), roughness: 1 }), 0, 0.02, DG.END + DG.TRAP / 2);
  add(new THREE.BoxGeometry(DG.HW * 2 + 1.2, 2.6, 0.8), std({ color: lc(0xb8372c) }), 0, 1.3, DG.END + DG.TRAP + 0.4, true);
  add(new THREE.BoxGeometry(DG.HW * 2 + 1.2, 1.1, 0.6), std({ color: lc(0x9c9c98) }), 0, 0.55, L0 - 0.3, true);
  /* concrete walls with a sponsor band */
  const band = dgTex(1024, 64, (x, w, h) => {
    x.fillStyle = '#b9b8b2'; x.fillRect(0, 0, w, h); x.fillStyle = '#c8281e'; x.fillRect(0, 0, w, 9);
    x.font = '700 30px system-ui,sans-serif'; x.textBaseline = 'middle'; const names = ['SALTMARSH DRAGWAY', 'RIDGEBACK', 'ISLAND RUSH', 'VANTA OIL', 'HOLLOW PINES TYRES'], cols = ['#1b3a8a', '#c8281e', '#222', '#0d6b3a', '#7a3a12']; let px = 14;
    for (let i = 0; i < names.length; i++) { x.fillStyle = cols[i]; x.fillText(names[i], px, 38); px += x.measureText(names[i]).width + 46; }
  }, (len + DG.TRAP) / 34, 1);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.5, 1.05, len + DG.TRAP), std({ map: band, roughness: 0.85 }), sx * (DG.HW + 0.05), 0.525, mid + DG.TRAP / 2, true);
  /* distance boards along the right-hand wall */
  for (const [d, txt] of [[18.3, '60 ft'], [100.6, '330'], [201.2, '1/8'], [304.8, '1000'], [402.3, '1/4']]) {
    const t = dgTex(128, 64, (x, w, h) => { x.fillStyle = '#12151a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffd02e'; x.font = '800 40px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(txt, w / 2, h / 2 + 2); });
    for (const sx of [-1, 1]) { const m = add(new THREE.PlaneGeometry(2.4, 1.2), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), sx * (DG.HW + 0.6), 2.1, d); m.rotation.y = Math.PI; add(new THREE.BoxGeometry(0.12, 1.6, 0.12), std({ color: lc(0x33363c) }), sx * (DG.HW + 0.6), 0.8, d + 0.05); }
  }
  /* the tree: two columns of lamps (pre-stage, stage, three ambers, green, red), six metres past the line between the lanes, facing the drivers */
  const dark = std({ color: lc(0x15171b), roughness: 0.6 }), tz = 6.5; Drag.lamps = { L: [], R: [] };
  add(new THREE.CylinderGeometry(0.09, 0.11, 3.4, 10), dark, 0, 1.7, tz, true); add(new THREE.BoxGeometry(0.9, 2.5, 0.22), dark, 0, 2.6, tz, true);
  const lampG = new THREE.SphereGeometry(0.105, 14, 10), small = new THREE.SphereGeometry(0.06, 10, 8);
  for (const [key, sx] of [['L', 1], ['R', -1]]) for (let k = 0; k < 7; k++) {
    const m = new THREE.Mesh(k < 2 ? small : lampG, new THREE.MeshBasicMaterial({ color: 0x1a1a1a, toneMapped: false })); m.position.set(sx * 0.26, 3.66 - k * 0.33 - (k > 1 ? 0.06 : 0), tz - 0.13); g.add(m); Drag.lamps[key].push(m);
  }
  /* finish gantry with a scoreboard over each lane */
  const steel = std({ color: lc(0x5a606a), roughness: 0.5, metalness: 0.6 });
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.35, 7.4, 0.35), steel, sx * (DG.HW + 0.9), 3.7, DG.LEN + 6, true);
  add(new THREE.BoxGeometry(DG.HW * 2 + 2.6, 0.5, 0.5), steel, 0, 7.3, DG.LEN + 6, true);
  Drag.boards = [];
  for (const sx of [1, -1]) {
    const cv = mkCanvas(256, 128), t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = maxAniso;
    const m = add(new THREE.PlaneGeometry(6.2, 3.1), new THREE.MeshBasicMaterial({ map: t, toneMapped: false }), sx * DG.LANE * 1.15, 5.5, DG.LEN + 5.7); m.rotation.y = Math.PI; add(new THREE.BoxGeometry(6.6, 3.5, 0.3), dark, sx * DG.LANE * 1.15, 5.5, DG.LEN + 5.95, true);
    Drag.boards.push({ cv, t, x: cv.getContext('2d') });
  }
  /* grandstands either side of the launch, full of people; a timing tower behind the line */
  const conc = std({ color: lc(0x8f9094) }), seat = [lc(0x1b3a8a), lc(0xc8281e)], people = [];
  for (const sx of [-1, 1]) {
    for (let r = 0; r < 9; r++) add(new THREE.BoxGeometry(1.05, 0.55 + r * 0.55, 230), r % 3 === 2 ? std({ color: seat[sx > 0 ? 0 : 1] }) : conc, sx * (DG.HW + 6.5 + r * 1.05), (0.55 + r * 0.55) / 2, 95, true);
    add(new THREE.BoxGeometry(11.5, 0.25, 232), std({ color: lc(0xd9dbde), roughness: 0.5 }), sx * (DG.HW + 11.2), 9.4, 95, true);
    for (let k = 0; k < 12; k++) add(new THREE.BoxGeometry(0.22, 9.4, 0.22), steel, sx * (DG.HW + 16.4), 4.7, -18 + k * 20.5, true);
    for (let i = 0; i < 1700; i++) { const r = (rnd() * 9) | 0; people.push([sx * (DG.HW + 6.5 + r * 1.05), 0.55 + r * 0.55 + 0.36, -18 + rnd() * 226, rnd()]); }
  }
  const pg = new THREE.BoxGeometry(0.4, 0.72, 0.3), pm = new THREE.InstancedMesh(pg, std({ roughness: 1 }), people.length), m4 = new THREE.Matrix4(), col = new THREE.Color();
  const shirts = [0xd9433a, 0x2f6fd0, 0xf0c53a, 0xf2f2f0, 0x2f9a57, 0x202328, 0xe07a2a, 0x8a4fd0, 0x58b8d8];
  people.forEach((p, i) => { m4.makeTranslation(p[0], p[1], p[2]); pm.setMatrixAt(i, m4); pm.setColorAt(i, col.copy(lc(shirts[(p[3] * shirts.length) | 0])).multiplyScalar(0.7 + p[3] * 0.5)); });
  pm.instanceMatrix.needsUpdate = true; pm.instanceColor.needsUpdate = true; pm.frustumCulled = false; g.add(pm);
  const win = dgTex(128, 128, (x, w, h) => { x.fillStyle = '#d7d2c4'; x.fillRect(0, 0, w, h); x.fillStyle = '#24323f'; for (let i = 0; i < 4; i++) x.fillRect(8, 10 + i * 30, w - 16, 16); x.fillStyle = '#c8281e'; x.fillRect(0, 0, w, 6); }, 2, 1);
  add(new THREE.BoxGeometry(12, 13, 9), std({ map: win }), -(DG.HW + 34), 6.5, -34, true); add(new THREE.BoxGeometry(14, 0.5, 11), dark, -(DG.HW + 34), 13.25, -34, true);
  /* floodlight masts down both sides */
  const head = new THREE.MeshBasicMaterial({ color: 0xfff3cf, toneMapped: false });
  for (let z = -40; z <= DG.END; z += 110) for (const sx of [-1, 1]) { add(new THREE.CylinderGeometry(0.16, 0.24, 19, 8), steel, sx * (DG.HW + 20), 9.5, z + 30, true); add(new THREE.BoxGeometry(3.4, 1.1, 0.5), head, sx * (DG.HW + 19.6), 19.2, z + 30).rotation.y = sx * 0.5; }
  /* a line of marsh pines and scrub well back from the strip, so the horizon is not bare */
  const cone = new THREE.ConeGeometry(1, 1, 7), trees = []; for (let i = 0; i < 620; i++) { const sx = rnd() < 0.5 ? -1 : 1, x = sx * (DG.HW + 46 + rnd() * rnd() * 330), z = L0 - 160 + rnd() * (len + 420); trees.push([x, z, 5 + rnd() * 9, 2 + rnd() * 2.4, rnd()]); }
  const tm = new THREE.InstancedMesh(cone, std({ roughness: 1 }), trees.length), sc = new THREE.Vector3(), ps = new THREE.Vector3(), qt = new THREE.Quaternion();
  trees.forEach((t, i) => { ps.set(t[0], t[2] / 2 + 0.6, t[1]); sc.set(t[3], t[2], t[3]); m4.compose(ps, qt, sc); tm.setMatrixAt(i, m4); tm.setColorAt(i, col.setRGB(0.03 + t[4] * 0.03, 0.09 + t[4] * 0.07, 0.035 + t[4] * 0.02)); });
  tm.instanceMatrix.needsUpdate = true; tm.instanceColor.needsUpdate = true; tm.frustumCulled = false; tm.castShadow = true; g.add(tm);
  g.visible = false; scene.add(g);
};
/* tree lamps: lit = how far down the tree we are (0 staged, 1..3 ambers, 4 green); red if that lane fouled */
Drag.light = function () {
  if (!Drag.lamps) return; const ph = Drag.phase, n = Drag.lit, on = [0x0f0f10, 0xffffff, 0xffb200, 0x19ff5a, 0xff2a1e];
  for (const [key, lane] of [['L', Drag.rival ? Drag.rival.lane : null], ['R', Drag.me]]) {
    const A = Drag.lamps[key], foul = lane && lane.foul, staged = ph !== 'off';
    for (let k = 0; k < 7; k++) { let c = on[0]; if (k < 2) c = staged ? on[1] : on[0]; else if (k < 5) c = n === k - 1 && !foul ? on[2] : on[0]; else if (k === 5) c = n >= 4 && !foul ? on[3] : on[0]; else c = foul ? on[4] : on[0]; A[k].material.color.setHex(c); }
  }
  const E_ = Drag.el; if (!E_) return;
  for (const [els, lane] of [[E_.lampsL, Drag.rival ? Drag.rival.lane : null], [E_.lampsR, Drag.me]]) { const foul = lane && lane.foul; els.forEach((e, k) => { e.className = k < 3 ? (n === k + 1 && !foul ? 'a' : '') : k === 3 ? (n >= 4 && !foul ? 'g' : '') : (foul ? 'r' : ''); }); }
};
Drag.board = function (i, lane, win) {
  const B = Drag.boards[i], x = B.x; x.fillStyle = '#07090b'; x.fillRect(0, 0, 256, 128);
  if (lane && lane.tFin >= 0 && lane.tBeam >= 0) {
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = lane.foul ? '#ff3b30' : win ? '#35ff6e' : '#ffb02e'; x.font = '800 60px ui-monospace,monospace'; x.fillText((lane.tFin - lane.tBeam).toFixed(3), 128, 44);
    x.font = '700 34px ui-monospace,monospace'; x.fillStyle = '#e8e8e8'; x.fillText(Math.round(lane.vFin * 3.6) + ' km/h', 128, 98);
  }
  B.t.needsUpdate = true;
};

/* ---------------- HUD ---------------- */
const DG_CSS = `
#dgHud{position:fixed;inset:0;pointer-events:none;z-index:6;font-family:inherit;color:#fff}
#dgTree{position:absolute;left:50%;top:calc(64px + env(safe-area-inset-top));transform:translateX(-50%);display:flex;gap:10px;padding:8px 12px;background:rgba(6,9,12,.62);border-radius:8px}
#dgTree .col{display:flex;flex-direction:column;gap:6px;align-items:center}#dgTree small{font-size:10px;letter-spacing:.14em;opacity:.7}
#dgTree i{display:block;width:20px;height:20px;border-radius:50%;background:#24262b;box-shadow:inset 0 0 0 2px #0b0c0e}
#dgTree i.a{background:#ffb200;box-shadow:0 0 14px #ffb200}#dgTree i.g{background:#19ff5a;box-shadow:0 0 18px #19ff5a}#dgTree i.r{background:#ff2a1e;box-shadow:0 0 18px #ff2a1e}
#dgMsg{position:absolute;left:50%;top:27%;transform:translateX(-50%);font-size:44px;font-weight:800;letter-spacing:.06em;text-shadow:0 3px 18px rgba(0,0,0,.7);white-space:nowrap}
#dgMsg.red{color:#ff3b30}#dgMsg.grn{color:#35ff6e}
#dgTime{position:absolute;left:50%;top:calc(14px + env(safe-area-inset-top));transform:translateX(-50%);font-size:34px;font-weight:800;font-variant-numeric:tabular-nums;text-shadow:0 2px 10px rgba(0,0,0,.6)}
#dgGap{position:absolute;right:calc(18px + env(safe-area-inset-right));top:calc(16px + env(safe-area-inset-top));text-align:right;font-size:13px;letter-spacing:.12em;opacity:.9}#dgGap b{display:block;font-size:28px;letter-spacing:0}
#dgHint{position:absolute;left:50%;bottom:calc(120px + env(safe-area-inset-bottom));transform:translateX(-50%);font-size:15px;letter-spacing:.08em;background:rgba(6,9,12,.55);padding:6px 14px;border-radius:4px;white-space:nowrap}
body.drag #tr,body.drag #mp,body.drag #wanted,body.drag #tgt,body.drag #prompt{display:none!important}
@media(max-width:700px){#dgMsg{font-size:28px}#dgTime{font-size:26px}#dgTree i{width:15px;height:15px}}`;
Drag.dom = function () {
  if (Drag.el) return; const st = document.createElement('style'); st.textContent = DG_CSS; document.head.appendChild(st);
  const h = document.createElement('div'); h.id = 'dgHud'; h.hidden = true;
  const col = (n) => '<div class="col"><small>' + n + '</small><i></i><i></i><i></i><i></i><i></i></div>';
  h.innerHTML = '<div id="dgTime">0.000</div><div id="dgTree">' + col('RIVAL') + col('YOU') + '</div><div id="dgMsg"></div><div id="dgGap"></div><div id="dgHint"></div>';
  document.body.appendChild(h);
  const cols = h.querySelectorAll('#dgTree .col');
  Drag.el = { root: h, time: h.querySelector('#dgTime'), msg: h.querySelector('#dgMsg'), gap: h.querySelector('#dgGap'), hint: h.querySelector('#dgHint'), lampsL: Array.from(cols[0].querySelectorAll('i')), lampsR: Array.from(cols[1].querySelectorAll('i')) };
  E.rres.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !b.dataset.dg) return; if (b.dataset.dg === 'again') Drag.again(); else if (b.dataset.dg === 'done') Drag.exit(false); });
};
Drag.say = function (txt, cls) { const m = Drag.el.msg; m.textContent = txt; m.className = cls || ''; };

/* ---------------- lobby ---------------- */
Drag.open = function () { if (App.mode !== 'rlobby') return; Drag.lobby = true; Drag.tier = Drag.rec().tier; Drag.paint(); Snd.beep(620, 0.06); };
Drag.paint = function () {
  const R = Drag.rec(), best = R.best[save.car] || 0, seg = DG_TIERS.map((d, i) => '<button type="button" class="' + (Drag.tier === i ? 'on' : '') + '" data-v="' + i + '">' + d.n + '</button>').join('');
  E.rlTitle.textContent = 'Saltmarsh Dragway'; E.rlCash.textContent = money(save.money); E.rlSub.textContent = 'Quarter mile'; E.rlPanel.classList.remove('jk');
  E.rlFoot.innerHTML = '<button class="btn" type="button" data-dg="back">◂ Circuit</button><button class="btn primary" type="button" data-dg="start">Go to the line</button>';
  E.rlBody.innerHTML = '<p class="rlp">Two lanes, 402 metres, one rival. Watch the tree: three ambers, then green. Leave before the green and you red-light. Reaction time and elapsed time both count: the first car across the line wins.</p>' +
    '<div class="rlrow"><label>Bracket</label><div class="rseg" data-k="dgtier">' + seg + '</div></div>' +
    '<div class="rlprize"><small>Prize for a win</small><span><b>' + money(DG_TIERS[Drag.tier].prize) + '</b></span><span>+ <b>' + money(150) + '</b> personal best</span></div>' +
    '<div class="rlrec"><span>Runs <b>' + R.runs + '</b></span><span>Wins <b>' + R.wins + '</b></span><span>Best ET in this car <b>' + (best > 0 ? best.toFixed(3) + ' s' : '–') + '</b></span><span>Best reaction <b>' + (R.bestRt > 0 ? R.bestRt.toFixed(3) + ' s' : '–') + '</b></span><span>Winnings <b>' + money(R.earned) + '</b></span></div>' +
    '<p class="rlp dim">Your car: <b>' + esc(CUR.name) + '</b>. The rival runs the same car with ' + (DG_TIERS[Drag.tier].pw < 1 ? 'a little less' : DG_TIERS[Drag.tier].pw > 1 ? Math.round((DG_TIERS[Drag.tier].pw - 1) * 100) + '% more' : 'the same') + ' power' + (DG_TIERS[Drag.tier].nit ? ' and a full nitro tank' : ' and no nitro') + '. ' + (TouchIn.on ? 'Hold the throttle on green.' : 'Throttle on green, Shift for nitro, R to restage.') + '</p>';
};
Drag.lobbyClick = function (b) {
  if (b.dataset.dg === 'back') { Drag.lobby = false; Race.paint(); Snd.beep(420, 0.05); }
  else if (b.dataset.dg === 'start') Drag.start();
  else if (b.parentNode && b.parentNode.dataset.k === 'dgtier') { Drag.tier = +b.dataset.v; Drag.rec().tier = Drag.tier; Drag.paint(); Snd.beep(520, 0.04); }
};
Drag.lobbyKey = function (code) { if (code === 'Escape') { Drag.lobby = false; Race.paint(); } else if (code === 'Enter') Drag.start(); };

/* ---------------- start / stage / exit ---------------- */
Drag.start = async function () {
  if (Drag.on || Drag.loading || App.mode !== 'rlobby') return;
  Drag.loading = true; Drag.lobby = false; Drag.dom();
  const c = car; Drag.saved = { x: c.x, z: c.z, yaw: c.yaw, tod: App.tod, cycle: save.set.cycle, view: Cam.view, nitro: c.nitro, health: c.health };
  UI.setMode('load'); UI.progress(0.2, 'Rolling out the tarmac'); await tick();
  try { Drag.build(); } catch (err) { console.error(err); Drag.loading = false; UI.setMode('rlobby'); Race.paint(); UI.toast('Could not build the strip', 'bad'); return; }
  UI.progress(0.8, 'Filling the stands'); await tick();
  Drag.hidden.length = 0; const keep = new Set([Sky.mesh, Part.smoke.pts, Part.spark.pts, car.body, Wheels.group, Drag.group]);
  for (const o of scene.children) { if (o.isLight || keep.has(o) || !o.visible) continue; o.visible = false; Drag.hidden.push(o); }
  if (Chunks.group) Chunks.group.visible = false; if (Far.group) Far.group.visible = false;
  Drag.group.visible = true; Race.near = null; Shop.near = null; Ven.near = null; Wk.near = null; if (typeof Mission !== 'undefined') Mission.nearby = null;
  Drag.on = true; save.set.cycle = 0; if (App.tod < 8 || App.tod > 17.5) App.tod = 16.2;
  if (Cam.view === 0) Cam.view = 2;
  document.body.classList.add('drag'); Drag.el.root.hidden = false;
  Drag.makeRival(); Drag.stage(); Snd.init();
  UI.progress(1, ''); UI.setMode('play'); Drag.loading = false;
};
Drag.makeRival = function () {
  Drag.clearRival(); const T = DG_TIERS[Drag.tier], def = CUR, P = Object.assign({}, CARP), Tn = { Tmax: tune.Tmax * T.pw, mu: tune.mu * T.gr, cd: tune.cd, cl: tune.cl || 0, brk: tune.brk, off: tune.off };
  const hl = def.hl || 2.2, hw = ((def.body && def.body.W) || 1.9) / 2, circ = [[hl - 0.45, hw + 0.09], [0, hw + 0.09], [-(hl - 0.45), hw + 0.09]];
  const used = curPaint(), idx = PAINTS.map((_, i) => i).filter((i) => i !== used), hex = PAINTS[idx[(Math.random() * idx.length) | 0]];
  const b = { i: 0, name: DG_NAMES[(Math.random() * DG_NAMES.length) | 0], def, P, T: Tn, circ, c: newCarState(), lane: dgLane(), x0: DG.X0 + DG.LANE, rt: 0, nit: T.nit, imp: 0, hx: 0, hz: 0 };
  b.mesh = buildCarModel(def, hex, { lod: 1 }); b.mesh.visible = true; scene.add(b.mesh);
  Drag.rival = b; Drag.field = [b];
};
Drag.clearRival = function () { const b = Drag.rival; if (b) { scene.remove(b.mesh); disposeCar(b.mesh); } Drag.rival = null; Drag.field = []; };
/* both cars to the line, noses 0.3 m short of the beam */
Drag.stage = function () {
  const c = car, b = Drag.rival, T = DG_TIERS[Drag.tier];
  spawnAt(DG.X0 - DG.LANE, DG.Z0 - CARP.a - 0.3, 0); c.y = DG.Y; c.nitro = tune.nitroMax; c.health = Math.max(c.health, 60); App.dmg = 0;
  Drag.me = dgLane(); Drag.me.zPrev = -0.3;
  if (b) {
    const r = b.c; Object.assign(r, newCarState()); r.x = b.x0; r.z = DG.Z0 - b.P.a - 0.3; r.y = DG.Y; r.yaw = 0; r.brk = 1; r.hand = 1; r.nitro = tune.nitroMax;
    b.lane = dgLane(); b.lane.zPrev = -0.3; b.rt = T.rt[0] + Math.random() * T.rt[1];
    b.mesh.position.set(r.x, r.y, r.z); b.mesh.rotation.set(0, 0, 0);
  }
  Drag.phase = 'stage'; Drag.t = 0; Drag.clock = 0; Drag.tGreen = 1e9; Drag.treeT = 1.4 + 0.7 + Math.random() * 1.3; Drag.lit = 0; Drag.doneT = 0; Drag.shown = false;
  E.rres.hidden = true; Drag.say('STAGED', ''); Drag.el.gap.innerHTML = ''; Drag.el.time.textContent = '0.000';
  Drag.el.hint.textContent = TouchIn.on ? 'WAIT FOR GREEN' : 'WAIT FOR GREEN · THEN THROTTLE'; Drag.el.hint.hidden = false;
  for (let i = 0; i < 2; i++) Drag.board(i, null, false); Drag.light();
};
Drag.again = function () { if (!Drag.on) return; Drag.stage(); };
Drag.exit = function (quit) {
  if (!Drag.on) return;
  Drag.on = false; Drag.phase = 'off'; Drag.clearRival(); E.rres.hidden = true; document.body.classList.remove('drag'); Drag.el.root.hidden = true;
  Drag.group.visible = false; for (const o of Drag.hidden) o.visible = true; Drag.hidden.length = 0; if (Chunks.group) Chunks.group.visible = true; if (Far.group) Far.group.visible = true;
  const S = Drag.saved; if (S) { save.set.cycle = S.cycle; App.tod = S.tod; car.nitro = S.nitro; Cam.view = S.view; loadAround(S.x, S.z, 14); spawnAt(S.x, S.z, S.yaw); car.health = Math.max(car.health, S.health); }
  writeSave(); UI.setMode('play'); UI.toast(quit ? 'Left the strip' : 'Back at the race office', 'info');
};

/* ---------------- per-frame ---------------- */
Drag.update = function (dt) {
  const c = car, b = Drag.rival, me = Drag.me, E_ = Drag.el; Drag.t += dt;
  if (Drag.phase === 'stage') {
    c.vx = c.vz = c.w = 0; c.speed = 0; c.brk = 1; c.hand = 1;
    if (Drag.t > 1.4) { Drag.phase = 'tree'; Drag.say('', ''); }
  } else if (Drag.phase === 'tree') {
    /* the car is free now: roll through the beam and it is a red light */
    const k = Drag.t - Drag.treeT, n = k < 0 ? 0 : k < 0.5 ? 1 : k < 1 ? 2 : k < 1.5 ? 3 : 4;
    if (n !== Drag.lit) { Drag.lit = n; if (n >= 1 && n <= 3) Snd.beep(520, 0.09); if (n === 4) { Drag.phase = 'run'; Drag.tGreen = Drag.clock; Snd.beep(900, 0.3); if (!me.foul) { Drag.say('GO!', 'grn'); Drag.sayT = 0.9; } E_.hint.hidden = true; } Drag.light(); }
    if (me.foul && !Drag.fouled) { Drag.fouled = true; Drag.say('RED LIGHT', 'red'); Drag.sayT = 99; Snd.beep(180, 0.5); Drag.light(); }
  } else if (Drag.phase === 'run') {
    if (Drag.sayT > 0) { Drag.sayT -= dt; if (Drag.sayT <= 0) Drag.say('', ''); }
    const t = Drag.clock - Drag.tGreen;
    if (me.tFin >= 0 && (!b || b.lane.tFin >= 0 || Drag.clock > me.tFin + 4) || t > 40) { Drag.phase = 'done'; Drag.finish(); }
  } else if (Drag.phase === 'done') { Drag.doneT += dt; }
  Drag.fouled = me.foul;
  /* HUD: your running time from the beam, the gap to the rival's nose */
  Drag.hudT -= dt; if (Drag.hudT <= 0) {
    Drag.hudT = 0.04;
    E_.time.textContent = me.tBeam >= 0 ? ((me.tFin >= 0 ? me.tFin : Drag.clock) - me.tBeam).toFixed(3) : '0.000';
    if (b && Drag.phase === 'run' && me.tFin < 0) { const gap = (c.z + CARP.a) - (b.c.z + b.P.a); E_.gap.innerHTML = (gap >= 0 ? 'AHEAD' : 'BEHIND') + '<b style="color:' + (gap >= 0 ? '#35ff6e' : '#ff6a5e') + '">' + Math.abs(gap).toFixed(1) + ' m</b>'; }
  }
};
Drag.finish = function () {
  const me = Drag.me, b = Drag.rival, rl = b ? b.lane : null, R = Drag.rec(), T = DG_TIERS[Drag.tier], id = save.car;
  const et = me.tFin - me.tBeam, rt = me.tBeam - Drag.tGreen, ok = me.tFin >= 0 && me.tBeam >= 0, rOk = rl && rl.tFin >= 0;
  const win = ok && !me.foul && (!rOk || rl.foul || me.tFin < rl.tFin), margin = ok && rOk ? rl.tFin - me.tFin : 0;
  const pb = ok && !me.foul && (!(R.best[id] > 0) || et < R.best[id]), prev = R.best[id] || 0;
  const reward = (win ? T.prize : 0) + (pb ? 150 : 0);
  R.runs++; if (win) R.wins++; if (pb) R.best[id] = et; if (ok && !me.foul && rt > 0 && (!(R.bestRt > 0) || rt < R.bestRt)) R.bestRt = rt; R.earned += reward; save.money += reward; writeSave();
  Drag.board(1, me, win); Drag.board(0, rl, rOk && !win); Drag.light(); if (win) Snd.win(); else Snd.beep(240, 0.4);
  const row = (name, L, cls) => {
    if (!L || L.tBeam < 0) return '<tr class="' + cls + '"><td>' + name + '</td><td colspan="5">did not launch</td></tr>';
    const f = (v) => (v >= 0 ? (v - L.tBeam).toFixed(3) : '–');
    return '<tr class="' + cls + '"><td>' + name + '</td><td>' + (L.foul ? '<span style="color:#ff6a5e">' + (L.tBeam - Drag.tGreen).toFixed(3) + ' RED</span>' : (L.tBeam - Drag.tGreen).toFixed(3)) + '</td><td>' + f(L.t60) + '</td><td>' + f(L.t8) + '</td><td><b>' + f(L.tFin) + '</b></td><td>' + (L.tFin >= 0 ? Math.round(L.vFin * 3.6) + ' km/h' : '–') + '</td></tr>';
  };
  const title = me.foul ? 'RED LIGHT · YOU LOSE' : !ok ? 'DID NOT FINISH' : win ? 'YOU WIN' : 'YOU LOSE';
  E.rres.hidden = false;
  E.rres.innerHTML = '<div id="rresP"><h2 class="' + (win ? 'ok' : '') + '">' + title + (ok && rOk && !me.foul ? ' <small style="font-size:.5em;opacity:.8">by ' + Math.abs(margin).toFixed(3) + ' s</small>' : '') + '</h2>' +
    '<div class="rw">' + (reward ? '+' + money(reward) : 'No prize') + (pb ? ' <small>new best in this car' + (prev > 0 ? ' (was ' + prev.toFixed(3) + ')' : '') + '</small>' : '') + '</div>' +
    '<table><tr><th></th><th>Reaction</th><th>60 ft</th><th>1/8 mile</th><th>1/4 mile</th><th>Trap speed</th></tr>' + row('You', me, 'me') + row(b ? esc(b.name) : 'Rival', rl, '') + '</table>' +
    '<p class="rlp dim" style="margin:10px 0">' + T.n + ' bracket · ' + esc(CUR.name) + ' · the first car across the line wins, so a slow light can lose a quick run.</p>' +
    '<div class="racts"><button class="btn" type="button" data-dg="done">Leave the strip</button><button class="btn primary" type="button" data-dg="again">Run again</button></div></div>';
  Drag.say(title.split(' · ')[0], win ? 'grn' : 'red'); Drag.el.gap.innerHTML = ''; Drag.shown = true;
};
Drag.visual = function () {
  const b = Drag.rival; if (!b) return; const c = b.c, m = b.mesh;
  m.position.set(c.x, c.y + c.sY * 0.4, c.z); m.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ'); m.userData.v = c.speed; m.userData.brake = c.brk > 0.25 && !c.rev; m.userData.steer = clamp(c.delta || 0, -0.6, 0.6);
  if (c.spin && Math.random() < 0.5) emit(Part.smoke, c.x - Math.sin(c.yaw) * b.P.b + (Math.random() - 0.5) * 1.4, c.y + 0.2, c.z - Math.cos(c.yaw) * b.P.b, (Math.random() - 0.5) * 2, 0.8 + Math.random(), -2 - Math.random() * 2, 1.2 + Math.random(), 1.2, 3, 0.8, 0.8, 0.8, 0.35, -0.3);
};
