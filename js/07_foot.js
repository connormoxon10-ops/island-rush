/* ================= ON FOOT =================
   F gets you out of the car (stopped, no run in progress) and back in again. On foot you walk, run (Shift) and jump (Space) over the
   same terrain, collide with buildings, trees, the parked car and traffic, and get knocked flat by a car if you step in front of one.
   First person (default) or third person with a visible character, drawn through the pedestrian instanced meshes as one extra body.
   Pl is the "player anchor": the car while driving, the walker on foot. Streaming, the minimap, GPS and pedestrians follow Pl. */
const Pl = { x: 0, y: 0, z: 0, yaw: 0, speed: 0 };
const Foot = { on: false, x: 0, y: 0, z: 0, vx: 0, vz: 0, vy: 0, yaw: 0, pitch: 0, body: 0, speed: 0, air: false, ph: 0, fovAdd: 0, bobPh: 0, stepD: 0, dip: 0, state: 'walk', downT: 0, hitCool: 0, tp: false, prevView: 0, target: null, carNear: false, ped: null, t: 0, idleT: 0, locked: false, camD: 3.4 };
const FR = 0.36, _fg = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false };
function syncPl() {
  if (Foot.on) { Pl.x = Foot.x; Pl.y = Foot.y; Pl.z = Foot.z; Pl.yaw = Foot.yaw; Pl.speed = Foot.speed; }
  else if (Boat.on && Boat.p) { const P = Boat.p; Pl.x = P.x; Pl.y = P.y; Pl.z = P.z; Pl.yaw = P.yaw; Pl.speed = P.speed || 0; }
  else if (Fly.on && Fly.p) { const P = Fly.p; Pl.x = P.x; Pl.y = P.y; Pl.z = P.z; Pl.yaw = P.yawH || 0; Pl.speed = P.speed || 0; }
  else { Pl.x = car.x; Pl.y = car.y; Pl.z = car.z; Pl.yaw = car.yaw; Pl.speed = car.speed; }
}
function footBase() {
  const jk = lc(curColor() || PAINTS[0]);
  return { s: 0.99, hs: 1, skin: PSKIN[1], hair: PHAIR[0], shirt: jk, pants: PPANTS[1], shoe: PSHOE[2], sleeve: true, bag: false, bagc: PSHIRT[5], kid: false, stout: 1.0, hat: null, glasses: false, glassC: null, shorts: false, fem: false, hst: 'short', beard: false, old: false, skirt: 0, tights: false, coat: false, sun: false };
}
function footApp() { return cosApplyOutfit(footBase(), cosOutfitView()); }
function footNewPed() {
  return { app: footApp(), x: 0, y: 0, z: 0, yaw: 0, v: 0, ph: 0, state: 'stand', wait: 0, tilt: 0, t: 0, vx: 0, vz: 0, vy: 0, spin: 0, phone: false, seed: 3.7, air: false, lieT: 0, wave: 0, jump: false, avatar: true };
}

/* ---------- input ---------- */
const _fi = { f: 0, r: 0, turn: 0, run: false, jump: false, lx: 0, ly: 0 };
function footInput() {
  const K = Keys, T = TouchIn, I = _fi;
  I.f = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0) + T.gas - T.brk; I.r = (K.KeyD ? 1 : 0) - (K.KeyA ? 1 : 0) + T.r - T.l; I.turn = (K.ArrowLeft ? 1 : 0) - (K.ArrowRight ? 1 : 0);
  I.run = !!(K.ShiftLeft || K.ShiftRight) || !!T.nit; I.jump = !!K.Space || !!T.hand; I.lx = I.ly = 0;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { pads = null; }
  if (pads) for (const p of pads) if (p && p.connected) {
    const dz = (v) => (Math.abs(v) > 0.15 ? v : 0), bv = (i) => (p.buttons[i] ? p.buttons[i].value || (p.buttons[i].pressed ? 1 : 0) : 0);
    I.r += dz(p.axes[0]); I.f -= dz(p.axes[1]); I.lx = dz(p.axes[2] || 0); I.ly = dz(p.axes[3] || 0); I.jump = I.jump || bv(0) > 0.5; I.run = I.run || bv(1) > 0.5 || bv(5) > 0.5;
    const up = bv(12) > 0.5; if (up && !padPrev[12]) onKey('KeyF'); padPrev[12] = up;
    const pu = bv(2) > 0.5; if (pu && !padPrev[2]) Fight.punch(); padPrev[2] = pu; break;
  }
  I.f = clamp(I.f, -1, 1); I.r = clamp(I.r, -1, 1);
  return I;
}

