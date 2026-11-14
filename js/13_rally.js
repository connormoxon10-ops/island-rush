/* ================= RALLY: STAGE FLOW =================
   Hollow Pines is a point-to-point forest stage. It is reached from the race office lobby ("Rally stage"). Starting it lends you the Ridgeback RS,
   hides the island, builds the stage (13_rallycore.js model, 13_rallygfx.js meshes) and counts you down on the line. While Rally.on is true the
   normal game keeps running with a few hooks: groundAt() and terrainHeight() answer from the stage grid, collideStatic() asks Rally.collide for trunks
   and gate posts, every physics sub-step calls Rally.sub (breakable gates), step() hands over to Rally.update (clock, splits, pace notes, effects)
   and updateEnvironment() hands over to Rally.env (low forest sun, haze, exposure that adapts to shade and clearings). */
const Rally = {
  on: false, lobby: false, phase: 'off', ready: false, sim: null, t: 0, clock: 0, penalty: 0, s: 0, lat: 0, hint: 0, sec: 0, opn: 0.5, cp: 0, splits: [], best: null,
  saved: null, hidden: [], sun: null, expo: 1, lit: 0.6, resets: 0, smashed: 0, jumpBest: 0, air: null, combo: 0, comboT: 0, stuck: 0, wrong: 0, safeS: 0, safeT: 0, hudT: 0, noteI: 0, tod: 2, loading: false, count: 0, doneT: 0
};
const RY_TODS = [
  { n: 'Dawn mist', tod: 6.9, fog: 0.0074, tint: [0.88, 0.94, 1.02], shaft: 1.0, sun: 2.5, expo: 1.08 },
  { n: 'Midday', tod: 12.3, fog: 0.0036, tint: [1, 1, 1], shaft: 0.5, sun: 3.0, expo: 1.0 },
  { n: 'Golden hour', tod: 17.0, fog: 0.0054, tint: [1.04, 0.96, 0.86], shaft: 1.0, sun: 2.9, expo: 1.05 },
  { n: 'Dusk', tod: 18.95, fog: 0.0058, tint: [0.9, 0.86, 0.95], shaft: 0.55, sun: 2.0, expo: 1.2 }
];
const RY_MEDAL = [1.02, 0.92, 0.85];   /* bronze, silver, gold as a share of par */
const RY_DUST = [[0.66, 0.5, 0.33], [0.66, 0.62, 0.54], [0.24, 0.17, 0.11], [0.82, 0.7, 0.5]];
const RYP = { dust: null, grit: null, ok: false };
const _ryCar = { x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, L: 4, W: 1.9, own: true }, _ryLoc = { i: 0, s: 0, d: 0, l: 0 }, _ryH = [], _ryQ = {};

/* ---------------- driving assist ----------------
   The stock bicycle model is faithful and twitchy: a rally AWD car on loose dirt power-oversteers the moment the wheel moves, and a keyboard driver can not catch it.
   Hollow Pines therefore runs a stability layer after every car step (Rally.assist, on by default, lobby switch). It does three things:
   - yaw: pulls the yaw rate toward what the steering angle is asking for (v * tan(delta) / L), so the car turns as much as you steer and no more, and straightens itself when you let go;
   - sideslip: bleeds off sideways velocity so the tyres 'bite' instead of the car skating, which also kills the snap-spin after a bump or a landing;
   - power: the traction limiter cuts the engine earlier and harder as the rear tyres run out of grip.
   The handbrake switches most of it off so flicks and drifts are still yours to throw. In the air only the yaw rate is damped. */
const RY_CTL = { yaw: 9.0, slide: 3.4, air: 2.2, hand: 0.25, minV: 2.5 };
Rally.assistOn = function () { return save.rally.assist !== 0; };
Rally.assist = function (c, h, force) {
  if (!force && !Rally.assistOn()) return;   /* rivals always drive with it: their autopilot relies on it */
  if (c.air) { c.w *= Math.max(0, 1 - RY_CTL.air * h); return; }
  const s = Math.sin(c.yaw), co = Math.cos(c.yaw); let vf = c.vx * s + c.vz * co, vr = c.vx * co - c.vz * s; const spd = Math.abs(vf);
  if (spd < RY_CTL.minV) return;
  const k = c.hand > 0.5 ? RY_CTL.hand : 1, wT = vf * Math.tan(c.delta || 0) / CARP.L;
  c.w += (wT - c.w) * Math.min(1, RY_CTL.yaw * k * h);
  vr *= 1 - Math.min(1, RY_CTL.slide * k * h);
  c.vx = vf * s + vr * co; c.vz = vf * co - vr * s;
};

/* ---------------- physics hooks ---------------- */
Rally.collide = function (c, px, pz, R, P) {
  RY.hits(px, pz, R, _ryH);
  for (let i = 0; i < _ryH.length; i++) { const h = _ryH[i];
    if (h.net) {   /* a crash net gives: it takes the car in, soaks up the speed going into it and lets go without a bounce or a dent */
      if (h.pen > 0) {   /* it gives 30 cm, never more; the speed it takes off comes from the impact (friction against the net in proportion to how hard the car hits it), so a hard hit is caught and a car sliding along it is not glued there */
        const push = h.pen > 0.3 ? h.pen - 0.3 + 0.1 : h.pen * 0.35; c.x += h.nx * push; c.z += h.nz * push; const vn = c.vx * h.nx + c.vz * h.nz;
        if (vn < 0) { const k = h.pen > 0.3 ? 1 : 0.9, tx = -h.nz, tz = h.nx, vt = c.vx * tx + c.vz * tz, fr = Math.min(Math.abs(vt), 0.8 * -vn * k) * Math.sign(vt); c.vx -= h.nx * vn * k + tx * fr; c.vz -= h.nz * vn * k + tz * fr; c.w *= 0.985; }
        c.net = 1; }
      continue;
    }
    if (h.pen > 0) contact(c, px, pz, h.nx, h.nz, h.pen, 0, 0, P); if (h.rail && h.pen + 0.1 > (c.rail || 0)) { c.rail = h.pen + 0.1; c.railX = px - h.nx * R; c.railZ = pz - h.nz * R; } }   /* a wall in the way: stepCar scrapes speed off while it lasts (and the effects pass throws stone dust from the contact point) */
  /* a ravine: below the lip the far wall is solid (no climbing a cliff), and a car down there has fallen in */
  for (const rv of RY.ravines) {
    const dx = px - rv.x, dz = pz - rv.z, u = dx * rv.tx + dz * rv.tz; if (u < -2 || u > rv.span + 2 || Math.abs(dx * rv.tz - dz * rv.tx) > 60) continue;
    if (c.y < rv.lipY - 2.2 && u > 0.5) c.fell = rv;
    if (u > rv.span - 2.8 && c.y < rv.deckY - 0.8) { if (c.y < rv.deckY - 1.5) { contact(c, px, pz, -rv.tx, -rv.tz, u - (rv.span - 2.8), 0, 0, P); c.fell = rv; } }   /* clipping the deck's edge just bumps the car up onto it; arriving well below it is a fall */
  }
  const sim = Rally.sim; if (!sim) return;
  for (const G of sim.walls) {
    const gx = px - G.x, gz = pz - G.z; if (gx * gx + gz * gz > 144) continue;
    for (const p of G.posts) { const dx = px - p.x, dz = pz - p.z, rr = 0.34 + R, d2 = dx * dx + dz * dz; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; contact(c, px, pz, dx / d, dz / d, rr - d, 0, 0, P); } }
  }
};
/* every physics sub-step: the car meets the planks, wreckage moves, air time is tracked */
Rally.sub = function (c, h) {
  Rally.assist(c, h);
  const sim = Rally.sim; if (!sim) return;
  _ryCar.x = c.x; _ryCar.y = c.y; _ryCar.z = c.z; _ryCar.yaw = c.yaw; _ryCar.vx = c.vx; _ryCar.vz = c.vz; _ryCar.L = CUR.body.L; _ryCar.W = CUR.body.W;
  const took = RW.carStep(sim, _ryCar);
  if (took > 0) { c.vx *= 1 - took; c.vz *= 1 - took; }
  if (sim.live.length) RW.bulldoze(sim, _ryCar);
  RW.step(sim, h);
  if (c.air) { if (!Rally.air) Rally.air = { t: 0, x: c.x, z: c.z, y: c.y, maxY: c.y }; Rally.air.t += h; Rally.air.maxY = Math.max(Rally.air.maxY, c.y); }
  else if (Rally.air) { Rally.landed(c); Rally.air = null; }
  if (RR.on) RR.sub(c, h);
};
Rally.landed = function (c) {
  const A = Rally.air, d = Math.hypot(c.x - A.x, c.z - A.z), up = A.maxY - Math.min(A.y, c.y);
  if (A.t > 0.45 && d > 6 && Rally.phase === 'run') {
    const big = A.t > 1.25 || d > 30;
    Rally.pop((big ? 'BIG AIR' : 'AIR') + ' · ' + Math.round(d) + ' m', big ? 'big' : '');
    if (d > Rally.jumpBest) Rally.jumpBest = d;
    Cam.shake = Math.max(Cam.shake, Math.min(2.4, 0.6 + d * 0.035));
    if (RYP.ok) { const n = 22 + Math.min(40, d); for (let i = 0; i < n; i++) { const a = Math.random() * TAU, sp = 1.5 + Math.random() * 6; Rally.puff(c.x + Math.cos(a) * 1.2, c.y + 0.2, c.z + Math.sin(a) * 1.2, Math.cos(a) * sp + c.vx * 0.25, 0.6 + Math.random() * 1.6, Math.sin(a) * sp + c.vz * 0.25, 1.1 + Math.random() * 1.4, 0.9, 3.2, 0.5); } }
  }
};

