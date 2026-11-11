/* ================= BUSTED, part 1: the arrest on the street =================
   When the bust meter fills the game does not just fade out any more. A short film plays in the live world: patrol officers run in with
   flashlights, you put your hands up, turn around, get cuffed, hear your rights, get walked to the squad car and driven away.
   Everyone in it is a posed, articulated person (crPerson from the courtroom) standing in the real streets: the real officers and your own
   avatar are hidden for the duration. Hard-cut cameras, letterbox bars and subtitles. Part 2 (08_ps2_room.js) continues the story with booking,
   a mugshot and the interrogation room. A Skip button (or Esc) jumps straight to the paperwork. Settings > "Arrest cutscene: Quick" turns it all off. */
const Bust = { on: false, phase: 'off', t: 0, paused: false, S: null, A: null, ch: [], reason: '', out: null, cap: null, adv: false, gen: null, dt: 0.016, clock: 0, shotId: '', cp: null, lp: null, fov: 50, lowT: 0, tally: null, timer: 0 };
const _bsg = {}, _bsA = new THREE.Vector3(), _bsB = new THREE.Vector3();
const bsAng = (a, b, k) => a + angDiff(a, b) * clamp(k, 0, 1);
const bsEase = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const bsSm = (x) => sm01(clamp(x, 0, 1));
const bsPick = (a) => a[(Math.random() * a.length) | 0];

/* arm presets: [armL x, armL z, elbowL x, armR x, armR z, elbowR x] (negative x swings an arm forward/up; z swings it out) */
const BS_POSE = {
  idle: [-0.05, -0.08, -0.14, -0.05, 0.08, -0.14],
  up: [-2.3, -0.32, -0.45, -2.3, 0.32, -0.45],
  back: [0.6, 0.34, -0.12, 0.6, -0.34, -0.12],
  light: [0.18, -0.4, -1.2, -1.45, 0.06, -0.3],
  hip: [0.12, -0.42, -1.15, 0.12, 0.42, -1.15],
  reach: [-1.2, 0.12, -0.45, -1.2, -0.12, -0.45],
  grip: [0.1, -0.1, -0.2, -1.0, 0.5, -0.7],
  open: [0.12, -0.42, -1.15, -1.25, 0.1, -0.25],
  cross: [-0.75, 0.55, -2.05, -0.75, -0.55, -2.05]
};
const BS_NAMES = { cop1: 'Officer Reyes', cop2: 'Officer Tanaka', det: 'Detective Marlow' };