/* ---------- collisions ---------- */
/* a walker can hop over, stand on or pass under what is low, short or high enough; F.supp is the top of whatever is under the feet */
function footResolve() {
  const F = Foot, ccx = Math.floor(F.x / CHUNK), ccz = Math.floor(F.z / CHUNK), fy = F.y; F.supp = -1e9;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ch = Chunks.get(ccx + dx, ccz + dz); if (!ch) continue; const cc = ch.cols.c, bb = ch.cols.b;
    for (let i = 0; i < cc.length; i++) {
      const o = cc[i], ex = F.x - o[0], ez = F.z - o[1], rr = o[2] + FR, d2 = ex * ex + ez * ez; if (d2 >= rr * rr) continue;
      if (fy >= o[4] - 0.3) { const r2 = o[2] * o[2]; if (d2 < r2) { const t = o[5] ? o[3] + (o[4] - o[3]) * Math.sqrt(1 - d2 / r2) : o[4]; if (t > F.supp) F.supp = t; } continue; }
      const d = Math.sqrt(d2) || 0.01; F.x += ex / d * (rr - d); F.z += ez / d * (rr - d);
    }
    for (let i = 0; i < bb.length; i++) {
      const o = bb[i]; if (F.x < o[0] - FR || F.x > o[2] + FR || F.z < o[1] - FR || F.z > o[3] + FR || fy + 1.8 <= o[5]) continue;
      if (fy >= o[4] - 0.3) { if (F.x > o[0] && F.x < o[2] && F.z > o[1] && F.z < o[3] && o[4] > F.supp) F.supp = o[4]; continue; }
      const qx = clamp(F.x, o[0], o[2]), qz = clamp(F.z, o[1], o[3]);
      if (qx === F.x && qz === F.z) {
        const dl = F.x - o[0], dr = o[2] - F.x, dt = F.z - o[1], db = o[3] - F.z, m = Math.min(dl, dr, dt, db);
        if (m === dl) F.x -= m + FR; else if (m === dr) F.x += m + FR; else if (m === dt) F.z -= m + FR; else F.z += m + FR;
      } else { const ex = F.x - qx, ez = F.z - qz, d = Math.sqrt(ex * ex + ez * ez); if (d < FR) { F.x += ex / d * (FR - d); F.z += ez / d * (FR - d); } }
    }
  }
  const s = Math.sin(car.yaw), co = Math.cos(car.yaw);
  for (let k = 0; k < 3; k++) { const qx = car.x + s * CIRC[k][0], qz = car.z + co * CIRC[k][0], ex = F.x - qx, ez = F.z - qz, rr = CIRC[k][1] + FR, d2 = ex * ex + ez * ez; if (d2 < rr * rr) { const d = Math.sqrt(d2) || 0.01; F.x += ex / d * (rr - d); F.z += ez / d * (rr - d); } }
  for (const d of Dyn.list) {
    const dx = F.x - d.x, dz = F.z - d.z; if (dx * dx + dz * dz > 20) continue; const ds = Math.sin(d.yaw), dc = Math.cos(d.yaw);
    for (let k = 0; k < 3; k++) { const qx = d.x + ds * _cs[k], qz = d.z + dc * _cs[k], ex = F.x - qx, ez = F.z - qz, rr = 1.1 + FR, d2 = ex * ex + ez * ez; if (d2 < rr * rr) { const q = Math.sqrt(d2) || 0.01; F.x += ex / q * (rr - q); F.z += ez / q * (rr - q); } }
  }
}
function footBlockedAt(x, z) {
  groundAt(x, z, _fg); if (_fg.water) return true;
  const ccx = Math.floor(x / CHUNK), ccz = Math.floor(z / CHUNK), R = FR + 0.05;
  for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
    const ch = Chunks.get(ccx + dx, ccz + dz); if (!ch) continue;
    for (const o of ch.cols.c) { const ex = x - o[0], ez = z - o[1], rr = o[2] + R; if (ex * ex + ez * ez < rr * rr) return true; }
    for (const o of ch.cols.b) if (x > o[0] - R && x < o[2] + R && z > o[1] - R && z < o[3] + R) return true;
  }
  return false;
}