/* ---------------- effects ---------------- */
/* soft point sprites: a particle smaller than 4 px is drawn 4 px wide and faded by its area instead of collapsing into a hard 1-2 px square (which the lens fringing turns into a flashing coloured speck) */
/* ...and a puff drifting back at the chase camera never grows past 320 px: it fades out from 160 px and within 12 m. A sprite hundreds of pixels wide is
   dropped whole by the GPU the moment its centre leaves the screen, so big puffs used to pop in and out at the edges of the view */
const RY_PT_VS = 'attribute vec4 aCol; attribute float aSize; varying vec4 vC; uniform float uScale; void main(){ vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.0); vC.a*=smoothstep(3.0,12.0,-mv.z); float px=aSize*uScale/max(0.5,-mv.z); float k=clamp(px/4.0,0.0,1.0); vC.a*=k*k; vC.a*=1.0-smoothstep(160.0,320.0,px); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(px,4.0,320.0); }';
function ryPoints(n) { const P = mkPoints(n, THREE.NormalBlending); P.pts.material.vertexShader = RY_PT_VS; return P; }
function ryInitFx() {
  if (RYP.ok) return; RYP.dust = ryPoints(1500); RYP.grit = ryPoints(420);
  scene.add(RYP.dust.pts, RYP.grit.pts); RYP.ok = true;
}
Rally.dustTint = [0.7, 0.62, 0.52];
Rally.puff = function (x, y, z, vx, vy, vz, life, size, grow, a) {
  const d = (RY.T.dust || RY_DUST)[Rally.sec] || RY_DUST[0], t = Rally.dustTint, k = 0.88 + Math.random() * 0.24;
  emit(RYP.dust, x, y, z, vx, vy, vz, life, size, grow, d[0] * t[0] * k, d[1] * t[1] * k, d[2] * t[2] * k, a, -0.25);
};
Rally.chip = function (x, y, z, vx, vy, vz, wood) {
  const k = 0.7 + Math.random() * 0.5;
  if (wood) emit(RYP.grit, x, y, z, vx, vy, vz, 0.8 + Math.random() * 1.1, 0.07 + Math.random() * 0.05, 0, 0.62 * k, 0.45 * k, 0.26 * k, 1, 9);
  else { const d = (RY.T.dust || RY_DUST)[Rally.sec] || RY_DUST[0]; emit(RYP.grit, x, y, z, vx, vy, vz, 0.5 + Math.random() * 0.7, 0.05 + Math.random() * 0.05, 0, d[0] * k * 0.9, d[1] * k * 0.9, d[2] * k * 0.9, 1, 12); }
};
function ryPoolUpdate(S, dt) {
  for (let i = 0; i < S.n; i++) {
    if (S.life[i] <= 0) { S.col[i * 4 + 3] = 0; S.size[i] = 0; continue; }
    S.life[i] -= dt; const f = Math.max(0, S.life[i] / S.max[i]);
    S.vel[i * 3 + 1] -= S.grav[i] * dt; S.vel[i * 3] *= 1 - dt * 0.35; S.vel[i * 3 + 2] *= 1 - dt * 0.35;
    S.pos[i * 3] += S.vel[i * 3] * dt; S.pos[i * 3 + 1] += S.vel[i * 3 + 1] * dt; S.pos[i * 3 + 2] += S.vel[i * 3 + 2] * dt;
    S.size[i] = S.s0[i] + S.grow[i] * (1 - f); S.col[i * 4] = S.cr[i * 3]; S.col[i * 4 + 1] = S.cr[i * 3 + 1]; S.col[i * 4 + 2] = S.cr[i * 3 + 2]; S.col[i * 4 + 3] = S.a0[i] * Math.min(1, f * 2.2) * Math.min(1, (1 - f) * 12 + 0.25);
  }
  S.g.attributes.position.needsUpdate = true; S.g.attributes.aCol.needsUpdate = true; S.g.attributes.aSize.needsUpdate = true;
}
Rally.fx = function (dt) {
  if (!RYP.ok) return; const c = car, sp = Math.abs(c.speed), s = Math.sin(c.yaw), co = Math.cos(c.yaw), P = CARP;
  const q = Q.tree < 0.7 ? 0.6 : 1;
  if (Rally.phase !== 'grid' && !c.air && sp > 3) {
    const loose = c.surf.loose || 0.3, slide = c.drifting ? 2 : 1, thr = 0.5 + 0.5 * c.thr, rate = sp * (2.4 + 6 * loose) * slide * (0.6 + 0.4 * thr) * q;
    let n = rate * dt; n = Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = Math.random() < 0.5 ? -1 : 1, front = Math.random() < 0.18, zz = front ? P.a : -P.b, lx = side * P.track / 2, x = c.x + s * zz + co * lx, z = c.z + co * zz - s * lx;
      Rally.puff(x, c.y + 0.12, z, -c.vx * 0.22 + (Math.random() - 0.5) * 2.4, 0.6 + Math.random() * 1.3 + sp * 0.02, -c.vz * 0.22 + (Math.random() - 0.5) * 2.4, 1.6 + Math.random() * 2.0, 0.9 + Math.random() * 0.7, 4.2 + Math.random() * 3.2, 0.4 + 0.3 * loose);
    }
    /* gravel thrown out behind the driven wheels */
    let g = (sp * 0.7 * loose * slide * thr * q) * dt * 40; g = Math.floor(g) + (Math.random() < g - Math.floor(g) ? 1 : 0);
    for (let i = 0; i < g; i++) { const side = Math.random() < 0.5 ? -1 : 1, x = c.x - s * P.b + co * side * P.track / 2, z = c.z - co * P.b - s * side * P.track / 2; Rally.chip(x, c.y + 0.1, z, -c.vx * 0.5 + (Math.random() - 0.5) * 4, 2 + Math.random() * 4, -c.vz * 0.5 + (Math.random() - 0.5) * 4, false); }
  }
  /* scraping a rock face or stone wall: grey dust and stone chips from the contact point, in proportion to the speed */
  if (c.railFx > 0) {
    if (c.railFx > 3 && !c.air) {
      let n = c.railFx * 1.4 * dt * q; n = Math.floor(n) + (Math.random() < n - Math.floor(n) ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const k = 0.8 + Math.random() * 0.4, up = 0.4 + Math.random() * 1.8;
        emit(RYP.dust, c.railX + (Math.random() - 0.5) * 2.2 * s, c.y + 0.3 + Math.random() * 0.6, c.railZ + (Math.random() - 0.5) * 2.2 * co, c.vx * 0.3 + (Math.random() - 0.5) * 2, up, c.vz * 0.3 + (Math.random() - 0.5) * 2, 0.9 + Math.random() * 1.3, 0.6 + Math.random() * 0.5, 2.6 + Math.random() * 2, 0.5 * k, 0.48 * k, 0.45 * k, 0.5, -0.2);
        if (Math.random() < 0.6) emit(RYP.grit, c.railX, c.y + 0.4, c.railZ, c.vx * 0.5 + (Math.random() - 0.5) * 5, 1 + Math.random() * 4, c.vz * 0.5 + (Math.random() - 0.5) * 5, 0.5 + Math.random() * 0.6, 0.06 + Math.random() * 0.05, 0, 0.6 * k, 0.57 * k, 0.52 * k, 1, 12);
      }
    }
    c.railFx = 0;
  }
  ryPoolUpdate(RYP.dust, dt); ryPoolUpdate(RYP.grit, dt);
  const u = 0.5 * (renderer.domElement.height || 720) / Math.tan(camera.fov * DEG / 2); for (const S of [RYP.dust, RYP.grit]) S.pts.material.uniforms.uScale.value = u;
};
/* wood sounds */
Rally.woodSnd = function (kind, sp) {
  if (!Snd.ok) return; const ctx = Snd.ctx, t = ctx.currentTime, k = clamp(sp / 28, 0.25, 1);
  if (kind === 'crack') { Snd.noiseHit(t, 0.05, 0.5 * k, 2200, 0, Snd.sfx); Snd.tone(t, 420 + Math.random() * 200, 0.06, 'square', 0.1 * k, 2600, 0.001, Snd.sfx); }
  else if (kind === 'snap') { Snd.noiseHit(t, 0.09, 0.8 * k, 1500, 0, Snd.sfx); Snd.noiseHit(t + 0.01, 0.2, 0.5 * k, 0, 900, Snd.sfx); Snd.tone(t, 160 + Math.random() * 60, 0.12, 'sawtooth', 0.22 * k, 1200, 0.001, Snd.sfx); Snd.tone(t + 0.02, 900 + Math.random() * 500, 0.04, 'square', 0.07 * k, 3500, 0.001, Snd.sfx); }
  else { Snd.noiseHit(t, 0.3, 0.9 * k, 0, 1100, Snd.sfx); Snd.tone(t, 90, 0.22, 'sine', 0.5 * k, 400, 0.002, Snd.sfx); Snd.tone(t, 300, 0.1, 'square', 0.1 * k, 1800, 0.001, Snd.sfx); }
};
Rally.sndStart = function () {
  if (!Snd.ok || Rally.sn) return; const ctx = Snd.ctx, mk = (type, f, q) => { const s = ctx.createBufferSource(); s.buffer = Snd.nb; s.loop = true; const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = ctx.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(Snd.sfx); s.start(0, Math.random()); return { s, fl, g }; };
  Rally.sn = { gravel: mk('bandpass', 1100, 0.6), wind: mk('highpass', 1600, 0.5), rumble: mk('lowpass', 220, 0.8) };
};
Rally.sndStop = function () { const S = Rally.sn; if (!S) return; for (const k in S) { try { S[k].g.gain.value = 0; S[k].s.stop(); } catch (e) { /* ignore */ } } Rally.sn = null; };
Rally.sndUpdate = function (dt) {
  const S = Rally.sn; if (!S || !Snd.ok) return; const c = car, sp = Math.abs(c.speed), loose = c.surf.loose || 0.3, grounded = c.air ? 0 : 1, t = Snd.ctx.currentTime, on = App.mode === 'play' ? 1 : 0;
  S.gravel.g.gain.setTargetAtTime(on * grounded * clamp(sp / 40, 0, 1) * (0.1 + 0.25 * loose) * (c.drifting ? 1.6 : 1) * (save.set.vol > 0 ? 1 : 0), t, 0.08);
  S.gravel.fl.frequency.setTargetAtTime(700 + sp * 25 + (c.drifting ? 500 : 0), t, 0.1);
  S.wind.g.gain.setTargetAtTime(on * clamp((sp - 12) / 50, 0, 1) * 0.28 * (c.air ? 1.3 : 1), t, 0.15);
  S.rumble.g.gain.setTargetAtTime(on * grounded * clamp(sp / 35, 0, 1) * (0.1 + 0.4 * (c.surf.rough || 0.3)), t, 0.1);
};