/* ---------- an actor: a crPerson with walking, facing and arm poses ---------- */
function bsActor(rig, x, z, yaw) {
  return { rig, x, z, yaw, tx: null, tz: null, spd: 1.4, face: null, pose: 'idle', ph: Math.random() * 6, v: 0, lean: 0, drop: 0, cur: BS_POSE.idle.slice(), hid: false, sc: 1, head: 0, sit: 0, flat: false };
}
function bsStep(a, dt, g) {
  let mv = 0;
  if (a.tx != null) {
    const dx = a.tx - a.x, dz = a.tz - a.z, d = Math.hypot(dx, dz);
    if (d < 0.06) a.tx = null; else { const s = Math.min(d, a.spd * dt); a.x += dx / d * s; a.z += dz / d * s; mv = a.spd; if (a.face == null) a.yaw = bsAng(a.yaw, Math.atan2(dx, dz), dt * 9); }
  }
  if (a.face != null) a.yaw = bsAng(a.yaw, a.face, 1 - Math.exp(-dt * 7));
  a.v = bsEase(a.v, mv, 10, dt); a.ph += a.v * dt * 2.9;
  const amp = clamp(a.v / 1.5, 0, 1) * 0.42 + clamp((a.v - 2) / 4, 0, 1) * 0.55, s = Math.sin(a.ph), r = a.rig, tgt = BS_POSE[a.pose] || BS_POSE.idle;
  for (let i = 0; i < 6; i++) a.cur[i] = bsEase(a.cur[i], tgt[i], 8, dt);
  const sw = (a.pose === 'idle' || a.pose === 'hip') ? amp * 0.9 : (a.pose === 'light' || a.pose === 'grip' || a.pose === 'cross') ? amp * 0.3 : 0;
  r.armL.rotation.x = a.cur[0] - s * sw * (a.pose === 'hip' ? 0.4 : 1); r.armL.rotation.z = a.cur[1]; r.elL.rotation.x = a.cur[2];
  r.armR.rotation.x = a.cur[3] + s * sw * (a.pose === 'hip' ? 0.4 : 1); r.armR.rotation.z = a.cur[4]; r.elR.rotation.x = a.cur[5];
  const si = a.sit; r.legL.rotation.x = s * amp * (1 - si) - si * 1.5; r.legR.rotation.x = -s * amp * (1 - si) - si * 1.5; r.knL.rotation.x = Math.max(0, -s) * amp * 1.2 * (1 - si) + si * 1.5; r.knR.rotation.x = Math.max(0, s) * amp * 1.2 * (1 - si) + si * 1.5;
  r.hips.position.y = 0.95 - Math.abs(s) * 0.025 * clamp(a.v, 0, 3) / 3 - a.drop - si * 0.38; r.tor.rotation.x = bsEase(r.tor.rotation.x, a.lean, 7, dt);
  r.tor.rotation.z = Math.sin(a.ph * 0.5) * 0.03 * clamp(a.v, 0, 1); r.head.rotation.y = bsEase(r.head.rotation.y, a.head, 6, dt);
  if (a.flat) r.root.position.set(a.x, 0, a.z); else { groundAt(a.x, a.z, g || _bsg); r.root.position.set(a.x, (g || _bsg).h, a.z); } r.root.rotation.y = a.yaw; r.root.scale.setScalar(a.sc); r.root.visible = !a.hid;
}
function bsOfficer(i) {
  const pal = crPal(), nav = lc(0x1f3a6e), r = crPerson({ skin: pal.skinA[i ? 1 : 2], hair: pal.hairA[i ? 0 : 4], jacket: nav, sleeve: nav, shirt: lc(0x3562b0), pants: lc(0x141a2a), shoe: lc(0x0a0a0c), tie: lc(0x0b0f1a), hat: lc(0x0f1830), hairStyle: i ? 'bun' : 'short', build: i ? 'slim' : 'stout', s: i ? 0.98 : 1.04 });
  const g = new GB(0, 0, false), BELT = lc(0x0d0d10), STEEL = lc(0xb8bec6), GOLD = lc(0xe3b341);
  { const wf = i ? 0.9 : 1.16, dz = (wf + 1) / 2; crObx(g, 0, 0.05, 0, 0.35 * wf + 0.012, 0.055, 0.215 * dz + 0.012, BELT, 0.2); crObx(g, 0.17 * wf + 0.04, -0.05, 0.015, 0.055, 0.17, 0.11, BELT, 0.1); crObx(g, -0.13 * wf, 0.045, 0.1 * dz, 0.05, 0.075, 0.04, lc(0x1b1b20), 0.1); crObx(g, 0.0, 0.05, 0.107 * dz + 0.008, 0.045, 0.045, 0.012, STEEL, 0.5); }
  r.hips.add(g.mesh(CR.mats.pol, false, false));
  const wf = i ? 0.9 : 1.16, dz = (wf + 1) / 2, t = new GB(0, 0, false); crObx(t, 0.085 * wf, 0.36, 0.107 * dz + 0.012, 0.045, 0.052, 0.012, GOLD, 0.6); crObx(t, -0.1 * wf, 0.39, 0.104 * dz + 0.012, 0.045, 0.075, 0.03, lc(0x1b1b20), 0.2); crObx(t, -0.115 * wf, 0.45, 0.104 * dz + 0.012, 0.01, 0.08, 0.01, lc(0x1b1b20), 0); crObx(t, 0, 0.18, 0.103 * dz + 0.01, 0.28 * wf, 0.03, 0.02, lc(0x1b1b20), 0.1);
  r.tor.add(t.mesh(CR.mats.pol, false, false));
  const fl = new GB(0, 0, false); crCyl(fl, 0, -0.1, 0, 0.028, 0.24, 0.028, lc(0x15161a), 0.4); crCyl(fl, 0, -0.23, 0, 0.042, 0.05, 0.042, STEEL, 0.5);
  r.light = fl.mesh(CR.mats.pol, false, false); r.light.position.set(0, -0.3, 0.02); r.elR.add(r.light);
  const bm = new THREE.Mesh(new THREE.ConeGeometry(0.42, 4.2, 14, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.1, 0.09, 0.07), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  bm.position.set(0, -2.35, 0); r.light.add(bm); r.beam = bm;
  return r;
}
function bsPlayer() {
  const a = footApp(), jk = a.shirt, r = crPerson({ skin: a.skin, hair: a.hair, jacket: jk, sleeve: jk, shortSl: !a.sleeve, shirt: lc(0xe8e8ee), pants: a.pants, shoe: a.shoe, hairStyle: a.hst || 'short', hat: a.hat, glasses: a.glasses, glassC: a.glassC, shorts: a.shorts, casual: true, fem: a.fem, beard: a.beard });
  const STEEL = lc(0xc3c9d1); r.cuffs = [];
  for (const el of [r.elL, r.elR]) { const g = new GB(0, 0, false); crCyl(g, 0, -0.295, 0, 0.042, 0.04, 0.042, STEEL, 0.6); crObx(g, 0, -0.295, 0.04, 0.022, 0.035, 0.02, lc(0x555a62), 0.4); const m = g.mesh(CR.mats.pol, false, false); m.visible = false; el.add(m); r.cuffs.push(m); }
  const ch = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x9aa1aa, roughness: 0.35, metalness: 0.6 })); ch.visible = false; r.chain = ch;
  return r;
}