/* ---------- park / board / leave ---------- */
Foot.parkCar = function (c) { c.thr = 0; c.brk = 0; c.hand = 1; c.nit = false; c.steerIn = 0; c.steer *= 0.9; Cam.back = false; };
Foot.carLocal = function (out) { const dx = Foot.x - car.x, dz = Foot.z - car.z, s = Math.sin(car.yaw), co = Math.cos(car.yaw); out.lz = dx * s + dz * co; out.lx = dx * co - dz * s; return out; };
const _fl = { lx: 0, lz: 0 };
Foot.nearCar = function () { const l = Foot.carLocal(_fl); return Math.abs(l.lz) < 3.5 && Math.abs(l.lx) < 2.7; };
Foot.exit = function () {
  const c = car; if (Foot.on || App.mode !== 'play') return;
  if (Mi) { UI.toast('Finish or abandon the run first', 'bad'); return; }
  if (c.wrecked > 0 || devOn('free')) return;
  if (Math.abs(c.speed) > 3 || c.air) { UI.toast('Stop the car first', 'bad'); return; }
  const s = Math.sin(c.yaw), co = Math.cos(c.yaw); let pos = null;
  for (const [lx, lz] of [[-1.75, 0.2], [1.75, 0.2], [-1.75, -1.6], [1.75, -1.6], [0, -3.6], [0, 3.6]]) { const x = c.x + co * lx + s * lz, z = c.z - s * lx + co * lz; if (!footBlockedAt(x, z)) { pos = { x, z, side: lx }; break; } }
  if (!pos) { UI.toast('No room to get out here', 'bad'); return; }
  if (!Foot.ped) Foot.ped = footNewPed(); Foot.ped.app = footApp();
  Foot.on = true; Foot.x = pos.x; Foot.z = pos.z; groundAt(pos.x, pos.z, _fg); Foot.y = _fg.h; Foot.vx = Foot.vz = Foot.vy = 0; Foot.air = false; Foot.state = 'walk'; Foot.speed = 0; Foot.dip = 0; Foot.hitCool = 1;
  Foot.prevView = Cam.view; Foot.tp = Cam.view === 2; Foot.yaw = Foot.tp && pos.side !== 0 ? c.yaw : c.yaw + (pos.side < 0 ? -1.05 : 1.05); Foot.body = Foot.yaw; Foot.pitch = 0; Foot.camD = 3.4;
  c.thr = c.brk = 0; c.hand = 1; c.nit = false; c.steerIn = 0; Cam.lookYaw = Cam.lookPitch = 0;
  Snd.door(); syncPl(); UI.footMode(true); UI.toast(TouchIn.on ? 'On foot · CAR to get back in · PUNCH to fight' : 'On foot · F car · Q punch', 'info');
};
Foot.board = function (silent) {
  if (!Foot.on) return; if (Talk.on) Talk.close(true);
  Fight.reset(); Foot.on = false; Foot.state = 'walk'; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  Cam.chaseYaw = car.yaw; Cam.ch = car.y + 2; Cam.lookYaw = Cam.lookPitch = 0; Cam.fov = save.set.fov; Foot.fovAdd = 0;
  if (car.wrecked <= 0) car.hand = 0;
  syncPl(); UI.footMode(false); if (!silent) Snd.door();
  Fare.onBoard();
};
Foot.toCar = function () {
  const c = car, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  for (const [lx, lz] of [[-1.75, 0.2], [1.75, 0.2], [-1.75, -1.6], [1.75, -1.6], [0, -3.6]]) { const x = c.x + co * lx + s * lz, z = c.z - s * lx + co * lz; if (!footBlockedAt(x, z)) { loadAround(x, z, 8); Foot.x = x; Foot.z = z; groundAt(x, z, _fg); Foot.y = _fg.h; Foot.vx = Foot.vz = Foot.vy = 0; Foot.air = false; Foot.state = 'walk'; UI.toast('Back at the car', 'info'); return; } }
};

