/* ================= CAR: PHYSICS, MODELS, CAMERA, PARTICLES ================= */
const CARP = { m: 1400, a: 1.2, b: 1.4, L: 2.6, Iz: 2300, rw: 0.33, fd: 3.42, gears: [3.62, 2.19, 1.54, 1.2, 0.97, 0.78], idle: 900, red: 7400, track: 1.56, cgh: 0.5, rd: 0.95, awd: false, rsf: 0.5, ab: 0.5, cf: 10.2, cr: 12.2 };
const PAINTS = [0xd62828, 0x1f6feb, 0xf5b700, 0x2a9d4a, 0xf2f2f2, 0x15171c, 0xff6a13, 0x8a3ffc];
const tune = { Tmax: 470, mu: 1.15, nitroMax: 100, dmg: 1, cd: 0.5, cl: 0, brk: 1, off: 1 };
function refreshTune() {
  const t = (typeof CUR !== 'undefined' && CUR.t) || { Tmax: 470, mu: 1.15, cd: 0.5, cl: 0, brk: 1, off: 1 };
  tune.cd = t.cd; tune.cl = t.cl || 0; tune.brk = t.brk; tune.off = t.off;
  tune.Tmax = t.Tmax * (1 + 0.07 * save.up.eng) * (save.set.dev ? Dev.power : 1); tune.mu = t.mu * (1 + 0.035 * save.up.tire) * (save.set.dev ? Dev.grip : 1); tune.nitroMax = 100 + 25 * save.up.nit; tune.dmg = 1 - 0.12 * save.up.arm;
  Setup.apply();   /* the player's tuning setup for this car, on top of the stock numbers and the upgrades (06_tuning.js) */
}
const car = {
  x: 0, y: 0, z: 0, yaw: 0, vx: 0, vz: 0, w: 0, vy: 0, vyPrev: 0, air: false, airT: 0, pitch: 0, roll: 0, steer: 0, steerIn: 0, thr: 0, brk: 0, hand: 0, nit: false,
  gear: 1, rpm: 900, shift: 0, rev: false, nitro: 100, health: 100, axL: 0, ayL: 0, speed: 0, kmh: 0, slip: 0, driftAng: 0, drifting: false, spin: false, braking: false,
  surf: { h: 0, mu: 1, rr: 0.02, rough: 0.02, road: true, water: false, loose: 0 }, sY: 0, sV: 0, shake: 0, inWater: false, wrecked: 0, onRoad: true, leanP: 0, leanR: 0, leanPv: 0, leanRv: 0,
  lights: false, heading: 0, safe: { x: 0, z: 0, yaw: 0 }, safeT: 0, lastImpact: 0, crashFlag: 0, skid: 0
};
const _gs = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false, loose: 0 }, WH = [0, 0, 0, 0];
function wheelGround(c, P) {
  P = P || CARP; const s = Math.sin(c.yaw), co = Math.cos(c.yaw), hw = P.track / 2; let mu = 0, rr = 0, rough = 0, road = 0, water = 0, loose = 0;
  const PT = [[-hw, P.a], [hw, P.a], [-hw, -P.b], [hw, -P.b]];
  for (let k = 0; k < 4; k++) {
    const lx = PT[k][0], lz = PT[k][1];
    _gs.loose = 0; groundAt(c.x + s * lz + co * lx, c.z + co * lz - s * lx, _gs);
    WH[k] = _gs.h; loose += _gs.loose; mu += _gs.mu; rr += _gs.rr; rough += _gs.rough; road += _gs.road ? 1 : 0; water += _gs.water ? 1 : 0;
  }
  const sf = c.surf; sf.mu = mu / 4; sf.rr = rr / 4; sf.rough = rough / 4; sf.road = road >= 2; sf.water = water >= 3; sf.loose = loose / 4;
}

/* static collisions (circles + boxes) with impulse response */
const CIRC = [[1.7, 1.0], [0, 1.0], [-1.7, 1.0]];
function contact(c, px, pz, nx, nz, pen, ovx, ovz, P) {
  ovx = ovx || 0; ovz = ovz || 0; P = P || CARP;
  c.x += nx * pen; c.z += nz * pen;
  const rx = px - c.x, rz = pz - c.z, j0 = rz, j1 = -rx;
  const vcx = c.vx + c.w * j0 - ovx, vcz = c.vz + c.w * j1 - ovz, vn = vcx * nx + vcz * nz;
  if (vn < 0) {
    const jn = j0 * nx + j1 * nz, e = 0.22;
    const jm = -(1 + e) * vn / (1 / P.m + jn * jn / P.Iz);
    c.vx += jm * nx / P.m; c.vz += jm * nz / P.m; c.w += jm * jn / P.Iz;
    const tx = -nz, tz = nx, vt = vcx * tx + vcz * tz; const fr = clamp(vt * 0.12, -1, 1) * 0.5;
    c.vx -= tx * fr * Math.abs(vn) * 0.1; c.vz -= tz * fr * Math.abs(vn) * 0.1;
    c.vx *= 0.995; c.vz *= 0.995;
    if (-vn > c.crashFlag) { c.crashFlag = -vn; c.cx = px; c.cz = pz; }
  }
}
function collideStatic(c, P, circ) {
  circ = circ || CIRC; const s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  for (let k = 0; k < 3; k++) {
    const R = circ[k][1]; const px = c.x + s * circ[k][0], pz = c.z + co * circ[k][0];
    if (Rally.on) { Rally.collide(c, px, pz, R, P); continue; }
    if (Drag.on) { Drag.collide(c, px, pz, R, P); continue; }
    if (Track.s) Track.collide(c, px, pz, R, P);
    const ccx = Math.floor(px / CHUNK), ccz = Math.floor(pz / CHUNK);
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      const ch = Chunks.get(ccx + dx, ccz + dz); if (!ch) continue;
      const cc = ch.cols.c, bb = ch.cols.b;
      for (let i = 0; i < cc.length; i++) {
        const o = cc[i], ddx = px - o[0], ddz = pz - o[1], rr = o[2] + R; const d2 = ddx * ddx + ddz * ddz;
        if (d2 < rr * rr && !(c.y > o[4] + 0.4 || c.y + 3 < o[3])) {   /* only what is actually at the car's height */ const d = Math.sqrt(d2) || 0.01; contact(c, px, pz, ddx / d, ddz / d, rr - d, 0, 0, P); }
      }
      for (let i = 0; i < bb.length; i++) {
        const o = bb[i]; if (px < o[0] - R || px > o[2] + R || pz < o[1] - R || pz > o[3] + R || c.y > o[4] + 0.4 || c.y + 3 < o[5]) continue;
        const qx = clamp(px, o[0], o[2]), qz = clamp(pz, o[1], o[3]); let nx, nz, pen;
        if (qx === px && qz === pz) {
          const dl = px - o[0], dr = o[2] - px, dt = pz - o[1], db = o[3] - pz, m = Math.min(dl, dr, dt, db);
          if (m === dl) { nx = -1; nz = 0; } else if (m === dr) { nx = 1; nz = 0; } else if (m === dt) { nx = 0; nz = -1; } else { nx = 0; nz = 1; } pen = m + R;
        } else { const ddx = px - qx, ddz = pz - qz, d = Math.sqrt(ddx * ddx + ddz * ddz); if (d >= R) continue; nx = ddx / d; nz = ddz / d; pen = R - d; }
        contact(c, px, pz, nx, nz, pen, 0, 0, P);
      }
    }
  }
}