/* ---------- which crimes put you here ---------- */
const BS_CHARGE = { 'Carjacking': 'Carjacking', 'Assault': 'Assault', 'Hit and run': 'Hit and run', 'Ramming police': 'Ramming police vehicles', 'Wrecked a patrol car': 'Destroying police property', 'Assaulting an officer': 'Assaulting a police officer', 'Running over an officer': 'Vehicular assault on an officer', 'Wrecked while wanted': 'Reckless driving', 'Wanted': 'Disorderly conduct' };
Bust.charges = function (reason) {
  const L = []; for (const w of Wanted.log) { const c = BS_CHARGE[w] || w; if (L.indexOf(c) < 0) L.push(c); }
  if (!L.length) { const c = BS_CHARGE[reason] || reason; if (c && c !== 'Wanted') L.push(c); }
  if (Wanted.peak >= 2 || Wanted.age > 25 || !L.length) L.unshift('Evading police');
  return L.slice(0, 5);
};

/* ---------- start (called by Police.arrest) ---------- */
Bust.begin = function (reason) {
  CR.init(); Bust.on = true; Bust.phase = 'street'; Bust.t = 0; Bust.reason = reason; Bust.ch = Bust.charges(reason); Bust.out = null; Bust.cap = null; Bust.gen = null; Bust.shotId = ''; Bust.cp = null; Bust.paused = false; Bust.bi = 0; Bust.tally = null;
  for (const k in Keys) Keys[k] = false; Keys.Space = true; /* handbrake: the car stays put */
  car.vx = car.vz = 0; car.speed = 0;
  Bust.stage(); document.body.classList.add('cut'); E.bust.hidden = false; E.bust.className = 'screen street'; E.bSkip.hidden = false; E.bCap.hidden = true; E.bLower.hidden = true; E.bCard.hidden = true; E.bChoice.hidden = true; E.bTop.hidden = true; E.bTitle.className = '';
  Bust.say('cop1', Foot.on ? 'POLICE! Freeze! Show me your hands, now!' : 'POLICE! Step out of the vehicle! Show me your hands, now!');
};