/* ---------- per step ---------- */
Foot.scan = function () {
  const F = Foot; F.target = null; F.carNear = F.nearCar() && car.wrecked <= 0;
  if (Talk.on || F.state !== 'walk') return;
  const fs = Math.sin(F.yaw), fc = Math.cos(F.yaw); let best = 9, bp = null;
  for (const p of Peds.list) {
    if (p.state !== 'walk' && p.state !== 'stand' && p.state !== 'wait') continue;
    const dx = p.x - F.x, dz = p.z - F.z, d = Math.hypot(dx, dz); if (d > 2.7 || d >= best) continue;
    if (!F.tp && d > 0.9 && (dx * fs + dz * fc) / d < 0.3) continue;
    best = d; bp = p;
  }
  F.target = bp;
};
Foot.knock = function (d, why) {
  const F = Foot, P = F.ped; F.state = 'down'; F.downT = 0; F.air = true; F.vy = 3.4; F.vx = (d.vx || 0) * 0.8 + (Math.random() - 0.5); F.vz = (d.vz || 0) * 0.8 + (Math.random() - 0.5);
  P.air = true; P.t = 0; P.tilt = 0; P.spin = (Math.random() < 0.5 ? -1 : 1) * 5.5; F.hitCool = 4;
  Snd.crash(9); Cam.shake = Math.max(Cam.shake, 1.2);
  Fight.t = -1; if (!devOn('god')) { const fee = Math.min(why ? 60 : 120, save.money); save.money -= fee; UI.toast((why || 'Hit by a car') + (fee ? ' · hospital ' + money(fee) : ''), 'bad'); } else UI.toast(why || 'Hit by a car', 'bad');
};
Foot.step = function (dt) {
  const F = Foot, P = F.ped; if (!F.on) return;
  F.t += dt; F.hitCool -= dt; Fight.update(dt);
  const frozen = Talk.on || GAR.edit || App.mode !== 'play' || Police.hold || Jack.busy, I = frozen ? { f: 0, r: 0, turn: 0, run: false, jump: false, lx: 0, ly: 0 } : footInput();
  /* look */
  if (I.turn) F.yaw += I.turn * 2.2 * dt; if (I.lx) F.yaw -= I.lx * 2.6 * dt; if (I.ly) F.pitch = clamp(F.pitch - I.ly * 1.8 * dt, -1.35, 1.2);
  F.yaw = ((F.yaw + Math.PI) % TAU + TAU) % TAU - Math.PI;
  /* knocked down: ragdoll-lite, then get up */
  if (F.state === 'down' || F.state === 'rise') {
    F.downT += dt; P.t = F.downT;
    if (F.state === 'down') {
      if (P.air) { F.x += F.vx * dt; F.z += F.vz * dt; F.y += F.vy * dt; F.vy -= 9.8 * dt; P.tilt += P.spin * dt; footResolve(); groundAt(F.x, F.z, _fg); if (F.vy < 0 && F.y <= _fg.h + 0.12) { P.air = false; F.y = _fg.h + 0.12; F.vx *= 0.5; F.vz *= 0.5; P.lieT = P.tilt < 0 ? -1.5 : 1.5; P.tilt = P.lieT + Math.round((P.tilt - P.lieT) / TAU) * TAU; } }
      else { const k = Math.exp(-3.2 * dt); F.vx *= k; F.vz *= k; F.x += F.vx * dt; F.z += F.vz * dt; footResolve(); P.tilt += (P.lieT - P.tilt) * Math.min(1, dt * 9); if (F.downT > 3.2) { F.state = 'rise'; F.downT = 0; P.t = 0; } }
    } else {
      P.tilt += (0 - P.tilt) * Math.min(1, dt * 4.5); groundAt(F.x, F.z, _fg); F.y += (_fg.h - F.y) * Math.min(1, dt * 6);
      if (F.downT > 0.9) { F.state = 'walk'; P.tilt = 0; F.air = false; F.vx = F.vz = 0; }
    }
    F.speed = 0; Foot.sync(dt, 0); return;
  }
  /* walking */
  const s = Math.sin(F.yaw), c = Math.cos(F.yaw);
  let mx = s * I.f - c * I.r, mz = c * I.f + s * I.r; const ml = Math.hypot(mx, mz); if (ml > 1) { mx /= ml; mz /= ml; }
  const run = I.run && I.f > -0.2 && ml > 0.1, vmax = (run ? 5.6 : 2.4) * (I.f < -0.3 && !I.r ? 0.6 : 1);
  const acc = F.air ? 1.6 : 10; F.vx += (mx * vmax - F.vx) * Math.min(1, dt * acc); F.vz += (mz * vmax - F.vz) * Math.min(1, dt * acc);
  const sp = Math.hypot(F.vx, F.vz), dist = sp * dt, n = Math.max(1, Math.ceil(dist / 0.22)), hx = F.vx * dt / n, hz = F.vz * dt / n;
  for (let i = 0; i < n; i++) {
    let nx = F.x + hx; groundAt(nx, F.z, _fg); if (!_fg.water && (F.air || _fg.h - F.y < 0.7)) F.x = nx; else F.vx *= 0.3;
    let nz = F.z + hz; groundAt(F.x, nz, _fg); if (!_fg.water && (F.air || _fg.h - F.y < 0.7)) F.z = nz; else F.vz *= 0.3;
    footResolve();
  }
  /* vertical */
  groundAt(F.x, F.z, _fg); const gh = F.supp > _fg.h ? F.supp : _fg.h, onRoad = _fg.road;
  if (!F.air) {
    if (I.jump && !frozen) { F.vy = 4.7; F.air = true; Snd.foot(onRoad, 1.6, true); }
    else if (gh < F.y - 0.5) { F.air = true; F.vy = 0; }
    else { F.y += (gh - F.y) * Math.min(1, dt * 18); }
  }
  if (F.air) {
    F.vy -= 15 * dt; F.y += F.vy * dt;
    if (F.vy <= 0 && F.y <= gh) { F.y = gh; F.air = false; const imp = -F.vy; F.dip = Math.min(0.22, 0.04 + imp * 0.02); F.vy = 0; if (imp > 2.5) Snd.foot(onRoad, 1.5 + imp * 0.1, true); }
  }
  F.dip *= Math.max(0, 1 - dt * 7);
  F.speed = sp;
  /* footsteps + gait */
  if (!F.air && sp > 0.5) { F.stepD += sp * dt; const L = run ? 1.55 : 1.05; if (F.stepD > L) { F.stepD -= L; Snd.foot(onRoad, run ? 1.25 : 0.85, false, gh); } }
  /* knocked over by traffic */
  if (F.hitCool <= 0 && !Talk.on) for (const d of Dyn.list) {
    const dx = F.x - d.x, dz = F.z - d.z; if (dx * dx + dz * dz > 22 || d.v < 2.5) continue; const ds = Math.sin(d.yaw), dc = Math.cos(d.yaw);
    let hit = false; for (let k = 0; k < 3; k++) { const qx = d.x + ds * _cs[k], qz = d.z + dc * _cs[k], ex = F.x - qx, ez = F.z - qz; if (ex * ex + ez * ez < 1.9 * 1.9 && Math.abs(F.y - d.y) < 1.6) hit = true; }
    if (hit) { F.knock(d); break; }
  }
  Foot.sync(dt, sp);
};
/* keep the visible body (pedestrian-rig) in step with the walker */
Foot.sync = function (dt, sp) {
  const F = Foot, P = F.ped, I = _fi;
  P.x = F.x; P.z = F.z; P.y = F.y + 0.04; P.pn = Fight.t >= 0 ? clamp(Fight.t / FIGHT_T, 0.001, 0.999) : 0; P.hand = Fight.hand;
  if (F.state === 'walk') {
    if (F.tp && Fight.t >= 0) F.body += angDiff(F.body, F.yaw) * Math.min(1, dt * 16);
    else if (F.tp && sp > 0.3) F.body += angDiff(F.body, Math.atan2(F.vx, F.vz)) * Math.min(1, dt * 11); else if (!F.tp) F.body = F.yaw;
    else if (F.tp && Talk.on) F.body += angDiff(F.body, F.yaw) * Math.min(1, dt * 6);
    P.yaw = F.body; P.v += (sp - P.v) * Math.min(1, dt * 10);
    P.ph += TAU * P.v / pedCyc(P.v, P.app) * dt;
    P.jump = F.air; P.state = sp > 0.25 ? 'walk' : 'stand'; if (P.wave > 0) P.wave -= dt;
  } else { P.yaw = F.body; P.state = F.state; P.jump = false; }
  if (P.state === 'stand' && !P.wave) P.phone = false;
};
Foot.wave = function () { Foot.ped.wave = 2.2; };