/* ---------------- environment: low forest sun, haze, adaptive exposure ---------------- */
const _ryV = new THREE.Vector3();
Rally.sunInfo = function () { return Rally.sun || (Rally.sun = { dir: new THREE.Vector3(0, 1, 0), viewDir: new THREE.Vector3(0, 1, 0), col: new THREE.Color(1, 0.8, 0.5), amt: 1, shaft: 1 }); };
Rally.env = function (tod, focus, time) {
  const cfg = RY_TODS[Rally.tod] || RY_TODS[2], dtE = clamp(time - (Rally._te || time), 0, 0.2); Rally._te = time;
  skyAt(cfg.tod);
  const ang = (cfg.tod - 6) / 24 * TAU, el = Math.min(Math.asin(clamp(Math.sin(ang), -1, 1)), 1.08), az = -0.5 + 0.2 * Math.sin(time * 0.0);   /* the sun sits ahead and to the right of the start so the first straight runs into the glow */
  env.sunDir.set(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az)).normalize();
  const e = env.sunDir.y;
  env.day = sstep(-0.1, 0.2, e); env.night = 1 - sstep(-0.2, 0.05, e); env.lampOn = 1 - sstep(-0.05, 0.12, e);
  if (cfg.lamps) env.lampOn = 1;
  env.sunCol.copy(_warm).lerp(_white, sstep(0.02, 0.5, e));
  /* haze takes the colour of the low sun */
  { const tt = RY.T.tint || [1, 1, 1]; env.hor.r *= cfg.tint[0] * tt[0]; env.hor.g *= cfg.tint[1] * tt[1]; env.hor.b *= cfg.tint[2] * tt[2]; }   /* and of the place: cold over snow, warm over sand */
  /* openness around the car: clearings are brighter, deep forest is darker and the eye adapts with a lag */
  const O = RY.open[Rally.hint] || 0; Rally.opn += (O - Rally.opn) * Math.min(1, dtE * 1.5);
  const target = cfg.expo * (1.14 - 0.2 * Rally.opn); Rally.expo += (target - Rally.expo) * Math.min(1, dtE * 0.9);
  scene.fog.color.copy(env.hor); scene.fog.density = cfg.fog * (RY.T.fogK || 1) * (Q.fog || 1) * (1 + 0.5 * (1 - Rally.opn) * 0.3);
  if (!hasPost) scene.fog.color.convertLinearToSRGB();
  L.sun.color.copy(env.sunCol); L.sun.intensity = cfg.sun * sstep(-0.02, 0.2, e) * (1 + 0.25 * Rally.opn);
  L.moon.intensity = 0.4 * env.night;
  _col.copy(env.zen).lerp(env.hor, 0.45); L.hemi.color.copy(_col); L.hemi.groundColor.setRGB(0.1 * env.day + 0.02, 0.085 * env.day + 0.018, 0.04 * env.day + 0.018);
  if (RY.T.pal) { const fc = RY.T.pal.f[0], kk = 0.3 * env.day + 0.03; L.hemi.groundColor.setRGB(fc[0] * fc[0] * kk, fc[1] * fc[1] * kk, fc[2] * fc[2] * kk); }   /* light bounced off sand or snow */
  L.hemi.intensity = lerp(0.5, 0.95, env.day) * (0.82 + 0.3 * Rally.opn);
  const f = focus;
  L.sun.position.set(Math.round(f.x * 2) / 2 + env.sunDir.x * 350, f.y + env.sunDir.y * 350, Math.round(f.z * 2) / 2 + env.sunDir.z * 350); L.sun.target.position.set(Math.round(f.x * 2) / 2, f.y, Math.round(f.z * 2) / 2);
  L.moon.position.set(f.x - env.sunDir.x * 300, f.y - env.sunDir.y * 300 + 50, f.z - env.sunDir.z * 300); L.moon.target.position.copy(f);
  env.exposure = lerp(2.1, 1.0, env.day) * Rally.expo;
  MAT.sky.uniforms.uHaze.value = 0.24;   /* distant ridges and valley walls fade into the sky instead of standing out as pale slabs */
  Wind.t.value = time; MAT.sky.uniforms.uTime.value = time; MAT.sky.uniforms.uDay.value = env.day; MAT.sky.uniforms.uNight.value = env.night;
  Sky.mesh.position.copy(camera.position);
  /* shared sun description for the forest shaders / shafts / particles */
  const S = Rally.sunInfo(); S.dir.copy(env.sunDir); camera.updateMatrixWorld(); S.viewDir.copy(env.sunDir).transformDirection(camera.matrixWorldInverse); S.col.copy(env.sunCol);
  S.amt = sstep(-0.02, 0.25, e); S.shaft = cfg.shaft * sstep(0.02, 0.2, e) * (0.35 + 0.65 * (1 - Rally.opn * 0.5));
  RYG.U.dap.value = 0.62 * (1 - 0.6 * Rally.opn) * S.amt * (Q.shadow ? 1 : 0.5);
  const dl = 0.42 + 0.58 * S.amt * (0.5 + 0.5 * Rally.opn), t = Rally.dustTint; t[0] = (0.3 + 0.7 * env.sunCol.r * S.amt) * dl + 0.1; t[1] = (0.3 + 0.7 * env.sunCol.g * S.amt) * dl + 0.1; t[2] = (0.3 + 0.7 * env.sunCol.b * S.amt) * dl + 0.12;
};