/* one physics sub-step */
function stepCar(dt, c0, P0, T0, circ0) {
  const c = c0 || car, P = P0 || CARP, T = T0 || tune, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  let vf = c.vx * s + c.vz * co, vr = c.vx * co - c.vz * s;
  wheelGround(c, P);
  /* rally: the road leans. Gravity pulls the car down the cross-slope, a banked road presses the tyres harder into the dirt in a bend (an off-camber one lifts them off it), and a wall
     scrape (set by the last collision pass) drags the speed down */
  let nfB = 1;
  if (Rally.on) {
    if (!c.air) {
      const cs = ((WH[1] + WH[3]) - (WH[0] + WH[2])) / (2 * P.track), cl = clamp(cs, -0.7, 0.7), ca = 1 / Math.sqrt(1 + cl * cl);   /* + = the left side is higher */
      c.cs = (c.cs || 0) + (cl - (c.cs || 0)) * Math.min(1, dt * 12);
      const sn = c.cs / Math.sqrt(1 + c.cs * c.cs);
      vr -= G * sn * dt; nfB = clamp(ca - (c.ayL || 0) / G * sn, 0.55, 1.6);
    }
    if (c.rail > 0) {
      const sp = Math.hypot(c.vx, c.vz);
      if (sp > 0.5) { const dv = Math.min(sp * 0.4, (5 + 16 * Math.min(1, Math.max(0, c.rail - 0.1) / 0.12)) * dt);   /* c.rail = 0.1 + how far the last collision pass had to push the car out: touching scrapes at 5 m/s^2, pressing in hard at 21 */ vf -= vf / sp * dv; vr -= vr / sp * dv; c.railFx = sp; }
      c.rail = 0;
    }
  }
  const mu = c.surf.mu * T.mu * (c.surf.road ? 1 : T.off) * nfB, spd = Math.abs(vf);
  /* axle loads: static split + longitudinal weight transfer (last step's accel) + aero downforce */
  const down = T.cl * spd * spd, Nf0 = P.m * G * P.b / P.L, Nr0 = P.m * G * P.a / P.L;
  const dN = clamp(P.m * c.axL * P.cgh / P.L, -0.35 * Nf0, 0.35 * Nr0);
  const Nf = Nf0 - dN + down * (1 - P.ab), Nr = Nr0 + dN + down * P.ab;
  /* lateral load transfer: the loaded outer tyres give less grip than they add (load sensitivity), more so for tall cars; rsf = front roll-stiffness share */
  const lq = Math.min(1.2, 2 * Math.abs(c.ayL) * P.cgh / (G * P.track)), lq2 = 0.2 * lq * lq;
  const kF = 1 - lq2 * 2 * P.rsf, kR = 1 - lq2 * 2 * (1 - P.rsf);
  const skS = P.sk || 1, maxS = clamp((1.5 * mu * (1 + down / (P.m * G)) * G * P.L / Math.max(spd * spd, 1) + 0.05) * skS, 0.07, 0.56 * skS);   /* P.sk: steering lock (tuning) */
  const delta = c.steer * maxS * (1 + Math.min(0.45, Math.abs(vr) / Math.max(6, spd) * 0.9)); c.delta = delta;
  let thr = c.thr, brk = c.brk;
  if (vf < 0.8 && brk > 0.1 && thr < 0.05) c.rev = true;
  if (thr > 0.1) c.rev = false;
  const sg = vf >= 0 ? 1 : -1;
  const ratio = P.gears[c.gear - 1] * P.fd, wheelRpm = spd / (TAU * P.rw) * 60;
  let rpm = Math.max(P.idle, wheelRpm * ratio);
  const thN = clamp(thr, 0, 1), upR = P.red * (0.5 + 0.43 * thN), dnR = P.red * (0.2 + 0.14 * thN);
  if (c.shift > 0) c.shift -= dt; else { if (rpm > upR && c.gear < P.gears.length) { c.gear++; c.shift = 0.16; } else if (rpm < dnR && c.gear > 1) { c.gear--; c.shift = 0.08; } }
  if (spd < 2) c.gear = 1;
  const rpmT = Math.max(rpm, P.red * (c.gear === 1 ? 0.46 : 0.243));
  let tq = T.Tmax * (0.62 + 0.38 * Math.sin(Math.PI * Math.pow(clamp((rpmT - 800) / (P.red - 700), 0, 1), P.tqSkew || 1))); if (rpm > P.red) tq = 0;   /* P.tqSkew moves the torque peak down (< 1) or up (> 1) the rev range */
  const nOn = c.nit && c.nitro > 0 && thr > 0.1 && !c.rev;
  /* traction limit: the driven axle(s) can only put down mu x their load; AWD shares by load */
  const rdE = clamp(P.awd ? 0.7 * Nr / (Nf + Nr) + 0.3 * P.rd : P.rd, 0.06, 0.94);
  /* traction control: ease off the power as the rear tyres run out of lateral grip (off with the handbrake so drifts still hold) */
  const ra = Rally.on && (c !== car || Rally.assistOn()), tcf = c.hand > 0.5 ? 1 : 1 - (ra ? 0.88 : P.tc != null ? P.tc : 0.7) * (ra ? sstep(0.3, 0.7, c.utR || 0) : sstep(0.5, 0.9, c.utR || 0));   /* the rally stage's driving assist cuts power earlier and harder */
  const lonF = P.lonF || 1, lonR = P.lonR || 1;   /* per-axle tyre factors from the tuning setup (camber, pressure): lon = traction and braking, lat = cornering */
  const FmaxRaw = 0.93 * Math.min(mu * lonR * Nr / rdE, mu * lonF * Nf / (1 - rdE)), Fmax = FmaxRaw * tcf;
  const fbf = clamp(Nf / (Nf + Nr) + 0.05 + (P.bb || 0), 0.3, 0.85);
  let F = 0, Fb = 0;
  if (c.rev) { F = -brk * 5200 * (P.m / 1400) * (1 - sstep(7, 12, -vf)); Fb = thr * mu * (P.m * G + down) * 0.9; }
  else { F = thr * tq * ratio * 0.9 / P.rw * (c.shift > 0 ? 0.15 : 1) * (nOn ? P.nitK || 1.32 : 1); F = Math.min(F, Fmax); Fb = brk * mu * (P.m * G + down) * 0.9 * T.brk; }
  /* ABS: the brakes can't ask more than ~88% of either axle's grip, so the car keeps some steering while braking hard */
  Fb = Math.min(Fb, 0.88 * Math.min(mu * lonF * Nf * kF / fbf, mu * lonR * Nr * kR / (1 - fbf)));
  c.spin = !c.rev && tcf > 0.9 && F >= Fmax * 0.97 && spd < 28;
  const Fh = c.hand * mu * P.m * G * 0.35;
  const slopeF = (((WH[0] + WH[1]) / 2) - ((WH[2] + WH[3]) / 2)) / P.L;
  const Fx = F - P.m * G * slopeF * 0.8;
  const Feb = c.rev ? 0 : (1 - thr) * 0.12 * T.Tmax * (rpm / P.red) * ratio * 0.9 / P.rw;
  const R = T.cd * spd * spd + c.surf.rr * (P.rrK || 1) * P.m * G * (1 + 0.012 * spd) * (spd > 0.05 ? 1 : 0) + Feb + Fb + Fh;
  const aLong = (Fx - sg * R) / P.m;
  vf += Fx / P.m * dt; const dres = R / P.m * dt;
  if (Math.abs(vf) <= dres) vf = 0; else vf -= Math.sign(vf) * dres;
  /* lateral / yaw (bicycle model with friction circle) */
  const vxa = Math.max(Math.abs(vf), 1.2);
  const af = Math.atan2(vr + P.a * c.w, vxa) - delta * sg, ar = Math.atan2(vr - P.b * c.w, vxa);
  const fxR = rdE * Math.abs(F) + (1 - fbf) * Fb + Fh, fxF = (1 - rdE) * Math.abs(F) + fbf * Fb;
  const lz = c.surf.loose || 0, slF = 1 - 0.22 * lz * sstep(0.07, 0.3, Math.abs(af)), slR = 1 - 0.22 * lz * sstep(0.07, 0.3, Math.abs(ar));   /* gravel: peak grip then a slide */
  const latK = P.lat || 1, muR = mu * (c.hand > 0.5 ? 0.36 : 1), capF = mu * Nf * kF * slF * latK * (P.latF || 1), capR = muR * Nr * kR * slR * latK * (P.latR || 1);   /* P.lat: a car whose tyres launch far better than they corner (drag rubber) */
  const fcF = Math.sqrt(Math.max(0.05, 1 - Math.pow(Math.min(0.97, fxF / capF), 2))), fcR = Math.sqrt(Math.max(0.05, 1 - Math.pow(Math.min(0.97, fxR / capR), 2)));
  const FyfM = capF * fcF, FyrM = capR * fcR;
  /* cornering stiffness follows the static + aero axle load only: tyre load sensitivity cancels the braking/accel transfer, which keeps trail-braking progressive instead of snapping round */
  const NsF = Nf0 + down * (1 - P.ab), NsR = Nr0 + down * P.ab;
  const Fyf = -FyfM * Math.tanh(P.cf * NsF * af / Math.max(FyfM, 1)), Fyr = -FyrM * Math.tanh(P.cr * NsR * ar / Math.max(FyrM, 1));
  c.utR = (c.utR || 0) + (Math.min(1, Math.abs(Fyr) / Math.max(FyrM, 1)) - (c.utR || 0)) * Math.min(1, dt * 15);
  const cd = Math.cos(delta), sd = Math.sin(delta);
  vr += (Fyf * cd + Fyr) / P.m * dt; vf += (-Fyf * sd) / P.m * dt;
  c.w += (P.a * Fyf * cd - P.b * Fyr) / P.Iz * dt; c.w *= 1 - dt * 0.35;
  /* crawl-speed blend (kinematic steering, sideways creep damped). Keyed on the car's TOTAL speed: a car sliding sideways in a handbrake turn has almost no forward speed, and judging it by that alone used to kill the whole slide like a wall */
  const spT = Math.hypot(vf, vr);
  if (spT < 5) { const k = 1 - sstep(1.5, 5, spT); const wk = vf * Math.tan(delta) / P.L; c.w += (wk - c.w) * Math.min(1, k * 8 * dt); vr *= 1 - k * Math.min(1, 6 * dt); }
  c.vx = vf * s + vr * co; c.vz = vf * co - vr * s; c.yaw += c.w * dt; c.x += c.vx * dt; c.z += c.vz * dt;
  c.axL += (aLong - c.axL) * Math.min(1, dt * 6); c.ayL += ((Fyf * cd + Fyr) / P.m - c.ayL) * Math.min(1, dt * 8);
  c.speed = vf; c.rpm = rpm; c.slip = Math.abs(vr) / Math.max(spd, 6);
  c.driftAng = Math.atan2(Math.abs(vr), Math.max(0.5, spd));
  c.drifting = spd > 9 && Math.abs(vr) > 2.6; c.braking = Fb > 3000 && spd > 8;
  c.nitroUse = nOn;
  /* vertical + orientation */
  const hF = (WH[0] + WH[1]) / 2, hR = (WH[2] + WH[3]) / 2, hL = (WH[0] + WH[2]) / 2, hRt = (WH[1] + WH[3]) / 2, gy = (hF + hR) / 2;
  const tp = Math.atan2(hF - hR, P.a + P.b), tr = Math.atan2(hRt - hL, P.track);
  const ayPrev = c.vy;
  if (c.air) {
    c.vy -= G * dt; c.y += c.vy * dt; c.airT += dt; c.pitch += (Math.atan2(c.vy, Math.max(8, spd)) * 0.6 - c.pitch) * Math.min(1, dt * 2); c.roll += (0 - c.roll) * Math.min(1, dt);
    if (c.y <= gy) { const imp = -c.vy; c.y = gy; c.air = false; c.sV -= imp * 0.12; if (imp > 4.5) { c.landImpact = imp; } c.vy = 0; c.airT = 0; if (Rally.on) c.airCd = 0.12; }
  } else {
    const need = (gy - c.y) / dt;
    /* on the rally stage: no re-launch for a moment after touchdown (landing zeroes vy, which on any downhill reads as the ground falling away and used to chain into endless air),
       and a take-off margin that grows with speed so the 2 m ground grid's slope kinks are not mistaken for a lip */
    const cd = (c.airCd || 0) > 0; if (cd) c.airCd -= dt;
    if (!cd && need < c.vyPrev - G * dt - (Rally.on ? 0.2 + 0.03 * spd : 0.2) && spd > 8) { c.air = true; c.vy = c.vyPrev; c.y += c.vy * dt; }
    else { c.vy = clamp(need, -30, 30); c.y = gy; }
    c.pitch += (tp - c.pitch) * Math.min(1, dt * 14); c.roll += (tr - c.roll) * Math.min(1, dt * 14);
  }
  const ay = (c.vy - c.vyPrev) / dt; c.vyPrev = c.vy;
  c.sV += (-90 * c.sY - 14 * c.sV - clamp(ay, -30, 30) * 0.35) * dt; c.sY = clamp(c.sY + c.sV * dt, -0.14, 0.12);
  c.sV += (Math.random() - 0.5) * c.surf.rough * Math.min(spd, 40) * 0.02;
  c.onRoad = c.surf.road;
  c.dmax = maxS * (1 + Math.min(0.45, Math.abs(vr) / Math.max(6, spd) * 0.9));
  collideStatic(c, P, circ0);
}

