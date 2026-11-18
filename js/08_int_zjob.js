/* ================= BANK JOBS: rob a bank at night without being seen =================
   Every bank can be robbed. Go in during the day and case it (the staff door by the teller line), then come back that night: the hall is dark,
   guards patrol with torches on set rounds, cameras sweep the halls, and in the Island Reserve lasers guard the vault. Stay out of their
   cones of sight (a cone fills your eye meter: in the open, close up, running and in the light it fills fast; walls and high furniture hide
   you, and crouching (Ctrl) hides you behind counters and desks too). Crack the vault dial (press E as each tumbler lines up; a miss is loud),
   grab the cash and walk out the front door. Seen for long enough, the alarm goes: the guards come for you and the police are a minute
   away. Caught, and you do time in the county jail; out with the cash after an alarm, and you have the police to lose.
   Five banks, from the Lakeshore Credit Union (two guards) to the Island Reserve (five guards, cameras and lasers). */
const BANKJOB = [
  /* by bank tier: guards, cameras, lasers, take per cash cart, carts, extra stars on an alarm */
  { g: 2, cams: 0, las: 0, cash: 4000, carts: 3, st: 2 },
  { g: 3, cams: 1, las: 0, cash: 7000, carts: 4, st: 3 },
  { g: 3, cams: 2, las: 0, cash: 9000, carts: 4, st: 3 },
  { g: 4, cams: 2, las: 0, cash: 14000, carts: 5, st: 4 },
  { g: 5, cams: 3, las: 3, cash: 30000, carts: 6, st: 5 }
];
const BankJob = { on: false, rec: null, tier: 0, eye: 0, alarm: 0, loot: 0, guards: [], cams: [], lasers: [], vault: null, open: false, t: 0, seen: false, caught: false, camOff: 0, carts: [], msg: '' };
const BJ_TIER = { 5: 0, 1: 1, 0: 2, 6: 3, 7: 0, 8: 1, 10: 1, 13: 3 };
BankJob.tierOf = function (rec) { if (rec.kind === 'reserve') return 4; return BJ_TIER[rec.ti] != null ? BJ_TIER[rec.ti] : 1; };
BankJob.record = function (key) { const s = intSave().banks[key]; return s || { n: 0, best: 0, stars: 0, t: 0 }; };
/* the daytime bank: the staff door, where you case the job */
BankJob.dress = function (K, rec) {
  const z = K.z0 + 7.2; K.box(K.x1 - 0.1, 0, z - 0.8, K.x1, 2.4, z + 0.8, 0x5a4a3a); K.sign('STAFF ONLY', K.x1 - 0.12, 2.6, z, 1.4, 0.3, -Math.PI / 2, { fg: '#fff', bg: '#8a1a1a' });
  K.act(K.x1 - 0.9, z, 1.5, 'Case the bank (plan a robbery)', () => BankJob.brief(rec), { wide: true });
};
BankJob.brief = function (rec) {
  const T = BankJob.tierOf(rec), J = BANKJOB[T], R = BankJob.record(rec.key), take = J.cash * J.carts;
  const lv = ['Easy', 'Medium', 'Medium', 'Hard', 'Very hard'][T];
  Int.panel({ title: 'Bank job · ' + rec.name, sub: lv + ' · ' + rec.town, body: '<p>You note the rounds. At night there ' + (J.g > 1 ? 'are ' + J.g + ' guards' : 'is one guard') + (J.cams ? ', ' + J.cams + ' camera' + (J.cams > 1 ? 's' : '') : '') + (J.las ? ' and lasers across the way to the vault (they blink off now and then)' : '') + '. The vault is at the back, behind the offices.</p>' +
    '<div class="vrules">Stay out of the torch cones (and the cameras’). Ctrl to crouch: you hide behind counters and desks and move quietly. Running is loud. E on the vault dial when each tumbler lines up. Grab the cash and leave by the front door. If the alarm goes, get out before the police arrive.</div>' +
    '<div class="vrec"><div><small>The take</small><b>up to ' + money(take) + '</b></div><div><small>Robbed</small><b>' + R.n + '×</b></div><div><small>Best</small><b>' + (R.best ? money(R.best) : '—') + '</b></div><div><small>Clean</small><b>' + '★'.repeat(R.stars) + '☆'.repeat(3 - R.stars) + '</b></div></div>',
    btns: [[Wanted.stars > 0 ? 'Lose the police first' : 'Do it tonight (the clock jumps to 23:00)', () => { Int.panel(null); BankJob.start(rec); }, true, Wanted.stars > 0]] });
};
BankJob.start = function (rec) {
  const T = BankJob.tierOf(rec); Object.assign(BankJob, { on: true, rec, tier: T, J: BANKJOB[T], eye: 0, alarm: 0, loot: 0, t: 0, seen: false, caught: false, camOff: 0, open: false, crack: 0, clean: true });
  if (App.tod > 5 && App.tod < 22) App.tod = 23;
  Int.hook = { allowHeat: true }; Int.go('job', 'door'); Int.say('Night. The doors are locked behind you. Find the vault.', 3.5);
};
/* ---------- line of sight in the room's floor plan: walls and anything taller than you are standing (or crouching) ---------- */
function bjSees(ax, az, bx, bz, hmin) {
  const dx = bx - ax, dz = bz - az;
  for (const c of Int.cols) {
    if (c.off || (c.h != null && c.h < hmin)) continue;
    let t0 = 0, t1 = 1;
    if (Math.abs(dx) < 1e-9) { if (ax < c[0] || ax > c[2]) continue; } else { let u = (c[0] - ax) / dx, v = (c[2] - ax) / dx; if (u > v) { const w = u; u = v; v = w; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) continue; }
    if (Math.abs(dz) < 1e-9) { if (az < c[1] || az > c[3]) continue; } else { let u = (c[1] - az) / dz, v = (c[3] - az) / dz; if (u > v) { const w = u; u = v; v = w; } t0 = Math.max(t0, u); t1 = Math.min(t1, v); if (t0 > t1) continue; }
    if (t0 < 0.98 && t1 > 0.02) return false;
  }
  return true;
}
function bjCone(K, range, fov, col) {
  const g = new THREE.Group(), m = new THREE.Mesh(new THREE.CircleGeometry(range, 24, -fov / 2, fov), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  m.material.__own = true; m.rotation.x = -Math.PI / 2; m.position.y = 0.03; g.add(m); K.sc.add(g); g.m = m; return g;
}
/* ---------- the night bank: the hall, the teller line, the offices, the security room and the vault ---------- */
INT_KINDS.bank.rooms.job = INT_KINDS.reserve.rooms.job = function (K, rec, r) {
  const J = BankJob.J, W = 26, D = 32; K.night = true;
  K.shell({ W, D, H: 5, floor: 0xd8d4cc, tiles: 0xb8b0a0, wall: 0xe8e4da, trim: 0x8a7a5a, lamp: 0x8aa0c8, lightI: 0.22, hemi: 0.16, sky: 0x8aa0d8, gnd: 0x101418, noBackWin: true });
  K.expo = 1.0; const H = 5, gold = 0xc8a050, wall = 0xe8e4da;
  /* lobby: pillars, chairs, the rope line */
  for (const sx of [-1, 1]) for (let z = 6; z < 15; z += 4) K.cyl(sx * 10.5, 0, z, 0.38, H, 0xf2eee4, true);
  for (let k = 0; k < 4; k++) K.chair(-12.2, 12 - k * 0.8, Math.PI / 2, 0x2a3a5a);
  K.rug(-1.2, 4, 1.2, 15.5, 0x5a1414, 0x6a1a1a); K.sign(rec.name.toUpperCase(), 0, 4.2, 2.06, 10, 0.8, Math.PI, { fg: '#8a7a50' });
  /* the teller line, with a gate at the right-hand end */
  K.counter(-13, 2, 9.4, 2.8, 0x6a4a2a, 0x2a2a2a, 1.15); K.glass(-13, 1.15, 2.35, 9.4, 2.6, 2.4); K.box(9.4, 0, 2.0, 9.5, 1.15, 2.8, 0x6a4a2a); K.box(11.6, 0, 2, 13, 1.15, 2.8, 0x6a4a2a, true);
  /* back offices between the counter and the vault wall (z -8): three rooms off a corridor on the right */
  K.wallZ(9.5, -8, 2, [[-1.5, -0.3]], wall); K.wallX(-3, -13, 9.5, [[-9.5, -8.3], [1.5, 2.7]], wall); K.wallZ(-2, -8, -3, [], wall); K.wallZ(-2, -3, 2, [[-1.8, -0.6]], wall);
  for (const [x, z] of [[-9, -6], [-5, -6], [4, -6], [-9, 0], [-5, 0]]) { K.desk(x, z, 0); K.chair(x, z + 0.7, Math.PI, 0x2a2a30); }
  K.box(5, 0, -0.2, 9.3, 1.0, 0.8, 0x2a2c30, true); for (let k = 0; k < 4; k++) K.glow(5.3 + k * 1, 1.1, 0.3, 6.1 + k * 1, 1.7, 0.32, 0x4ad88a, 0.8);
  K.sign('SECURITY', 7, 2.5, -2.92, 1.6, 0.3, 0, { fg: '#fff', bg: '#2a2c30' });
  /* the vault wall, the dial and the door; behind it, the cash */
  K.box(-13, 0, -8.2, -1.6, H, -7.8, 0x8a8c90, true); K.box(1.6, 0, -8.2, 13, H, -7.8, 0x8a8c90, true); K.box(-1.6, 2.9, -8.2, 1.6, H, -7.8, 0x8a8c90);
  const vd = new THREE.Group(), vm = new THREE.MeshStandardMaterial({ color: lc(0x9a9ca2), metalness: 0.7, roughness: 0.35 }); vm.__own = true;
  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.9, 0.5), vm); slab.position.set(1.6, 1.45, 0); vd.add(slab);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.2, 20), vm); hub.rotation.x = Math.PI / 2; hub.position.set(1.6, 1.5, 0.32); vd.add(hub);
  vd.position.set(-1.6, 0, -7.75); K.sc.add(vd); const vc = K.col(-1.6, -8.2, 1.6, -7.6); vc.h = 3;
  for (let x = -12.5; x < 12.6; x += 0.6) for (let y = 0.3; y < 3.2; y += 0.5) K.box(x, y, -15.95, x + 0.55, y + 0.45, -15.7, 0x8a7a5a, false, 0.9);
  const carts = []; for (let k = 0; k < J.carts; k++) { const x = -6 + k * (12 / Math.max(1, J.carts - 1)), z = -12; K.box(x - 0.5, 0.2, z - 0.35, x + 0.5, 0.9, z + 0.35, 0x5a5c60, true); const cm = []; for (let q = 0; q < 6; q++) cm.push([x - 0.4 + (q % 3) * 0.28, 0.9 + ((q / 3) | 0) * 0.14, z - 0.2]); const cash = new THREE.Group(); for (const p of cm) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.4), new THREE.MeshStandardMaterial({ color: lc(0x3a8a4a), roughness: 0.8 })); b.material.__own = true; b.position.set(p[0] + 0.12, p[1] + 0.06, p[2] + 0.2); cash.add(b); } K.sc.add(cash); carts.push({ x, z, cash, taken: false }); }
  K.light(0, 4, -12, 0xfff0d0, 0.9, 12);
  /* exit signs, the night lights */
  K.glow(-0.6, 2.8, 15.9, 0.6, 3.1, 15.95, 0x2ad86a, 1.6); K.light(0, 3.5, 10, 0x6a80b0, 0.5, 16);
  /* the dial on the vault wall */
  K.act(2.3, -7.1, 1.4, () => (BankJob.open ? 'The vault is open' : 'Crack the vault dial'), () => { if (!BankJob.open) BankJob.crackStart(); }, { wide: true });
  for (const c of carts) c.a = K.act(c.x, c.z + 1, 1.3, 'Grab the cash (' + money(J.cash) + ')', () => BankJob.grab(c), { when: () => BankJob.open && !c.taken });
  K.act(7, -1.8, 1.4, () => (BankJob.camOff > 0 ? 'Cameras looping (' + Math.ceil(BankJob.camOff) + ' s)' : J.cams ? 'Loop the camera feeds (60 s)' : 'The security desk'), () => { if (J.cams && BankJob.camOff <= 0) { BankJob.camOff = 60; Snd.beep(520, 0.08); Int.say('The feeds are looping last night’s tape. 60 seconds.', 3); } });
  /* the guards: rounds through the hall, the offices and the vault corridor */
  const rounds = [
    [[-8, 13, 2], [8, 13, 1], [8, 5, 2], [-8, 5, 1]],
    [[11, 1, 1.5], [11, -6, 2], [5, -6, 1], [11, -6, 1]],
    [[-10, -1, 2], [-3, -1, 1], [-3, -6, 2], [-10, -6, 1]],
    [[0, 4.2, 2], [-11, 4.2, 1], [0, 4.2, 1], [8.5, 4.2, 2]],
    [[-5, -2.2, 1], [3, -2.2, 2], [3, 1.4, 1], [-5, 1.4, 1]]
  ];
  BankJob.guards = [];
  for (let k = 0; k < J.g; k++) {
    const P = rounds[k], n = K.person({ x: P[0][0], z: P[0][1], kind: 'ctl', shirt: 0x1a2a4a, pants: 0x1a1c24, hat: { k: 'cap', c: lc(0x1a2a4a), bc: null }, role: 'guard', seed: 40 + k });
    if (!n) continue; n.path = P; n.pi = 1; n.st = 'patrol'; n.wait = 0; n.cone = bjCone(K, 8.5, 0.95, 0xffe8a0); n.see = 0;
    n.after = (q, h) => { const b = h.b; b.armR.rotation.set(-1.25, 0, 0.2); b.elR.rotation.set(-0.2, 0, 0); };
    BankJob.guards.push(n);
  }
  /* cameras on the walls, sweeping */
  BankJob.cams = []; const camAt = [[-12.8, 15.6, Math.PI * 0.75], [12.8, -7.6, -Math.PI * 0.25], [12.8, 15.6, -Math.PI * 0.75]];
  for (let k = 0; k < J.cams; k++) { const [x, z, y0] = camAt[k]; K.box(x - 0.15, 3.6, z - 0.15, x + 0.15, 3.9, z + 0.15, 0x2a2a2a); const cone = bjCone(K, 10, 0.75, 0xff5050); cone.position.set(x, 0, z); BankJob.cams.push({ x, z, y0, yaw: y0, cone, ph: k * 2 }); }
  /* lasers across the corridor to the vault */
  BankJob.lasers = [];
  for (let k = 0; k < J.las; k++) { const z = -4 - k * 1.3, m = new THREE.Mesh(new THREE.BoxGeometry(11.4, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 0.2, 0.2), toneMapped: false })); m.material.__own = true; m.position.set(3.75, 0.9 + (k % 2) * 0.5, z); K.sc.add(m); K.box(-2.05, 0.8, z - 0.06, -1.95, 1.5, z + 0.06, 0x3a3a3a); K.box(9.45, 0.8, z - 0.06, 9.55, 1.5, z + 0.06, 0x3a3a3a); BankJob.lasers.push({ z, x0: -2, x1: 9.5, m, ph: k * 1.3 }); }
  BankJob.vd = vd; BankJob.vc = vc; BankJob.carts = carts;
  K.tick((dt) => BankJob.tick(dt));
};
/* ---------- the night: guards walk their rounds and look; the eye meter; the alarm ---------- */
BankJob.tick = function (dt) {
  if (!BankJob.on || Int.room !== 'job') return; const B = BankJob, J = B.J; B.t += dt; if (B.camOff > 0) B.camOff -= dt;
  const px = Int.x, pz = Int.z, sneak = !!Int.sneak, sp = Math.hypot(Int.vx, Int.vz), hmin = sneak ? 0.95 : 1.55; let seen = 0;
  for (const g of B.guards) {
    /* move */
    let tx, tz, vt = 1.05;
    if (B.alarm > 0) { tx = px; tz = pz; vt = 3.3; g.st = 'chase'; }
    else if (g.st === 'look') { tx = g.lx; tz = g.lz; vt = 1.5; }
    else { const q = g.path[g.pi]; tx = q[0]; tz = q[1]; }
    const dx = tx - g.x, dz = tz - g.z, d = Math.hypot(dx, dz);
    if (g.wait > 0) { g.wait -= dt; g.v = 0; g.state = 'stand'; if (g.st === 'look') g.yaw += Math.sin(B.t * 1.4 + g.seed) * dt * 1.2; if (g.wait <= 0 && g.st === 'look') g.st = 'patrol'; }
    else if (d < 0.3 && g.st !== 'chase') { if (g.st === 'look') g.wait = 2.6; else { g.wait = g.path[g.pi][2] || 1; g.pi = (g.pi + 1) % g.path.length; } }
    else { g.state = 'walk'; g.v = vt; const nx = g.x + dx / d * vt * dt, nz = g.z + dz / d * vt * dt, o = intResolve(nx, nz, 0.3, Int.cols, Int.bounds); g.x = o.x; g.z = o.z; g.yaw += angDiff(g.yaw, Math.atan2(dx, dz)) * Math.min(1, dt * 5); g.ph += TAU * vt / pedCyc(vt, g.app) * dt; }
    g.cone.position.set(g.x, 0, g.z); g.cone.rotation.y = g.yaw - Math.PI / 2;
    /* look */
    const ex = px - g.x, ez = pz - g.z, ed = Math.hypot(ex, ez), R = sneak ? 5.6 : 8.5, ang = Math.abs(angDiff(g.yaw, Math.atan2(ex, ez)));
    const inCone = ed < R && ang < 0.48 && bjSees(g.x, g.z, px, pz, hmin), heard = !sneak && ed < (sp > 3 ? 6 : 1.4) && bjSees(g.x, g.z, px, pz, 2.5);
    g.see = inCone ? 1 : 0;
    if (inCone) { seen = Math.max(seen, (1.6 * (1 - ed / R) + 0.55) * (sp > 3 ? 1.6 : 1) * (sneak ? 0.7 : 1)); if (B.eye > 0.3 && B.alarm <= 0) { g.st = 'look'; g.lx = px; g.lz = pz; g.wait = 0; } }
    else if (heard && B.alarm <= 0 && g.st !== 'look') { g.st = 'look'; g.lx = px; g.lz = pz; g.wait = 0; }
    g.cone.m.material.color.set(B.alarm > 0 ? 0xff3030 : inCone ? 0xffa040 : 0xffe8a0); g.cone.m.material.opacity = inCone ? 0.26 : 0.16;
    if (B.alarm > 0 && ed < 0.75) { B.caught = true; }
  }
  for (const c of B.cams) {
    c.yaw = c.y0 + Math.sin(B.t * 0.45 + c.ph) * 0.8; c.cone.rotation.y = c.yaw - Math.PI / 2; c.cone.visible = B.camOff <= 0;
    if (B.camOff > 0) continue; const ex = px - c.x, ez = pz - c.z, ed = Math.hypot(ex, ez), ang = Math.abs(angDiff(c.yaw, Math.atan2(ex, ez)));
    if (ed < 10 && ang < 0.38 && bjSees(c.x, c.z, px, pz, 2.6)) { seen = Math.max(seen, 1.2); c.cone.m.material.color.set(0xff2020); c.cone.m.material.opacity = 0.3; } else { c.cone.m.material.color.set(0xff5050); c.cone.m.material.opacity = 0.14; }
  }
  for (const L of B.lasers) { const on = Math.sin(B.t * 1.1 + L.ph) > -0.35; L.m.visible = on; if (on && B.alarm <= 0 && Math.abs(pz - L.z) < 0.18 && px > L.x0 && px < L.x1) { B.eye = 1; Int.say('You broke a laser beam!'); } }
  B.seen = seen > 0; if (seen > 0) { B.eye = Math.min(1, B.eye + seen * dt * 0.75); B.clean = false; } else B.eye = Math.max(0, B.eye - dt * 0.18);
  if (B.eye >= 1 && B.alarm <= 0) { B.alarm = 0.001; B.clean = false; Snd.beep(1200, 0.3); Int.say('ALARM! Get out before the police arrive!', 3); }
  if (B.alarm > 0) { B.alarm += dt; if (Int.K) Int.K.sc.background = lc((Math.floor(B.t * 3) & 1) ? 0x3a0808 : 0x0c0e12); if (B.alarm > 60) B.caught = true; }
  if (B.caught) BankJob.bust();
};
BankJob.crackStart = function () {
  const B = BankJob; if (B.crack >= 4) return;
  const Q = Int.busy = { freeze: true, u: 0, dir: 1, spd: 0.55 + B.tier * 0.12, z0: 0.3 + Math.random() * 0.4, w: 0.16 - B.tier * 0.015,
    hint: () => (TouchIn.on ? '<em>USE</em>' : '<em>E</em>') + ' when the tumbler lines up · ' + B.crack + ' / 4 · <em>Esc</em> step away',
    hud: () => BankJob.hud() + '<div class="ibar" style="margin-top:6px"><small>Vault dial · tumbler ' + (B.crack + 1) + ' of 4</small><div class="ibt"><i class="iz" style="left:' + (Q.z0 * 100) + '%;width:' + (Q.w * 100) + '%"></i><i class="ik" style="left:' + (Q.u * 100) + '%"></i></div></div>',
    tick(dt) { Q.u += Q.dir * Q.spd * dt; if (Q.u > 1) { Q.u = 1; Q.dir = -1; } else if (Q.u < 0) { Q.u = 0; Q.dir = 1; } },
    press() { if (Q.u >= Q.z0 && Q.u <= Q.z0 + Q.w) { B.crack++; Snd.beep(1400, 0.03); Q.z0 = 0.1 + Math.random() * 0.7; if (B.crack >= 4) { Int.busy = null; BankJob.openVault(); } } else { Snd.beep(160, 0.12); B.noise(2.3, -7.1); Int.say('Clunk. That was loud.', 1.4); } },
    cancel() { Int.busy = null; } };
};
BankJob.noise = function (x, z) { for (const g of BankJob.guards) if (Math.hypot(g.x - x, g.z - z) < 12 && BankJob.alarm <= 0) { g.st = 'look'; g.lx = x + (Math.random() - 0.5); g.lz = z + 1.2; g.wait = 0; } };
BankJob.openVault = function () {
  const B = BankJob; B.open = true; B.vc.off = true; Snd.win(); Int.say('The vault swings open.', 2.5);
  let a = 0; Int.ticks.push((dt) => { if (a < 1.55) { a = Math.min(1.55, a + dt * 0.8); B.vd.rotation.y = a; } });
};
BankJob.grab = function (c) {
  if (c.taken) return; const B = BankJob, Q = Int.busy = { freeze: true, t: 0, hint: () => 'Stuffing the bag…', hud: () => BankJob.hud(), tick(dt) { Q.t += dt; if (Q.t > 1.3) { Int.busy = null; c.taken = true; c.cash.visible = false; B.loot += B.J.cash; Snd.beep(900, 0.05); Int.say('+' + money(B.J.cash) + ' in the bag · ' + money(B.loot), 2); } } };
};
BankJob.hud = function () {
  const B = BankJob; if (!B.on) return '';
  const eye = Math.round(B.eye * 100), col = B.alarm > 0 ? '#ff4d5e' : eye > 60 ? '#ff9a3a' : eye > 0 ? '#ffd23d' : '#4be08a';
  const obj = B.alarm > 0 ? 'ALARM · police in ' + Math.max(0, Math.ceil(60 - B.alarm)) + ' s · get out the front door' : !B.open ? 'Find the vault at the back and crack the dial' : B.loot < B.J.cash * B.J.carts ? 'Grab the cash, then leave by the front door' : 'Bag full: walk out the front door';
  return '<div class="ibar"><small>' + (B.seen ? '👁 SEEN' : '👁') + ' · ' + money(B.loot) + ' in the bag' + (Int.sneak ? ' · crouching' : '') + (B.camOff > 0 ? ' · cameras looping ' + Math.ceil(B.camOff) + ' s' : '') + '</small><div class="ibt"><i class="iz" style="left:0;width:' + eye + '%;background:' + col + '"></i></div><small style="margin-top:5px">' + obj + '</small></div>';
};
BankJob.bust = function () {
  const B = BankJob, rec = B.rec; B.on = false; Int.busy = null; Int.hook = null; const R = intSave().banks[rec.key] = BankJob.record(rec.key); R.t = Date.now(); writeSave();
  UI.banner('CAUGHT', 'The guards have you · ' + rec.name); Snd.fail(); Int.panel(null);
  const h = 6 + B.tier * 3, jr = Jail.rec(); if (!jr) { Int.leave(true); return; }
  Jail.on = true; Jail.hrs = Jail.left = h; Jail.t = 0; Jail.why = 'caught robbing ' + rec.name; intSave().jail = (intSave().jail || 0) + 1;
  Int.rec = jr; Int.kind = INT_KINDS.jail; Int.hook = { allowHeat: true, left: () => Jail.release() }; E.intTitle.textContent = jr.name; E.intSub.textContent = jr.sub; Int.go('cells', 'bunk');
};
/* walking out: the take, a record, and the police if the alarm went */
BankJob.leave = function (rec) {
  const B = BankJob; if (!B.on || Int.room !== 'job') return; B.on = false; Int.hook = null;
  const R = intSave().banks[rec.key] = BankJob.record(rec.key), stars = B.loot <= 0 ? 0 : B.alarm > 0 ? 1 : B.clean ? 3 : 2;
  if (B.loot > 0) { save.money += B.loot; R.n++; R.best = Math.max(R.best, B.loot); R.stars = Math.max(R.stars, stars); R.t = Date.now(); }
  writeSave();
  setTimeout(() => {
    if (B.loot > 0) { UI.banner('BANK JOB', money(B.loot) + ' · ' + rec.name + ' · ' + '★'.repeat(stars) + '☆'.repeat(3 - stars)); Snd.win(); }
    else UI.toast('You left the bank empty-handed', 'info');
    if (B.alarm > 0) Wanted.crime('Bank robbery', B.J.st);
  }, 50);
};
(function () {   /* hook the banks: the job room's leaving, its HUD and the crouch */
  for (const k of ['bank', 'reserve']) {
    const D = INT_KINDS[k], main = D.rooms.main;
    D.rooms.main = function (K, rec, r) { main(K, rec, r); BankJob.dress(K, rec); };
    D.leave = (rec) => { if (Int.room === 'job') BankJob.leave(rec); };
    D.canLeave = () => Int.room !== 'job' || !BankJob.on || Int.z > Int.K.z1 - 2.5; D.canLeaveMsg = 'Walk out of the front door';
    D.hud = () => (Int.room === 'job' && BankJob.on ? BankJob.hud() : '');
  }
}());