/* ---------------- HUD ---------------- */
const RY_CSS = `
#ryhud{position:absolute;inset:0;z-index:4;pointer-events:none;font-family:var(--display,'Rajdhani',sans-serif);color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.65)}
#ryhud[hidden]{display:none}
#ryhud .ryt{position:absolute;top:calc(14px + env(safe-area-inset-top));left:50%;transform:translateX(-50%);text-align:center}
#ryTime{font-size:46px;letter-spacing:.06em;line-height:1;font-variant-numeric:tabular-nums}
#rySplit{font-size:20px;min-height:24px;letter-spacing:.08em;opacity:.95}
#rySplit.up{color:#ff6b6b}#rySplit.dn{color:#5dff8a}
#ryBar{position:absolute;top:calc(88px + env(safe-area-inset-top));left:50%;width:min(420px,56vw);height:6px;transform:translateX(-50%);background:rgba(255,255,255,.18);border-radius:3px}
#ryBar i{position:absolute;left:0;top:0;bottom:0;background:linear-gradient(90deg,#ffb02e,#ff5a1f);border-radius:3px}
#ryBar u{position:absolute;top:-4px;width:2px;height:14px;background:#fff;opacity:.8}
#ryNote{position:absolute;left:50%;top:calc(112px + env(safe-area-inset-top));transform:translateX(-50%);display:flex;align-items:center;gap:14px;padding:8px 20px;background:rgba(6,10,14,.55);border-left:4px solid #ffb02e;border-radius:3px;min-width:240px;justify-content:center;transition:border-color .2s}
#ryNote .g{font-size:34px;line-height:1;width:40px;text-align:center}#ryNote b{font-size:30px;letter-spacing:.06em;font-weight:700}#ryNote span{font-size:22px;opacity:.85;font-variant-numeric:tabular-nums}@media(min-width:701px){#ryNote b,#ryNote span{white-space:nowrap}}
#ryNote.s1,#ryNote.s2{border-color:#ff3b3b}#ryNote.s3{border-color:#ff8a1f}#ryNote.s4{border-color:#ffd02e}#ryNote.s5,#ryNote.s6{border-color:#5dff8a}#ryNote.jump{border-color:#4fc3ff}#ryNote.wall{border-color:#ff7a1f;background:rgba(60,18,6,.6)}
#ryNote2{position:absolute;left:50%;top:calc(170px + env(safe-area-inset-top));transform:translateX(-50%);font-size:18px;opacity:.75;letter-spacing:.08em}
#ryBig{position:absolute;left:0;right:0;top:36%;text-align:center;font-size:54px;letter-spacing:.1em;opacity:0;font-weight:700}
#ryBig.on{animation:rypop 1.5s ease-out forwards}#ryBig.big{font-size:78px;color:#ffd02e}
@keyframes rypop{0%{opacity:0;transform:scale(.6)}12%{opacity:1;transform:scale(1.12)}22%{transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:translateY(-22px) scale(1)}}
#ryGate{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(14px + env(safe-area-inset-top));text-align:right;font-size:16px;letter-spacing:.14em;opacity:.9}
#ryGate b{font-size:30px;display:block;letter-spacing:.04em}
#ryQuit{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(12px + env(safe-area-inset-top));pointer-events:auto;font-family:inherit;font-size:15px;letter-spacing:.1em;padding:6px 12px;background:rgba(6,10,14,.6);color:#fff;border:1px solid rgba(255,255,255,.3);cursor:pointer;border-radius:3px}
#ryPos{position:absolute;right:max(14px,env(safe-area-inset-right));top:calc(78px + env(safe-area-inset-top));text-align:right;font-size:16px;letter-spacing:.14em;opacity:.95}
#ryPos b{font-size:30px;display:block;letter-spacing:.04em}#ryPos[hidden]{display:none}
#ryTower{position:absolute;left:max(12px,env(safe-area-inset-left));top:calc(54px + env(safe-area-inset-top));font-size:16px;letter-spacing:.06em;min-width:200px}
#ryTower div{display:flex;gap:10px;padding:2px 9px;background:rgba(6,10,14,.5);margin-bottom:2px;border-left:3px solid transparent;border-radius:2px}
#ryTower div.me{border-color:#ffb02e;background:rgba(70,38,6,.66);font-weight:700}#ryTower span.g{margin-left:auto;opacity:.85;font-variant-numeric:tabular-nums}
#ryHint{position:absolute;left:0;right:0;bottom:calc(150px + env(safe-area-inset-bottom));text-align:center;font-size:20px;letter-spacing:.1em;opacity:0;transition:opacity .3s}#ryHint.on{opacity:.95}
body.rally #tr,body.rally #mp,body.rally #wanted,body.rally #tgt,body.rally #prompt{display:none!important}
body.rally #rcount{top:26%}
@media(max-width:700px){#ryTime{font-size:34px}#ryNote{top:calc(100px + env(safe-area-inset-top));padding:6px 12px;min-width:0}#ryNote b{font-size:22px}#ryNote .g{font-size:26px;width:30px}#ryBig{font-size:38px}#ryBig.big{font-size:52px}#ryNote2{display:none}}`;
Rally.dom = function () {
  if (Rally.el) return; const st = document.createElement('style'); st.textContent = RY_CSS; document.head.appendChild(st);
  const h = document.createElement('div'); h.id = 'ryhud'; h.hidden = true;
  h.innerHTML = '<div class="ryt"><div id="ryTime">0:00.0</div><div id="rySplit"></div></div><div id="ryBar"><i id="ryProg"></i></div><div id="ryNote"><div class="g" id="ryG"></div><b id="ryNT"></b><span id="ryND"></span></div><div id="ryNote2"></div><div id="ryBig"></div><div id="ryGate"></div><div id="ryPos" hidden></div><div id="ryTower"></div><div id="ryHint"></div><button id="ryQuit" type="button">✕ Quit stage</button>';
  const hud = document.getElementById('hud'); (hud ? hud.parentNode : document.body).insertBefore(h, hud ? hud.nextSibling : null);
  Rally.el = { root: h, time: h.querySelector('#ryTime'), split: h.querySelector('#rySplit'), bar: h.querySelector('#ryBar'), prog: h.querySelector('#ryProg'), note: h.querySelector('#ryNote'), g: h.querySelector('#ryG'), nt: h.querySelector('#ryNT'), nd: h.querySelector('#ryND'), n2: h.querySelector('#ryNote2'), big: h.querySelector('#ryBig'), gate: h.querySelector('#ryGate'), pos: h.querySelector('#ryPos'), tower: h.querySelector('#ryTower'), hint: h.querySelector('#ryHint') };
  h.querySelector('#ryQuit').addEventListener('click', () => { if (Rally.on) Rally.exit(true); });
  E.rres.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !b.dataset.ry) return; if (b.dataset.ry === 'again') Rally.again(); else if (b.dataset.ry === 'done') Rally.exit(false); });
};
Rally.pop = function (txt, cls) { const b = Rally.el && Rally.el.big; if (!b) return; b.textContent = txt; b.className = ''; void b.offsetWidth; b.className = 'on ' + (cls || ''); };
Rally.hint = 0;
const RY_GLYPH = { LEFT: '↰', RIGHT: '↱', jump: '⤴', dip: '⤵', wall: '▦', rail: '▮' };
function ryNoteGlyph(n) { return n.k === 'bend' ? (n.dir > 0 ? RY_GLYPH.LEFT : RY_GLYPH.RIGHT) : n.k === 'jump' ? RY_GLYPH.jump : n.k === 'wall' ? RY_GLYPH.wall : n.k === 'rail' ? RY_GLYPH.rail : RY_GLYPH.dip; }
Rally.hud = function (dt) {
  const E_ = Rally.el; if (!E_) return; Rally.hudT -= dt; if (Rally.hudT > 0) return; Rally.hudT = 0.05;
  const t = Rally.phase === 'run' || Rally.phase === 'done' ? Rally.clock + Rally.penalty : 0;
  E_.time.textContent = t > 0 ? fmtLap(t).replace(/(\.\d)\d$/, '$1') : '0:00.0';
  const span = RY.finishS - RY.startS, p = clamp((Rally.s - RY.startS) / span, 0, 1); E_.prog.style.width = (p * 100).toFixed(1) + '%';
  /* pace notes: the next two calls ahead of the car */
  const N = RY.notes; while (Rally.noteI < N.length && N[Rally.noteI].s < Rally.s - 6) Rally.noteI++;
  const n = N[Rally.noteI], n2 = N[Rally.noteI + 1];
  if (n && n.s - Rally.s < 260 && Rally.phase !== 'done') {
    const d = Math.max(0, n.s - Rally.s); E_.note.hidden = false; E_.note.className = n.k === 'bend' ? 's' + n.sev : n.k === 'wall' ? 'wall' : n.k === 'jump' ? 'jump' : 's5';
    E_.g.textContent = ryNoteGlyph(n); E_.nt.textContent = n.t; E_.nd.textContent = Math.round(d / 5) * 5 + ' m';
    E_.n2.textContent = n2 && n2.s - n.s < 120 ? '› ' + n2.t : '';
  } else { E_.note.hidden = true; E_.n2.textContent = ''; }
  const sim = Rally.sim; E_.gate.innerHTML = 'PLANKS<b>' + (sim ? sim.mine : 0) + '<small style="font-size:16px;opacity:.7"> / ' + (sim ? sim.total : 0) + '</small></b>';
  if (RR.on) {
    Rally.twT = (Rally.twT || 0) - 0.05; if (Rally.twT > 0) return; Rally.twT = 0.2;   /* the standings change slowly: redraw them 5x a second */
    const ord = RR.order(), me = ord.findIndex((o) => o.me), lead = ord[0]; E_.pos.hidden = false; E_.pos.innerHTML = 'POSITION<b>' + (me + 1) + '<small style="font-size:16px;opacity:.7"> / ' + ord.length + '</small></b>';
    E_.tower.innerHTML = ord.map((o, i) => '<div' + (o.me ? ' class="me"' : '') + '><span>' + (i + 1) + '</span><span>' + esc(o.name) + '</span><span class="g">' + (i === 0 ? (o.fin ? fmtLap(o.t).replace(/(\.\d)\d$/, '$1') : 'LEAD') : (o.fin ? '+' + (o.t - lead.t).toFixed(1) : '+' + (Math.max(0, lead.s - o.s) / Math.max(18, o.v)).toFixed(1) + 's')) + '</span></div>').join('');
  } else { E_.pos.hidden = true; E_.tower.innerHTML = ''; }
  E_.hint.className = Rally.stuck > 2.5 && Rally.phase === 'run' ? 'on' : ''; if (Rally.stuck > 2.5) E_.hint.textContent = TouchIn.on ? '' : 'STUCK? PRESS R TO RESET (+3 s)';
  if (Rally.wrong > 1.2 && Rally.phase === 'run') { E_.hint.className = 'on'; E_.hint.textContent = 'WRONG WAY · TURN AROUND'; }
};