Bust.stage = function () {
  const c = car, sn = Math.sin(c.yaw), cs = Math.cos(c.yaw), inCar = !Foot.on, h0 = inCar ? c.yaw : Foot.yaw;
  const loc = (lx, lz) => [c.x + cs * lx + sn * lz, c.z - sn * lx + cs * lz];
  const inCarBox = (x, z, mx, mz) => { const dx = x - c.x, dz = z - c.z, lx = dx * cs - dz * sn, lz = dx * sn + dz * cs; return Math.abs(lx) < mx && Math.abs(lz) < mz; };
  /* where you will stand */
  let Y;
  if (!inCar) Y = [Foot.x, Foot.z];
  else {
    Y = null; for (const [lx, lz] of [[2.2, 0.4], [-2.2, 0.4], [2.5, -1.6], [-2.5, -1.6], [2.7, 1.8], [-2.7, 1.8], [0, -4.6], [0, 4.8]]) { const p = loc(lx, lz); if (!policeSolid(p[0], p[1], 0.8)) { Y = p; break; } }
    if (!Y) Y = loc(2.2, 0.4);
  }
  /* the squad car: the nearest patrol unit, moved to a clear spot ~7 m away with its door side facing you */
  let u = null, best = 1e9;
  for (const q of Police.units) { if (q.mode === 'dead') continue; const d = Math.hypot(q.x - Y[0], q.z - Y[1]) + (q.k === 'swat' ? 30 : 0); if (d < best) { best = d; u = q; } }
  if (!u) u = Police.newUnit('patrol', Y[0] - Math.sin(h0) * 8, Y[1] - Math.cos(h0) * 8, h0, 'park');
  let C = null;
  const rings = [7.4, 8.6, 6.4, 9.8];
  search: for (const R of rings) for (const a of [Math.PI, Math.PI * 0.75, -Math.PI * 0.75, Math.PI * 0.5, -Math.PI * 0.5, Math.PI * 0.25, -Math.PI * 0.25, 0, Math.PI * 0.9, -Math.PI * 0.9]) {
    const x = Y[0] + Math.sin(h0 + a) * R, z = Y[1] + Math.cos(h0 + a) * R;
    if (policeSolid(x, z, 2.7) || inCarBox(x, z, 3.1, 4.6)) continue;
    let ok = true; for (const q of Police.units) if (q !== u && Math.hypot(q.x - x, q.z - z) < 4.2) ok = false; if (!ok) continue;
    for (let k = 1; k < 5; k++) { const sx = Y[0] + (x - Y[0]) * k / 5, sz = Y[1] + (z - Y[1]) * k / 5; if (policeSolid(sx, sz, 0.5) || inCarBox(sx, sz, 1.55, 3.0)) ok = false; }
    if (ok) { C = [x, z]; break search; }
  }
  if (!C) C = [Y[0] + Math.sin(h0 + Math.PI) * 7.4, Y[1] + Math.cos(h0 + Math.PI) * 7.4];
  let dx = Y[0] - C[0], dz = Y[1] - C[1]; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
  u.x = C[0]; u.z = C[1]; u.yaw = Math.atan2(-dz, dx); u.v = 0; u.kx = u.kz = 0; u.mode = 'park'; u.brake = true; Police.place(u);
  const us = Math.sin(u.yaw), uc = Math.cos(u.yaw), door = [C[0] + uc * 1.12 - us * 0.5, C[1] - us * 1.12 - uc * 0.5];
  let fx = door[0] - Y[0], fz = door[1] - Y[1]; const dist = Math.hypot(fx, fz) || 1; fx /= dist; fz /= dist;
  const S = Bust.S = { Y, C, door, f: [fx, fz], r: [fz, -fx], dist, u, inCar, gone: false, go: 0, drive: 1 };
  /* drive-away direction: forward unless something is in the way */
  const fw = [Math.sin(u.yaw), Math.cos(u.yaw)]; S.drive = (policeSolid(C[0] + fw[0] * 9, C[1] + fw[1] * 9, 1.6) && !policeSolid(C[0] - fw[0] * 9, C[1] - fw[1] * 9, 1.6)) ? -1 : 1;
  /* the cast */
  const A = Bust.A = { you: bsActor(bsPlayer(), Y[0], Y[1], Math.atan2(fx, fz)), cop1: bsActor(bsOfficer(0), 0, 0, 0), cop2: bsActor(bsOfficer(1), 0, 0, 0) };
  const W = Bust.W = (a, b) => [Y[0] + S.r[0] * a + fx * b, Y[1] + S.r[1] * a + fz * b];
  const st1 = [door[0] + S.r[0] * 0.5, door[1] + S.r[1] * 0.5], st2 = [door[0] - S.r[0] * 0.8 + fx * 0.3, door[1] - S.r[1] * 0.8 + fz * 0.3];
  const gap = clamp(dist - 1.6, 1.0, 2.5);
  A.cop1.x = st1[0]; A.cop1.z = st1[1]; A.cop2.x = st2[0]; A.cop2.z = st2[1]; A.cop1.spd = 6.0; A.cop2.spd = 5.6; A.cop1.pose = A.cop2.pose = 'light'; A.cop1.yaw = A.cop2.yaw = Math.atan2(-fx, -fz);
  const p1 = W(0.75, gap), p2 = W(-1.05, gap - 0.4); A.cop1.tx = p1[0]; A.cop1.tz = p1[1]; A.cop2.tx = p2[0]; A.cop2.tz = p2[1];
  A.you.pose = 'up'; A.you.face = Math.atan2(fx, fz);
  for (const k of ['you', 'cop1', 'cop2']) { scene.add(A[k].rig.root); } scene.add(A.you.rig.chain);
  A.cop1.face = null; A.cop2.face = null;
  const walk = Math.max(2.4, (dist - 1.9) / 1.4), T = Bust.T = { s2: 4.2, s3: 7.4, c1: 8.7, c2: 9.5, s4: 12.2 };
  T.arr = T.s4 + 1.2 + walk; T.open = T.arr + 0.2; T.duck = T.arr + 0.9; T.slam = T.arr + 2.1; T.go = T.slam + 1.0; T.end = T.go + 4.0; Bust.walk = walk;
  Bust.beats = [
    [0.0, () => { A.you.pose = 'up'; }],
    [2.7, () => Bust.say('cop2', 'Don’t move! Keep them where I can see them!')],
    [T.s2 - 0.1, () => { A.cop1.pose = 'hip'; A.cop2.pose = 'light'; }],
    [T.s2, () => { Bust.say('cop1', 'Turn around. Slowly. Hands behind your back.'); A.you.face = Math.atan2(-fx, -fz); }],
    [T.s2 + 1.7, () => { A.you.pose = 'back'; A.you.lean = 0.04; }],
    [T.s2 + 2.4, () => { A.cop1.pose = 'hip'; const q = W(1.1, 2.2); A.cop1.tx = q[0]; A.cop1.tz = q[1]; A.cop1.spd = 1.4; A.cop1.face = Math.atan2(-fx, -fz) + 0.25; const w = W(0.12, 0.82); A.cop2.tx = w[0]; A.cop2.tz = w[1]; A.cop2.spd = 1.5; A.cop2.face = Math.atan2(-fx, -fz); }],
    [T.s3, () => { A.cop2.pose = 'reach'; Bust.say('cop2', 'You’re under arrest for ' + (Bust.ch[0] || 'evading police').toLowerCase() + '.'); Bust.lower(); }],
    [T.c1, () => { A.you.rig.cuffs[0].visible = true; Bust.click(); }],
    [T.c2, () => { A.you.rig.cuffs[1].visible = true; A.you.rig.chain.visible = true; Bust.click(); Bust.say('cop2', 'You have the right to remain silent. Anything you say can and will be used against you in a court of law.'); }],
    [T.c2 + 1.4, () => { A.cop2.pose = 'hip'; }],
    [T.s4 - 0.4, () => { Bust.say('cop1', 'Alright. Let’s go. Watch your step.'); E.bLower.hidden = true; }],
    [T.s4, () => {
      A.you.face = null; A.you.spd = 1.3; A.cop1.face = null; A.cop1.pose = 'grip'; A.cop2.face = null;
      const e = W(0, dist - 1.15), e1 = W(0.78, dist - 1.0), e2 = W(-0.2, dist - 2.5); A.you.tx = e[0]; A.you.tz = e[1]; A.cop1.tx = e1[0]; A.cop1.tz = e1[1]; A.cop1.spd = 1.3; A.cop2.tx = e2[0]; A.cop2.tz = e2[1]; A.cop2.spd = 1.35; A.you.lean = 0.12;
    }],
    [T.open, () => { A.cop1.pose = 'open'; A.cop1.face = Math.atan2(door[0] - A.cop1.x, door[1] - A.cop1.z); A.you.face = Math.atan2(door[0] - A.you.x, door[1] - A.you.z); }],
    [T.duck, () => { A.you.lean = 0.7; A.you.drop = 0.28; A.cop1.pose = 'open'; }],
    [T.duck + 0.5, () => { S.enter = Bust.t; }],
    [T.slam, () => { Snd.door(); S.slam = 1; A.you.hid = true; A.you.rig.chain.visible = false; A.cop1.hid = A.cop2.hid = true; Bust.say('cop2', 'Dispatch, one in custody. Transporting to County.'); }],
    [T.go, () => { S.go = 1; }],
    [T.end - 1.4, () => UI.fade(true, '', '')]
  ];
};