/* ---------------- cockpit ---------------- */
const Cockpit = {};
const EYE = new THREE.Vector3(-0.35, 1.13, 0.12);
function sm(hex, rough, metal, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: lc(hex), roughness: rough, metalness: metal || 0 }, extra || {})); }
function buildCockpit() {
  const g = new THREE.Group();
  const mDark = sm(0x14161a, 0.6, 0.05), mDash = sm(0x1b1e24, 0.5, 0.1), mTrim = sm(0x8a909b, 0.35, 0.8), mRoof = sm(0x3b3e45, 0.95, 0), mLeather = sm(0x101114, 0.7, 0), mDoor = sm(0x1a1c21, 0.65, 0.05);
  const box = (w, h, d, x, y, z, m, rx, ry, rz) => { const me = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); me.position.set(x, y, z); me.rotation.set(rx || 0, ry || 0, rz || 0); g.add(me); return me; };
  const beam = (p0, p1, t, m) => { const a = new THREE.Vector3(...p0), b = new THREE.Vector3(...p1); const len = a.distanceTo(b); const me = new THREE.Mesh(new THREE.BoxGeometry(t, t, len), m); me.position.copy(a).add(b).multiplyScalar(0.5); me.lookAt(b); g.add(me); return me; };
  /* dash: top at y=0.93, driver-facing face at z=0.8 */
  box(1.95, 0.3, 0.55, 0, 0.78, 1.075, mDash); box(1.95, 0.03, 0.5, 0, 0.945, 1.1, mLeather, 0.05);
  box(1.9, 0.02, 0.02, 0, 0.66, 0.795, mTrim); box(0.5, 0.12, 0.03, 0.42, 0.8, 0.795, mDark);
  box(0.28, 0.22, 1.1, 0.12, 0.49, 0.28, mDark); box(0.06, 0.14, 0.06, 0.12, 0.66, 0.5, mTrim);
  box(0.12, 0.45, 1.4, 0.96, 0.7, 0.3, mDoor); box(0.12, 0.45, 1.4, -0.96, 0.7, 0.3, mDoor);
  box(0.14, 0.06, 1.0, 0.94, 0.94, 0.55, mLeather); box(0.14, 0.06, 1.0, -0.94, 0.94, 0.55, mLeather);
  beam([0.88, 0.93, 1.15], [0.7, 1.42, 0.98], 0.075, mRoof); beam([-0.88, 0.93, 1.15], [-0.7, 1.42, 0.98], 0.075, mRoof);
  box(1.5, 0.06, 0.2, 0, 1.42, 1.0, mRoof); box(1.7, 0.03, 1.3, 0, 1.455, 0.3, mRoof);
  /* side mirrors sit outside the windows */
  box(0.12, 0.1, 0.16, 1.04, 1.0, 1.02, MAT.paintPlayer, 0, 0.2, 0); box(0.12, 0.1, 0.16, -1.04, 1.0, 1.02, MAT.paintPlayer, 0, -0.2, 0);
  box(0.03, 0.07, 0.03, 0, 1.38, 0.98, mDark);
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.075), MAT.mirror); mir.position.set(0, 1.325, 0.925); mir.lookAt(EYE.x, EYE.y, EYE.z); g.add(mir); Cockpit.mirror = mir;
  box(0.27, 0.095, 0.04, 0, 1.325, 0.97, mDark).lookAt(EYE.x, EYE.y, EYE.z);
  /* hood */
  box(1.74, 0.07, 1.4, 0, 0.9, 1.88, MAT.paintPlayer, 0.05, 0, 0); box(0.55, 0.05, 0.9, 0, 0.955, 1.95, MAT.paintPlayer, 0.05, 0, 0);
  box(0.34, 0.12, 1.3, 0.83, 0.92, 1.85, MAT.paintPlayer, 0.04, 0, 0); box(0.34, 0.12, 1.3, -0.83, 0.92, 1.85, MAT.paintPlayer, 0.04, 0, 0);
  { const hd = new THREE.Group(); hd.position.z = 1.18; const n = g.children.length; for (const m of g.children.slice(n - 4)) { g.remove(m); m.position.z -= 1.18; hd.add(m); } g.add(hd); Cockpit.hood = hd; }
  /* steering wheel */
  const wm = new THREE.Group(); wm.position.set(-0.35, 0.74, 0.58); wm.rotation.x = 0.5; g.add(wm);
  const wheel = new THREE.Group(); wm.add(wheel);
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.017, 8, 36), mLeather));
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.045, 16), mTrim); hub.rotation.x = Math.PI / 2; wheel.add(hub);
  for (const a of [Math.PI / 2, Math.PI * 1.17, Math.PI * 1.83]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.026, 0.012), mDark); sp.position.set(Math.cos(a) * 0.09, Math.sin(a) * 0.09, 0); sp.rotation.z = a; wheel.add(sp); }
  box(0.09, 0.09, 0.2, -0.35, 0.7, 0.66, mDark, 0.5, 0, 0);
  Cockpit.wheel = wheel;
  /* gauges */
  const gc = mkCanvas(512, 200); Cockpit.gc = gc; Cockpit.gx = gc.getContext('2d'); Cockpit.gtex = new THREE.CanvasTexture(gc); Cockpit.gtex.encoding = THREE.sRGBEncoding; Cockpit.gtex.anisotropy = maxAniso;
  const gm = new THREE.MeshBasicMaterial({ map: Cockpit.gtex, toneMapped: false }); Cockpit.gm = gm;
  const gp = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.195), gm); gp.position.set(-0.35, 0.83, 0.765); gp.rotation.set(-0.2, Math.PI, 0, 'YXZ'); g.add(gp);
  Cockpit.group = g; return g;
}
function drawGauges(kmh, rpm, gear, nitro, health, mph, lampOn, rev) {
  const g = Cockpit.gx; g.clearRect(0, 0, 512, 200);
  g.fillStyle = '#07090c'; g.fillRect(0, 0, 512, 200);
  const dial = (cx, cy, r, max, step, label, v, redFrom, fmt) => {
    g.save(); g.translate(cx, cy);
    const grd = g.createRadialGradient(0, 0, r * 0.2, 0, 0, r); grd.addColorStop(0, '#12161d'); grd.addColorStop(1, '#0a0c10'); g.fillStyle = grd; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.strokeStyle = '#2b3340'; g.lineWidth = 3; g.stroke();
    const a0 = 135 * DEG, sw = 270 * DEG;
    for (let k = 0; k <= max / (step / 2); k++) {
      const val = k * step / 2, a = a0 + val / max * sw, major = k % 2 === 0; const r1 = r - 6, r2 = r - (major ? 17 : 11);
      g.strokeStyle = (redFrom && val >= redFrom) ? '#ff3b3b' : (major ? '#e9eef7' : '#7d8797'); g.lineWidth = major ? 2.6 : 1.4;
      g.beginPath(); g.moveTo(Math.cos(a) * r1, Math.sin(a) * r1); g.lineTo(Math.cos(a) * r2, Math.sin(a) * r2); g.stroke();
      if (major) { g.fillStyle = (redFrom && val >= redFrom) ? '#ff5252' : '#d9e2f1'; g.font = '600 15px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fmt(val), Math.cos(a) * (r - 31), Math.sin(a) * (r - 31)); }
    }
    const a = a0 + clamp(v / max, 0, 1.02) * sw;
    g.rotate(a); g.fillStyle = '#ff9d1c'; g.beginPath(); g.moveTo(-10, -2.2); g.lineTo(r - 12, -1.2); g.lineTo(r - 12, 1.2); g.lineTo(-10, 2.2); g.fill();
    g.rotate(-a); g.fillStyle = '#1b2029'; g.beginPath(); g.arc(0, 0, 9, 0, TAU); g.fill();
    g.fillStyle = '#8b95a6'; g.font = '600 12px Rajdhani, sans-serif'; g.textAlign = 'center'; g.fillText(label, 0, r * 0.38);
    g.restore();
  };
  dial(110, 100, 88, Math.ceil((CARP.red + 500) / 1000) * 1000, 1000, 'x1000 RPM', rpm, CARP.red - 400, (v) => String(v / 1000));
  dial(402, 100, 88, mph ? (CUR.dial > 300 ? 220 : 160) : CUR.dial, mph ? 20 : (CUR.dial > 300 ? 40 : 40), mph ? 'MPH' : 'KM/H', mph ? kmh * 0.621 : kmh, 0, (v) => String(v));
  g.fillStyle = '#e9eef7'; g.font = '700 54px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(rev ? 'R' : (kmh < 1 && gear === 1 ? 'N' : String(gear)), 256, 82);
  g.fillStyle = '#ff9d1c'; g.font = '700 28px Rajdhani, sans-serif'; g.fillText(String(Math.round(mph ? kmh * 0.621 : kmh)), 256, 128);
  g.fillStyle = '#7d8797'; g.font = '600 12px Rajdhani, sans-serif'; g.fillText(mph ? 'MPH' : 'KM/H', 256, 148);
  g.fillStyle = '#1a2029'; g.fillRect(214, 164, 84, 8); g.fillStyle = '#35c8ff'; g.fillRect(214, 164, 84 * clamp(nitro / tune.nitroMax, 0, 1), 8);
  g.fillStyle = '#1a2029'; g.fillRect(214, 178, 84, 8); g.fillStyle = health > 35 ? '#4be08a' : '#ff4d5e'; g.fillRect(214, 178, 84 * clamp(health / 100, 0, 1), 8);
  const lights = clamp((rpm - (CARP.red - 2200)) / 1800, 0, 1) * 8;
  for (let k = 0; k < 8; k++) { g.fillStyle = k < lights ? (k < 4 ? '#3dff7a' : k < 6 ? '#ffd23d' : '#ff3b3b') : '#1b2029'; g.beginPath(); g.arc(196 + k * 17, 14, 5, 0, TAU); g.fill(); }
  Cockpit.gtex.needsUpdate = true;
}

/* ---------------- mirror ---------------- */
const Mirror = { rt: null, cam: null, n: 0 };
function initMirror() {
  MAT.mirror = new THREE.MeshBasicMaterial({ color: 0x20252c, toneMapped: false, side: THREE.DoubleSide });
  Mirror.cam = new THREE.PerspectiveCamera(46, 3.2, 0.3, 1800);
}
function setupMirrorRT() {
  if (!hasPost || !Q.mirror) { MAT.mirror.map = null; MAT.mirror.color.setHex(0x20252c); MAT.mirror.needsUpdate = true; return; }
  if (Mirror.rt) Mirror.rt.dispose();
  Mirror.rt = new THREE.WebGLRenderTarget(320, 100, { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter });
  Mirror.rt.texture.wrapS = THREE.RepeatWrapping; Mirror.rt.texture.repeat.x = -1; Mirror.rt.texture.offset.x = 1;
  MAT.mirror.map = Mirror.rt.texture; MAT.mirror.color.setHex(0xffffff); MAT.mirror.needsUpdate = true;
}
function renderMirror() {
  if (!Mirror.rt || !Q.mirror || Cam.view !== 0 || Foot.on) return;
  if ((Mirror.n++ % Q.mirror) !== 0) return;
  const c = car; Mirror.cam.position.set(c.x, c.y + 1.3 + CUR.dy, c.z); Mirror.cam.rotation.set(0.02, c.yaw, 0, 'YXZ');
  Cockpit.group.visible = false; const sa = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
  renderer.setRenderTarget(Mirror.rt); renderer.render(scene, Mirror.cam); renderer.setRenderTarget(null);
  renderer.shadowMap.autoUpdate = sa; Cockpit.group.visible = true;
}

/* ---------------- camera rig ---------------- */
const Cam = { view: 0, lookYaw: 0, lookPitch: 0, shake: 0, chaseYaw: 0, ch: 0, dist: 6.2, fov: 76, dragging: false, back: false };
const _eye = new THREE.Vector3(), _eul = new THREE.Euler(0, 0, 0, 'YXZ');
function updateCamera(dt, speedFx) {
  const c = car, b = car.body;
  /* body pitch/roll ride on a sprung, slightly under-damped mount: squat on throttle, dive under braking, roll and settle in corners (taller cars lean more) */
  const sc = CARP.cgh / 0.5 * 1.25, tP = c.axL * 0.0022 * sc, tR = c.ayL * 0.0035 * sc;
  const SW = 11, SZ = 0.5, sn = Math.max(1, Math.ceil(Math.min(dt, 0.1) / 0.008)), sh_ = Math.min(dt, 0.1) / sn;
  for (let i = 0; i < sn; i++) {
    c.leanPv += (SW * SW * (tP - c.leanP) - 2 * SZ * SW * c.leanPv) * sh_; c.leanP += c.leanPv * sh_;
    c.leanRv += (SW * SW * (tR - c.leanR) - 2 * SZ * SW * c.leanRv) * sh_; c.leanR += c.leanRv * sh_;
  }
  const leanP = c.leanP, leanR = c.leanR;
  b.position.set(c.x, c.y, c.z);
  b.rotation.set(-(c.pitch + leanP), c.yaw, c.roll + leanR, 'YXZ'); b.updateMatrixWorld(true);
  const spd = Math.abs(c.speed);
  const sh = save.set.shake ? Cam.shake : 0;
  if (devOn('free')) {
    const k = (Keys.ShiftLeft || Keys.ShiftRight ? 70 : 16) * dt, cp = Math.cos(Dev.fpitch);
    const fx = -Math.sin(Dev.fyaw) * cp, fy = Math.sin(Dev.fpitch), fz = -Math.cos(Dev.fyaw) * cp, rx = Math.cos(Dev.fyaw), rz = -Math.sin(Dev.fyaw);
    const mf = (Keys.KeyW ? 1 : 0) - (Keys.KeyS ? 1 : 0), mr = (Keys.KeyD ? 1 : 0) - (Keys.KeyA ? 1 : 0), mv = (Keys.Space ? 1 : 0) - (Keys.KeyZ ? 1 : 0);
    Dev.fx += (fx * mf + rx * mr) * k; Dev.fy += (fy * mf + mv) * k; Dev.fz += (fz * mf + rz * mr) * k;
    camera.position.set(Dev.fx, Dev.fy, Dev.fz); camera.rotation.set(Dev.fpitch, Dev.fyaw, 0, 'YXZ');
  } else if (Cam.view === 0) {
    _eye.copy(EYE); b.localToWorld(_eye); _eye.y += c.sY;
    camera.position.set(_eye.x + (Math.random() - 0.5) * sh * 0.05, _eye.y + (Math.random() - 0.5) * sh * 0.05, _eye.z + (Math.random() - 0.5) * sh * 0.05);
    let ly = Cam.back ? Math.PI : Cam.lookYaw;
    camera.rotation.set(c.pitch * 0.75 + leanP * 0.8 + Cam.lookPitch + (Math.random() - 0.5) * sh * 0.004, c.yaw + Math.PI + ly, (c.roll + leanR) * 0.5 + (Math.random() - 0.5) * sh * 0.004, 'YXZ');
    if (Cam.back) camera.position.y += 0;
  } else if (Cam.view === 1) {
    _eye.set(0, CUR.bumpY, CUR.bumpZ); b.localToWorld(_eye); camera.position.copy(_eye); camera.position.y += c.sY * 0.6;
    camera.rotation.set(c.pitch * 0.8 + Cam.lookPitch, c.yaw + Math.PI + Cam.lookYaw + (Cam.back ? Math.PI : 0), (c.roll + leanR) * 0.4, 'YXZ');
  } else {
    /* third-person chase: lags into drifts, rides smoothly over bumps, never dips below terrain */
    const drift = (c.slip > 0.2 && c.speed > 4) ? angDiff(c.yaw, Math.atan2(c.vx, c.vz)) * 0.5 : 0;
    Cam.chaseYaw += angDiff(Cam.chaseYaw, c.yaw + drift) * Math.min(1, dt * 4);
    const ly = Cam.lookYaw + (Cam.back ? Math.PI : 0);
    const cy = Cam.chaseYaw + ly, d = Cam.dist + (CUR.hl - 2.15) * 0.9 + spd * 0.03;
    const wantH = c.y + 2.1 + (CUR.top - 1.46) * 0.8 + (Cam.dist - 6.2) * 0.25 + spd * 0.008 + c.sY - Cam.lookPitch * 2.5;
    if (Math.abs(Cam.ch - wantH) > 6) Cam.ch = wantH;
    Cam.ch += (wantH - Cam.ch) * Math.min(1, dt * 7);
    const px = c.x - Math.sin(cy) * d, pz = c.z - Math.cos(cy) * d;
    const floorY = Math.max(terrainHeight(px, pz), 0.2) + 0.9;
    const camY = Math.max(Cam.ch, floorY, c.y + 1.0);
    camera.position.set(px + (Math.random() - 0.5) * sh * 0.03, camY + (Math.random() - 0.5) * sh * 0.03, pz + (Math.random() - 0.5) * sh * 0.03);
    const ahead = 4.5 * Math.max(0, Math.cos(ly));
    camera.lookAt(c.x + Math.sin(c.yaw) * ahead, c.y + 1.2 + (CUR.top - 1.46) * 0.5 + Cam.lookPitch * 6, c.z + Math.cos(c.yaw) * ahead);
    camera.rotation.z += (c.roll + leanR) * 0.15;
  }
  let wantFov = save.set.fov + clamp(spd * 0.1, 0, 10) + (c.nitroUse ? 7 : 0) + speedFx;
  if (camera.aspect < 1.33) wantFov = Math.min(105, 2 * Math.atan(Math.tan(wantFov * DEG / 2) * 1.33 / camera.aspect) / DEG);
  Cam.fov += (wantFov - Cam.fov) * Math.min(1, dt * 4);
  if (Math.abs(camera.fov - Cam.fov) > 0.05) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
  Cam.shake *= Math.max(0, 1 - dt * 5);
  if (Cam.view === 0) { Cockpit.wheel.rotation.z = -c.steer * 2.0; }
  const fc = devOn('free'); Cockpit.group.visible = Cam.view === 0 && !fc; car.ext.visible = Cam.view !== 0 || fc;
}

/* ---------------- particles ---------------- */
const Part = {};
function mkPoints(n, blend, vsz) {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aCol', new THREE.BufferAttribute(col, 4)); g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: blend, uniforms: { uScale: { value: 600 } },
    vertexShader: 'attribute vec4 aCol; attribute float aSize; varying vec4 vC; uniform float uScale; void main(){ vC=aCol; vec4 mv=modelViewMatrix*vec4(position,1.0); vC.a*=smoothstep(2.0,9.0,-mv.z); gl_Position=projectionMatrix*mv; gl_PointSize=aSize*uScale/max(0.5,-mv.z); }',
    fragmentShader: 'varying vec4 vC; void main(){ vec2 p=gl_PointCoord-0.5; float d=length(p)*2.0; float a=1.0-smoothstep(0.0,1.0,d); gl_FragColor=vec4(vC.rgb,vC.a*a*a); }' });
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 5;
  return { pts, n, pos, col, size, g, life: new Float32Array(n), max: new Float32Array(n), vel: new Float32Array(n * 3), a0: new Float32Array(n), s0: new Float32Array(n), grow: new Float32Array(n), grav: new Float32Array(n), cr: new Float32Array(n * 3), next: 0 };
}
function initParticles() { Part.smoke = mkPoints(300, THREE.NormalBlending); Part.spark = mkPoints(200, THREE.AdditiveBlending); scene.add(Part.smoke.pts, Part.spark.pts); }
function emit(S, x, y, z, vx, vy, vz, life, size, grow, r, g, b, a, grav) {
  if (S === Part.smoke && Cam.view === 2) { size *= 0.5; grow *= 0.55; a *= 0.6; }
  const i = S.next; S.next = (S.next + 1) % S.n;
  S.pos[i * 3] = x; S.pos[i * 3 + 1] = y; S.pos[i * 3 + 2] = z; S.vel[i * 3] = vx; S.vel[i * 3 + 1] = vy; S.vel[i * 3 + 2] = vz;
  S.life[i] = life; S.max[i] = life; S.s0[i] = size; S.grow[i] = grow; S.a0[i] = a; S.cr[i * 3] = r; S.cr[i * 3 + 1] = g; S.cr[i * 3 + 2] = b; S.grav[i] = grav;
}
function updateParticles(dt) {
  for (const S of [Part.smoke, Part.spark]) {
    for (let i = 0; i < S.n; i++) {
      if (S.life[i] <= 0) { S.col[i * 4 + 3] = 0; S.size[i] = 0; continue; }
      S.life[i] -= dt; const f = Math.max(0, S.life[i] / S.max[i]);
      S.vel[i * 3 + 1] -= S.grav[i] * dt; S.pos[i * 3] += S.vel[i * 3] * dt; S.pos[i * 3 + 1] += S.vel[i * 3 + 1] * dt; S.pos[i * 3 + 2] += S.vel[i * 3 + 2] * dt;
      S.size[i] = S.s0[i] + S.grow[i] * (1 - f); S.col[i * 4] = S.cr[i * 3]; S.col[i * 4 + 1] = S.cr[i * 3 + 1]; S.col[i * 4 + 2] = S.cr[i * 3 + 2]; S.col[i * 4 + 3] = S.a0[i] * f;
    }
    S.g.attributes.position.needsUpdate = true; S.g.attributes.aCol.needsUpdate = true; S.g.attributes.aSize.needsUpdate = true;
  }
  const u = 0.5 * (renderer.domElement.height || 720) / Math.tan(camera.fov * DEG / 2);
  Part.smoke.pts.material.uniforms.uScale.value = u; Part.spark.pts.material.uniforms.uScale.value = u;
}
function carFx(dt) {
  const c = car, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  const rearW = [[-CARP.track / 2, -CARP.b], [CARP.track / 2, -CARP.b]];
  if ((c.drifting || c.spin || (c.braking && Math.abs(c.speed) > 15)) && !c.air && Math.random() < dt * 70) {
    for (const w of rearW) { const x = c.x + s * w[1] + co * w[0], z = c.z + co * w[1] - s * w[0]; emit(Part.smoke, x, c.y + 0.15, z, c.vx * 0.2 + (Math.random() - 0.5), 0.8 + Math.random() * 0.6, c.vz * 0.2 + (Math.random() - 0.5), 1.4 + Math.random() * 0.8, 0.9, 3.2, 0.85, 0.85, 0.85, 0.42, -0.2); }
  }
  if (!c.surf.road && !c.air && Math.abs(c.speed) > 8 && Math.random() < dt * 40) {
    const tone = c.surf.mu < 0.6 ? [0.8, 0.7, 0.5] : [0.45, 0.38, 0.28];
    for (const w of rearW) { const x = c.x + s * w[1] + co * w[0], z = c.z + co * w[1] - s * w[0]; emit(Part.smoke, x, c.y + 0.1, z, (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), (Math.random() - 0.5) * 1.5, 1.2 + Math.random(), 0.7, 2.6, tone[0], tone[1], tone[2], 0.32, -0.1); }
  }
  if (c.health < 40 && Math.random() < dt * 25) { const x = c.x + s * 2 , z = c.z + co * 2; emit(Part.smoke, x, c.y + 1.0, z, c.vx * 0.5 + (Math.random() - 0.5), 1.2, c.vz * 0.5 + (Math.random() - 0.5), 1.6, 0.7, 2.2, 0.1, 0.1, 0.1, 0.5, -0.3); }
}
function sparks(x, y, z, n, power) {
  for (let i = 0; i < n; i++) emit(Part.spark, x, y, z, (Math.random() - 0.5) * power, Math.random() * power * 0.6, (Math.random() - 0.5) * power, 0.35 + Math.random() * 0.5, 0.2, -0.1, 3.0, 1.6, 0.5, 1, 9);
}