/* ---------------- lobby ---------------- */
/* which stage the lobby has chosen, and its record (Hollow Pines keeps its record where it always was; the others have their own) */
/* the car you are lent for the stage: the Ridgeback rally car or the Sandviper buggy */
const RY_CARS = [['ridge', 'Ridgeback RS'], ['buggy', 'Sandviper buggy']];
Rally.carId = function () { return save.rally.car === 'buggy' ? 'buggy' : 'ridge'; };
Rally.stageI = function () { return clamp(save.rally.stage | 0, 0, RY_STAGES.length - 1); };
Rally.rec = function (i) { i = i == null ? (Rally.on ? RY.stage : Rally.stageI()) : i; if (i === 0) return save.rally; const st = save.rally.st || (save.rally.st = {}), id = RY_STAGES[i].id; return st[id] || (st[id] = { best: 0, splits: [] }); };
Rally.open = function () {
  if (App.mode !== 'rlobby') return; Rally.lobby = true; Rally.tod = clamp(save.rally.tod, 0, 3); Rally.paint(); Snd.beep(620, 0.06);
};
Rally.paint = function () {
  const R = save.rally, seg = (k, opts, cur) => '<div class="rseg" data-k="' + k + '">' + opts.map(([v, l]) => '<button type="button" class="' + (cur === v ? 'on' : '') + '" data-v="' + v + '">' + l + '</button>').join('') + '</div>';
  const si = Rally.stageI(), ST = RY_STAGES[si], B = Rally.rec(si);
  E.rlTitle.textContent = ST.name; E.rlSub.textContent = ST.sub; E.rlCash.textContent = money(save.money); E.rlPanel.classList.remove('jk');
  E.rlFoot.innerHTML = '<button class="btn" type="button" data-act="rback">◂ Back</button><button class="btn primary" type="button" data-act="rstart">Start stage</button>';
  const par = RY.stagePar(si), med = [par * RY_MEDAL[0], par * RY_MEDAL[1], par * RY_MEDAL[2]].map((v) => fmtLap(v));
  E.rlBody.innerHTML = '<div class="rlrow"><label>Stage</label>' + seg('stage', RY_STAGES.map((s, i) => [i, s.name]), si) + '</div>' +
    '<p class="rlp">' + ST.info + ' ' + ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six'][ST.walls.length] + ' plank walls block the road: drive straight through them. Pace notes call the road ahead. Three rival drivers start beside you.</p>' +
    '<div class="rlrow"><label>Car</label>' + seg('car', RY_CARS, Rally.carId()) + '</div>' +
    '<div class="rlrow"><label>Light</label>' + seg('tod', RY_TODS.map((t, i) => [i, t.n]), Rally.tod) + '</div>' +
    '<div class="rlrow"><label>Rivals</label>' + seg('rivals', [[0, 'None'], [1, 'Rookie'], [2, 'Pro'], [3, 'Elite']], Rally.rivalLevel()) + '</div>' +
    '<div class="rlrow"><label>Assist</label>' + seg('assist', [[1, 'On · easy to control'], [0, 'Off · raw physics']], Rally.assistOn() ? 1 : 0) + '</div>' +
    '<div class="rlprize"><small>Medal times</small><span>Bronze <b>' + med[0] + '</b></span><span>Silver <b>' + med[1] + '</b></span><span>Gold <b>' + med[2] + '</b></span></div>' +
    '<div class="rlrec"><span>Runs <b>' + R.runs + '</b></span><span>Best here <b>' + fmtLap(B.best) + '</b></span><span>Wins <b>' + (R.wins || 0) + '</b></span><span>Planks smashed <b>' + R.gates + '</b></span><span>Longest jump <b>' + (R.jump ? Math.round(R.jump) + ' m' : '–') + '</b></span></div>' +
    '<p class="rlp dim">You drive the <b>' + CAR_BY_ID[Rally.carId()].name + '</b>, lent to you for the stage. ' + (TouchIn.on ? 'Use the pedals as normal; hold DRIFT for the handbrake.' : 'W/S throttle and brake, A/D steer, Space handbrake, Shift boost, R resets to the road (+3 s).') + '</p>';
};
Rally.lobbyClick = function (b) {
  const a = b.dataset.act;
  if (a === 'rback') { Rally.lobby = false; Race.paint(); Snd.beep(420, 0.05); }
  else if (a === 'rstart') Rally.start();
  else if (a === 'leave') { Rally.lobby = false; Race.leave(); }
  else if (b.parentNode && b.parentNode.dataset.k === 'car') { save.rally.car = b.dataset.v === 'buggy' ? 'buggy' : 'ridge'; Rally.paint(); Snd.beep(520, 0.04); }
  else if (b.parentNode && b.parentNode.dataset.k === 'stage') { save.rally.stage = +b.dataset.v; Rally.paint(); Snd.beep(520, 0.04); }
  else if (b.parentNode && b.parentNode.dataset.k === 'rivals') { save.rally.rivals = +b.dataset.v; Rally.paint(); Snd.beep(520, 0.04); }
  else if (b.parentNode && b.parentNode.dataset.k === 'assist') { save.rally.assist = +b.dataset.v; Rally.paint(); Snd.beep(520, 0.04); }
  else if (b.parentNode && b.parentNode.dataset.k === 'tod') { Rally.tod = +b.dataset.v; save.rally.tod = Rally.tod; Rally.paint(); Snd.beep(520, 0.04); }
};
Rally.lobbyKey = function (code) { if (code === 'Escape') { Rally.lobby = false; Race.paint(); } else if (code === 'Enter') Rally.start(); };