Bust.say = function (who, text) {
  Bust.cap = { text, n: 0 }; E.bWho.textContent = BS_NAMES[who] || who || ''; E.bTxt.textContent = ''; E.bCap.hidden = false; Bust.capT = 0;
  const w = who || ''; const el = E.bCap; el.classList.toggle('narr', !w);
};
Bust.lower = function () { E.bLowerT.textContent = 'Charges'; E.bLowerL.innerHTML = Bust.ch.map((c) => '<i>' + esc(c) + '</i>').join(''); E.bLower.hidden = false; };
Bust.click = function () {
  if (!Snd.ok) return; const t = Snd.ctx.currentTime;
  Snd.noiseHit(t, 0.03, 0.9, 3000, 0, Snd.sfx); Snd.tone(t, 1800, 0.05, 'square', 0.1, 6000, 0.001, Snd.sfx); Snd.noiseHit(t + 0.06, 0.04, 0.7, 2400, 0, Snd.sfx); Snd.tone(t + 0.06, 1400, 0.05, 'square', 0.08, 5000, 0.001, Snd.sfx);
  Cam.shake = Math.max(Cam.shake, 0.25);
};

/* ---------- per step (while the world still runs behind the film) ---------- */
Bust.update = function (dt) {
  if (Bust.phase !== 'street') return;
  if (Bust.paused) dt = 0;
  const S = Bust.S, A = Bust.A; if (!S) return;
  Bust.t += dt; const t = Bust.t, T = Bust.T;
  while (Bust.bi < Bust.beats.length && Bust.beats[Bust.bi][0] <= t) Bust.beats[Bust.bi++][1]();
  /* the walk to the car, with the arresting officer holding your arm */
  if (t >= T.s4 && t < T.arr + 0.3) { A.you.face = null; }
  /* getting into the car: shuffle sideways through the door */
  if (S.enter && !S.slam) { const k = bsSm((t - S.enter) / 0.55), u = S.u, us = Math.sin(u.yaw), uc = Math.cos(u.yaw), dir = [uc, -us]; A.you.x = S.door[0] - dir[0] * 0.2 * k; A.you.z = S.door[1] - dir[1] * 0.2 * k; A.you.sc = 1 - 0.25 * k; A.you.drop = 0.28 + 0.2 * k; }
  for (const k in A) bsStep(A[k], dt);
  Bust.rigs(dt);
  /* the squad car: lights, a bounce when the door slams, then off it goes */
  const u = S.u; Police.flash(u, true);
  if (S.slam && !S.bounced) { S.bounced = true; u.g.position.y += 0.0; Cam.shake = Math.max(Cam.shake, 0.35); }
  if (S.go) {
    S.go += dt; u.v = Math.min(11, u.v + dt * 3.4 * Math.min(1, S.go)); const fw = Math.sin(u.yaw), fc = Math.cos(u.yaw);
    u.x += fw * u.v * dt * S.drive; u.z += fc * u.v * dt * S.drive; u.brake = false;
  } else { u.v = 0; u.brake = true; }
  Police.place(u);
  /* everyone else stands down; the real officers stay hidden */
  for (const q of Police.units) { if (q === u) continue; q.v *= Math.max(0, 1 - dt * 3); Police.flash(q, true); Police.place(q); }
  Snd.siren(S.go ? clamp(1 - (S.go - 1) / 3.2, 0, 1) * 0.55 : 0.5);
  /* captions: typewriter */
  if (Bust.cap) { const c = Bust.cap; c.n = Math.min(c.text.length, c.n + (dt || 0.016) * 62); const s = c.text.slice(0, Math.floor(c.n)); if (E.bTxt.textContent !== s) E.bTxt.textContent = s; Bust.capT += dt; if (c.n >= c.text.length && Bust.capT > 3.2 + c.text.length * 0.02 && t < T.slam) { E.bCap.hidden = true; Bust.cap = null; } }
  if (t >= T.end) Bust.toBooking();
};
/* flashlight beams and the chain between the cuffs follow the poses */
Bust.rigs = function (dt) {
  const A = Bust.A; if (!A) return;
  for (const k of ['cop1', 'cop2']) { const r = A[k].rig; r.beam.visible = !A[k].hid && (A[k].pose === 'light'); const li = 0.05 + 0.2 * clamp(env.lampOn, 0, 1); r.beam.material.color.setRGB(li, li * 0.92, li * 0.75); }
  const y = A.you.rig; if (y.chain.visible) {
    y.root.updateMatrixWorld(true); y.elL.localToWorld(_bsA.set(0, -0.3, 0)); y.elR.localToWorld(_bsB.set(0, -0.3, 0));
    const d = _bsA.distanceTo(_bsB); y.chain.position.copy(_bsA).add(_bsB).multiplyScalar(0.5); y.chain.scale.set(0.022, 0.022, Math.max(0.01, d)); y.chain.lookAt(_bsB);
  }
};