/* ---------- camera ---------- */
const _fc = new THREE.Vector3();
Foot.camera = function (dt) {
  const F = Foot; if (!F.on || devOn('free')) return;
  const sh = save.set.shake ? Cam.shake : 0, bobA = F.air ? 0 : Math.min(1, F.speed / 5) * (F.speed > 3.6 ? 0.055 : 0.03);
  F.bobPh += F.speed * dt * (F.speed > 3.6 ? 2.3 : 3.2); const bob = Math.sin(F.bobPh * 2) * bobA * 0.6, sway = Math.cos(F.bobPh) * bobA * 0.3;
  const ps = F.ped; let eye = F.y + (F.state === 'walk' ? 1.64 : 0.5) - F.dip + bob;
  if (F.state === 'down' || F.state === 'rise') eye = F.y + 0.35 + (F.state === 'rise' ? Math.min(1.2, F.downT * 1.4) : 0);
  const talkLook = Talk.on && Talk.p ? Math.atan2(Talk.p.x - F.x, Talk.p.z - F.z) : null;
  if (talkLook !== null) { F.yaw += angDiff(F.yaw, talkLook) * Math.min(1, dt * 4); F.pitch += (0.02 - F.pitch) * Math.min(1, dt * 4); }
  F.fovAdd += (((F.speed > 3.6 ? 7 : 0) + (Talk.on ? -9 : 0)) - F.fovAdd) * Math.min(1, dt * 5);
  Cockpit.group.visible = false; car.ext.visible = true;
  if (!F.tp) {
    camera.position.set(F.x + Math.sin(F.yaw) * 0.1 + (Math.random() - 0.5) * sh * 0.04, eye + (Math.random() - 0.5) * sh * 0.04, F.z + Math.cos(F.yaw) * 0.1 + (Math.random() - 0.5) * sh * 0.04);
    camera.rotation.set(F.pitch, F.yaw + Math.PI, sway * 0.4, 'YXZ');
  } else {
    const tk = Talk.on && Talk.p; F.talkOff = (F.talkOff || 0) + ((tk ? 1 : 0) - (F.talkOff || 0)) * Math.min(1, dt * 3);
    if (tk) { F.tkx = (Talk.p.x - F.x) * 0.42; F.tkz = (Talk.p.z - F.z) * 0.42; }
    const to = F.talkOff, vy = F.yaw + to * 0.95, tx = F.x + (F.tkx || 0) * to, ty = F.y + 1.45, tz = F.z + (F.tkz || 0) * to, cp = Math.cos(F.pitch), fx = Math.sin(vy) * cp, fy = Math.sin(F.pitch), fz = Math.cos(vy) * cp;
    let want = Cam.dist * 0.55 - 0.9 * to, dmax = want;
    for (let t = 0.6; t <= want; t += 0.4) { const x = tx - fx * t, z = tz - fz * t; if (footBlockedAt(x, z) && Math.abs(terrainHeight(x, z) - F.y) < 3.5) { dmax = Math.max(0.5, t - 0.5); break; } }
    F.camD += (dmax - F.camD) * Math.min(1, dt * (dmax < F.camD ? 14 : 3));
    const px = tx - fx * F.camD, pz = tz - fz * F.camD, py = Math.max(ty - fy * F.camD + 0.25, Math.max(terrainHeight(px, pz), 0.2) + 0.5);
    camera.position.set(px + (Math.random() - 0.5) * sh * 0.03, py + (Math.random() - 0.5) * sh * 0.03, pz + (Math.random() - 0.5) * sh * 0.03);
    camera.lookAt(tx, ty + 0.1 - (F.state === 'walk' ? 0 : 0.7), tz);
  }
  Fight.viewUpdate();
};

/* ---------- mouse look, optional pointer lock ---------- */
Foot.look = function (dx, dy) { Foot.yaw -= dx * 0.0042; Foot.pitch = clamp(Foot.pitch - dy * 0.0038, -1.35, 1.2); };