/* ---------------- start / reset / exit ---------------- */
Rally.stageDensity = function () { return clamp(Q.tree || 1, 0.5, 1); };
Rally.hideWorld = function () {
  Rally.hidden.length = 0; const keep = new Set([Sky.mesh, Part.smoke.pts, Part.spark.pts, car.body, Wheels.group, RYG.group, RYP.dust.pts, RYP.grit.pts]);
  for (const o of scene.children) { if (o.isLight || keep.has(o) || !o.visible) continue; o.visible = false; Rally.hidden.push(o); }
  if (Chunks.group) Chunks.group.visible = false; if (Far.group) Far.group.visible = false;
};
Rally.showWorld = function () { for (const o of Rally.hidden) o.visible = true; Rally.hidden.length = 0; if (Chunks.group) Chunks.group.visible = true; if (Far.group) Far.group.visible = true; };
Rally.start = async function () {
  if (Rally.on || Rally.loading || App.mode !== 'rlobby') return;
  Rally.loading = true; Rally.lobby = false; Rally.dom(); ryInitFx();
  const c = car; Rally.saved = { x: c.x, z: c.z, yaw: c.yaw, car: save.car, tod: App.tod, cycle: save.set.cycle, view: Cam.view, nitro: c.nitro, health: c.health, lights: c.lights };
  UI.setMode('load'); UI.progress(0.08, 'Surveying the stage'); await tick();
  try {
    if (RY.stage !== Rally.stageI() || !RY.ready) { RY.use(Rally.stageI()); RY.build(Rally.stageDensity()); Rally.sim = null; RYG.dispose(); RR.base = null; }   /* another stage: survey it, and take the last one down */
    UI.progress(0.35, 'Felling trees'); await tick();
    if (!Rally.sim) Rally.sim = RW.make(RY.walls, RY.heightAt, RY.seed);
    if (!RYG.built) { RYG.build(Rally.sim, { far: Q.shadow ? (Q.tree < 0.9 ? 320 : 400) : 260, shafts: Q.tree < 0.7 ? 24 : 46 }); }
    UI.progress(0.8, 'Lighting the forest'); await tick();
  } catch (err) { console.error(err); Rally.loading = false; UI.setMode('rlobby'); Rally.lobby = false; Race.paint(); UI.toast('Could not build the stage', 'bad'); return; }
  if (!RYG.group.parent) scene.add(RYG.group);
  RYG.group.visible = true; Rally.hideWorld();
  Race.near = null; Shop.near = null; Ven.near = null; Wk.near = null; if (typeof Mission !== 'undefined') Mission.nearby = null;
  Rally.on = true; save.set.cycle = 0; App.tod = RY_TODS[Rally.tod].tod;
  applyCar(Rally.carId(), true); c.nitro = tune.nitroMax; c.health = 100; c.dmax = 0; if (Cam.view === 0) Cam.view = 2;
  document.body.classList.add('rally'); Rally.el.root.hidden = false;
  Rally.reset0(); Snd.init(); Rally.sndStart();
  UI.progress(1, ''); UI.setMode('play'); Rally.loading = false;
  Rally.beginCount();
};
Rally.reset0 = function () {
  const sim = Rally.sim; RW.reset(sim); for (const k of [0, 1, 2, 3, 4]) sim.dirty[k] = true;
  Rally.phase = 'grid'; Rally.t = 0; Rally.clock = 0; Rally.penalty = 0; Rally.cp = 0; Rally.splits = []; Rally.resets = 0; Rally.jumpBest = 0; Rally.air = null; Rally.combo = 0; Rally.stuck = 0; Rally.wrong = 0; Rally.noteI = 0; Rally.done = false;
  Rally.hint = 0; RR.setup(); { const gs = Rally.gridSlot(); Rally.placeAt(RY.startS - gs[0], gs[1]); }
  Rally.best = Rally.rec().best > 0 ? Rally.rec().best : 0; if (Rally.el) { Rally.el.split.textContent = ''; Rally.el.split.className = ''; }
  E.rres.hidden = true; for (const k of ['rcount']) E[k].hidden = true;
};
Rally.placeAt = function (s, off) {
  const q = RY.at(s, off || 0, _ryQ), c = car; spawnAt(q.x, q.z, q.yaw); Rally.hint = q.i; Rally.s = s; Rally.safeS = s; c.health = Math.max(c.health, 30);
  const g = {}; RY.ground(q.x, q.z, g); c.y = g.h; c.sec = g.sec; Rally.sec = g.sec || 0;
};
Rally.beginCount = function () {
  Rally.phase = 'grid'; Rally.count = 3.6; Rally.cdLast = 4; E.rcount.hidden = false; E.rcount.className = ''; E.rcount.textContent = '';
};
Rally.again = function () {
  E.rres.hidden = true; Rally.reset0(); Rally.beginCount(); Rally.sndStart();
};
Rally.exit = function (quit) {
  if (!Rally.on) return;
  Rally.on = false; Rally.phase = 'off'; RR.clear(); Rally.sndStop(); E.rres.hidden = true; E.rcount.hidden = true; document.body.classList.remove('rally'); if (Rally.el) Rally.el.root.hidden = true;
  if (RYG.group) RYG.group.visible = false; Rally.showWorld(); MAT.sky.uniforms.uHaze.value = 0;
  const S = Rally.saved; if (S) { save.set.cycle = S.cycle; App.tod = S.tod; applyCar(S.car, true); car.nitro = S.nitro; Cam.view = S.view; loadAround(S.x, S.z, 14); spawnAt(S.x, S.z, S.yaw); car.health = Math.max(car.health, S.health); }
  if (RYP.ok) for (const P of [RYP.dust, RYP.grit]) P.life.fill(0);
  Rally.air = null; scene.fog.density = 0.001; L.sun.intensity = 3; writeSave(); UI.setMode('play');
  UI.toast(quit ? 'Left the stage' : 'Back at the race office', 'info');
};
/* put the car back on the road at the last good spot; costs three seconds */
Rally.reset = function () {
  if (!Rally.on || Rally.phase === 'grid') return;
  const c = car, d = Rally.phase === 'run';
  const s = Math.max(RY.startS - 7, Rally.safeS - 4); Rally.placeAt(s, 0); c.nitro = Math.max(c.nitro, 40);
  if (d) { Rally.penalty += 3; Rally.resets++; Rally.pop('+3 s', ''); }
  Rally.stuck = 0; Rally.wrong = 0; Rally.air = null; Cam.shake = 0; c.fell = null; Rally.fellT = 0;
};