/* ---------- the cameras ---------- */
Bust.camera = function (dt) {
  if (!Bust.on || Bust.phase !== 'street' || !Bust.S || App.mode !== 'play') return;
  const S = Bust.S, A = Bust.A, T = Bust.T, t = Bust.t, W = Bust.W, f = S.f, D = S.dist, you = A.you;
  Cockpit.group.visible = false; car.ext.visible = true;
  let id, p, l, fov, h;
  const lk = (a, b, y) => { const q = W(a, b); return [q[0], y, q[1]]; };
  const gh = (x, z) => terrainHeight(x, z);
  if (t < T.s2) {
    id = 'a'; const k = bsSm(t / T.s2), q0 = W(-3.9, D + 2.4), q1 = W(-2.5, D * 0.5); h = lerp(4.8, 1.9, k); p = [lerp(q0[0], q1[0], k), 0, lerp(q0[1], q1[1], k)]; l = lk(0, 0, A.you.rig.root.position.y + 1.45); fov = 50;
  } else if (t < T.s3) {
    id = 'b'; const k = bsSm((t - T.s2) / (T.s3 - T.s2)), q0 = W(3.5, 4.9), q1 = W(3.0, 4.3); h = 1.55; p = [lerp(q0[0], q1[0], k), 0, lerp(q0[1], q1[1], k)]; l = lk(0, 0, you.rig.root.position.y + 1.42); fov = 38;
  } else if (t < T.s4) {
    id = 'c'; const k = bsSm((t - T.s3) / (T.s4 - T.s3)), q0 = W(-2.0, 1.9), q1 = W(-1.55, 1.2); h = 1.15 - 0.1 * k; p = [lerp(q0[0], q1[0], k), 0, lerp(q0[1], q1[1], k)]; l = lk(0.0, 0.5, you.rig.root.position.y + 0.95); fov = 34;
  } else if (t < T.open) {
    id = 'd'; const q = [you.x + S.r[0] * -3.5 + f[0] * 0.9, you.z + S.r[1] * -3.5 + f[1] * 0.9]; h = 1.5; p = [q[0], 0, q[1]]; l = [you.x + f[0] * 0.6, you.rig.root.position.y + 1.2, you.z + f[1] * 0.6]; fov = 46;
  } else if (t < T.slam) {
    id = 'e'; const q = W(-2.3, D - 2.7); h = 1.35; p = [q[0], 0, q[1]]; l = [S.door[0], gh(S.door[0], S.door[1]) + 1.05, S.door[1]]; fov = 42;
  } else {
    id = 'f'; const k = clamp((t - T.slam) / 5, 0, 1), q = W(-5.4, D * 0.45); h = 2.4 + 1.4 * k; p = [q[0], 0, q[1]]; const u = S.u; l = [lerp(S.C[0], u.x, 0.8), gh(u.x, u.z) + 1.0, lerp(S.C[1], u.z, 0.8)]; fov = 48;
  }
  /* keep the lens out of walls and the ground */
  let px = p[0], pz = p[2], tries = 0; while (tries++ < 5 && policeSolid(px, pz, 0.7)) { px = lerp(px, you.x, 0.28); pz = lerp(pz, you.z, 0.28); }
  /* and out of your own car: not inside it, and not looking at you through its roof (on foot the car can be anywhere) */
  { const cs = Math.sin(car.yaw), cc = Math.cos(car.yaw);
    const cb = (x, z, m) => { const dx = x - car.x, dz = z - car.z, lx = cc * dx - cs * dz, lz = cs * dx + cc * dz; return Math.abs(lx) < 1.15 + m && Math.abs(lz) < 2.6 + m; };
    if (cb(px, pz, 0.5)) { const dx = px - car.x, dz = pz - car.z, l = Math.hypot(dx, dz) || 1; for (let i = 0; i < 12 && cb(px, pz, 0.5); i++) { px += dx / l * 0.5; pz += dz / l * 0.5; } } }
  const py = Math.max(gh(px, pz) + 0.7, gh(px, pz) + h);
  if (!Bust.cp || Bust.shotId !== id) { Bust.cp = Bust.cp || new THREE.Vector3(); Bust.lp = Bust.lp || new THREE.Vector3(); Bust.cp.set(px, py, pz); Bust.lp.set(l[0], l[1], l[2]); Bust.shotId = id; }
  else { const k = Math.min(1, (dt || 0.016) * 9); Bust.cp.x += (px - Bust.cp.x) * k; Bust.cp.y += (py - Bust.cp.y) * k; Bust.cp.z += (pz - Bust.cp.z) * k; Bust.lp.x += (l[0] - Bust.lp.x) * k; Bust.lp.y += (l[1] - Bust.lp.y) * k; Bust.lp.z += (l[2] - Bust.lp.z) * k; }
  const sh = Math.sin(t * 1.7) * 0.012, sh2 = Math.cos(t * 1.3) * 0.01;
  camera.position.set(Bust.cp.x + sh, Bust.cp.y + sh2, Bust.cp.z); camera.lookAt(Bust.lp);
  const af = camera.aspect < 1.33 ? Math.min(100, 2 * Math.atan(Math.tan(fov * DEG / 2) * 1.33 / camera.aspect) / DEG) : fov;
  if (Math.abs(camera.fov - af) > 0.05) { camera.fov = af; camera.updateProjectionMatrix(); }
};

/* ---------- leaving the street: fade, then the station ---------- */
Bust.endStreet = function () {
  const A = Bust.A; if (A) for (const k in A) { scene.remove(A[k].rig.root); A[k].rig.root.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.dispose && !m.userData.keep) m.geometry.dispose(); }); }
  if (A && A.you.rig.chain) { scene.remove(A.you.rig.chain); A.you.rig.chain.geometry.dispose(); }
  Bust.A = null; document.body.classList.remove('cut');
  const S = Bust.S; if (S && S.u) { /* the squad car is long gone */ Police.removeUnit(S.u); }
  Snd.siren(0);
};
Bust.toBooking = function () {
  if (Bust.phase !== 'street') return;
  Bust.phase = 'toBooking'; Bust.endStreet(); E.bCap.hidden = true; E.bLower.hidden = true; Bust.startRoom();
};