/* ---------------- per-frame update ---------------- */
Rally.update = function (dt) {
  const c = car, sim = Rally.sim; Rally.t += dt;
  if (Rally.phase === 'grid') {
    c.vx = c.vz = c.w = 0; c.speed = 0; c.brk = 1; c.hand = 1;
    Rally.count -= dt; const n = Math.ceil(Rally.count - 0.6);
    if (n !== Rally.cdLast) {
      Rally.cdLast = n;
      if (n >= 1 && n <= 3) { E.rcount.className = ''; E.rcount.textContent = n; Snd.beep(520, 0.1); Cam.shake = 0.25; }
      else if (n <= 0) { E.rcount.className = 'go'; E.rcount.textContent = 'GO!'; Snd.beep(880, 0.35); Rally.phase = 'run'; Rally.clock = 0; RR.go = true; setTimeout(() => { if (E.rcount.className === 'go') E.rcount.hidden = true; }, 1200); Cam.shake = 0.9; }
    }
  } else if (Rally.phase === 'run') Rally.clock += dt;
  else if (Rally.phase === 'done') { c.thr = 0; c.brk = 0.7; c.hand = 0; Rally.doneT += dt; }
  /* progress along the stage */
  RY.locate(c.x, c.z, Rally.hint, _ryLoc); Rally.hint = _ryLoc.i; Rally.s = _ryLoc.s; Rally.lat = _ryLoc.l; Rally.dist = _ryLoc.d; Rally.sec = RY.sec[_ryLoc.i] || 0;
  const hw = RY.hw[_ryLoc.i];
  if (!c.air && Rally.dist < hw + 1.5 && c.speed > 3) { Rally.safeT -= dt; if (Rally.safeT <= 0) { Rally.safeS = Rally.s; Rally.safeT = 0.6; } }
  /* splits and the finish */
  /* into the ravine: a moment to see it, then fished out before the ramp with a run-up (+5 s) */
  if (c.fell) { Rally.fellT = (Rally.fellT || 0) + dt; if (Rally.fellT > 1.1) { const rv = c.fell; c.fell = null; Rally.fellT = 0; Rally.placeAt(rv.back, 0); const sp = 17; c.vx = Math.sin(c.yaw) * sp; c.vz = Math.cos(c.yaw) * sp; c.speed = sp; c.gear = Math.max(c.gear || 1, 3); c.nitro = Math.max(c.nitro, 50); if (Rally.phase === 'run') { Rally.penalty += 5; Rally.resets++; Rally.pop('+5 s', 'bad'); } UI.toast('Into the ravine! Hit the ramp flat out', 'bad'); Rally.air = null; } }
  else Rally.fellT = 0;
  /* wading: spray from the wheels */
  if (RYP.ok && RY.wl[_ryLoc.i] > c.y - 0.35 && Math.abs(c.speed) > 3) { const wl = RY.wl[_ryLoc.i], n = Math.min(14, Math.abs(c.speed) * 0.5), fx = Math.sin(c.yaw), fz = Math.cos(c.yaw);
    for (let k = 0; k < n; k++) { const sd = Math.random() < 0.5 ? -1 : 1, x = c.x + fz * sd * 0.9 + fx * (Math.random() - 0.3) * 3, z = c.z - fx * sd * 0.9 + fz * (Math.random() - 0.3) * 3, sp = Math.abs(c.speed);
      emit(RYP.dust, x, wl + 0.1, z, fz * sd * sp * 0.18 + c.vx * 0.3, 2 + Math.random() * sp * 0.22, -fx * sd * sp * 0.18 + c.vz * 0.3, 0.5 + Math.random() * 0.5, 0.25 + Math.random() * 0.3, 1.6, 0.86, 0.92, 0.98, 0.55, -2.5); }
    if (Rally.splashT == null || Rally.t - Rally.splashT > 0.35) { Rally.splashT = Rally.t; Cam.shake = Math.max(Cam.shake, 0.25); } }
  if (Rally.phase === 'run') {
    if (Rally.cp < RY.cps.length && Rally.s >= RY.cps[Rally.cp]) Rally.split();
    if (Rally.s >= RY.finishS) Rally.finish();
    const tx = RY.tx[_ryLoc.i], tz = RY.tz[_ryLoc.i], fw = c.vx * tx + c.vz * tz;
    Rally.wrong = fw < -3 && Math.hypot(c.vx, c.vz) > 5 ? Rally.wrong + dt : Math.max(0, Rally.wrong - dt * 2);
    Rally.stuck = Math.abs(c.speed) < 1.2 && c.thr > 0.3 || (Math.abs(c.speed) < 0.6 && c.brk > 0.3 && c.rev) ? Rally.stuck + dt : Math.max(0, Rally.stuck - dt * 2);
  }
  /* wreckage events -> sound, chips, dust, camera */
  if (sim && sim.ev.length) {
    let snaps = 0;
    for (let i = 0; i < sim.ev.length; i++) {
      const e = sim.ev[i], sp = e.sp || 10, ex = e.x - c.x, ez = e.z - c.z, d2 = ex * ex + ez * ez, near = d2 < 3600, mine = d2 < 400;   /* a rival's wall hit far down the road is neither heard nor felt */
      if (d2 > 14400) continue;
      if (e.t === 'crack') { if (i < 6 && near) Rally.woodSnd('crack', sp); if (RYP.ok) for (let k = 0; k < 2; k++) Rally.chip(e.x, e.y, e.z, (Math.random() - 0.5) * 3, 1 + Math.random() * 3, (Math.random() - 0.5) * 3, true); }
      else if (e.t === 'snap') {
        if (near) { snaps++; if (snaps < 5) Rally.woodSnd('snap', sp); }
        if (RYP.ok) { for (let k = 0; k < 7; k++) Rally.chip(e.x, e.y, e.z, (e.vx || 0) * 0.5 + (Math.random() - 0.5) * 7, 1.5 + Math.random() * 5, (e.vz || 0) * 0.5 + (Math.random() - 0.5) * 7, true); if (e.near) for (let k = 0; k < 2; k++) Rally.puff(e.x, e.y, e.z, (e.vx || 0) * 0.2 + (Math.random() - 0.5) * 2, 0.5 + Math.random(), (e.vz || 0) * 0.2 + (Math.random() - 0.5) * 2, 1 + Math.random(), 0.5, 2.2, 0.28); }
        if (mine) { Rally.combo++; Rally.comboT = 0.7; }
      } else if (e.t === 'rail') { if (near) { Rally.woodSnd('rail', sp); Cam.shake = Math.max(Cam.shake, 0.9); } if (RYP.ok) for (let k = 0; k < 10; k++) Rally.chip(e.x, e.y, e.z, (Math.random() - 0.5) * 8, 1 + Math.random() * 6, (Math.random() - 0.5) * 8, true); }
    }
    if (snaps) Cam.shake = Math.max(Cam.shake, Math.min(2.2, 0.5 + snaps * 0.12));
    sim.ev.length = 0;
  }
  if (Rally.comboT > 0) { Rally.comboT -= dt; if (Rally.comboT <= 0 && Rally.combo >= 4) { Rally.pop(Rally.combo >= 14 ? 'WALL SMASHED' : 'SMASH ×' + Rally.combo, Rally.combo >= 14 ? 'big' : ''); Rally.combo = 0; } else if (Rally.comboT <= 0) Rally.combo = 0; }
  Rally.fx(dt); Rally.hud(dt); Rally.sndUpdate(dt);
};
Rally.split = function () {
  const i = Rally.cp++, t = Rally.clock + Rally.penalty; Rally.splits.push(t);
  const ref = Rally.rec().splits[i]; let txt = 'SPLIT ' + (i + 1) + ' · ' + fmtLap(t).replace(/\d$/, ''), cls = '';
  if (ref > 0) { const d = t - ref; txt += '  ' + (d <= 0 ? '−' : '+') + Math.abs(d).toFixed(2); cls = d <= 0 ? 'dn' : 'up'; }
  Rally.el.split.textContent = txt; Rally.el.split.className = cls; Snd.beep(700, 0.08);
};
Rally.finish = function () {
  const t = Rally.clock + Rally.penalty, R = save.rally, B = Rally.rec(), par = RY.par, c = car;
  Rally.phase = 'done'; Rally.doneT = 0; Rally.doneS = Rally.s;
  const medal = t <= par * RY_MEDAL[2] ? 3 : t <= par * RY_MEDAL[1] ? 2 : t <= par * RY_MEDAL[0] ? 1 : 0, pb = !(B.best > 0) || t < B.best, prev = B.best;
  const rr = RR.on ? RR.results() : null, place = rr ? rr.findIndex((o) => o.me) + 1 : 0, pbonus = rr ? Math.round([900, 450, 220, 0][place - 1] * RR_TIERS[RR.tier].prize / 10) * 10 : 0, ord = ['', '1st', '2nd', '3rd', '4th'];
  const reward = Math.round((500 + medal * 450 + Math.min(300, Rally.sim.mine * 8) + (pb ? 150 : 0) + pbonus) / 10) * 10;
  if (rr && place === 1) R.wins = (R.wins || 0) + 1;
  R.runs++; R.gates += Rally.sim.mine; R.jump = Math.max(R.jump, Rally.jumpBest); R.earned += reward; save.money += reward;
  if (pb) { B.best = t; B.splits = Rally.splits.slice(0, 3); }
  writeSave(); Snd.win();
  const names = ['No medal', 'Bronze', 'Silver', 'Gold'], col = ['#8a8f98', '#cd7f32', '#c8ccd2', '#ffd02e'][medal];
  E.rres.hidden = false;
  E.rres.innerHTML = '<div id="rresP"><h2 class="ok">' + (rr ? (place === 1 ? 'You won the stage' : 'Stage complete · ' + ord[place] + ' of ' + rr.length) : 'Stage complete') + '</h2><div class="rw" style="color:' + col + '">' + names[medal] + (pb ? ' · new best' : '') + ' <small>' + money(reward) + (pbonus ? ' (incl. ' + money(pbonus) + ' for ' + ord[place] + ')' : '') + '</small></div>' +
    '<table><tr><th>Split</th><th>Time</th><th>vs best</th></tr>' +
    Rally.splits.map((s, i) => '<tr><td>' + (i + 1) + '</td><td>' + fmtLap(s) + '</td><td>' + (B.splits[i] > 0 && prev > 0 ? (s - (prev > 0 && !pb ? R.splits[i] : R.splits[i]) <= 0 ? '−' : '+') + Math.abs(s - R.splits[i]).toFixed(2) : '–') + '</td></tr>').join('') +
    '<tr class="me"><td>Finish</td><td>' + fmtLap(t) + '</td><td>' + (prev > 0 ? (t - prev <= 0 ? '−' : '+') + Math.abs(t - prev).toFixed(2) : '–') + '</td></tr></table>' +
    (rr ? '<table><tr><th>Pos</th><th>Driver</th><th>Time</th></tr>' + rr.map((o, i) => '<tr' + (o.me ? ' class="me"' : '') + '><td>' + (i + 1) + '</td><td>' + esc(o.name) + '</td><td>' + (o.est ? '~' : '') + fmtLap(o.t) + '</td></tr>').join('') + '</table>' : '') +
    '<p class="rlp dim" style="margin:10px 0">Planks smashed <b>' + Rally.sim.mine + ' / ' + Rally.sim.total + '</b> · longest jump <b>' + Math.round(Rally.jumpBest) + ' m</b> · resets <b>' + Rally.resets + '</b> (+' + Rally.resets * 3 + ' s)</p>' +
    '<div class="racts"><button class="btn" type="button" data-ry="done">Leave stage</button><button class="btn primary" type="button" data-ry="again">Run it again</button></div></div>';
  Rally.pop('FINISH', 'big');
};

/* ---------------- render-side per-frame hook ---------------- */
Rally.visual = function (dt) {
  if (Rally.on) RR.visual(dt);
  if (!Rally.on || !RYG.built || !Rally.sun) { return; }
  RYG.update(dt, camera, { x: car.x, z: car.z, yaw: car.yaw, rs: Rally.s }, Rally.sun, App.tod);
};
