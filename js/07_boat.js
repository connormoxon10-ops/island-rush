/* ================= BOATING =================
   Four boats sit in the marina's slips with FOR SALE signs (the three unsold ones are decoration). Walk up to one and press F: the first time
   that buys it, after that it just takes you aboard. A boat is a planar rigid body on the sea (surge u, sway v, yaw rate r) with a thrust curve,
   quadratic hull drag, a prop-wash steering term (so a jet ski turns badly with the throttle shut), side slip that decays at the hull's own rate,
   and a hull outline checked against the sea bed, the pier decks and the other boats. The sea itself is flat in the renderer, so bobbing, pitch and
   roll are faked from a small sum of travelling sines, plus a planing hump, acceleration squat and lean into / out of turns.
   Units are metres and seconds; models face +Z, the left side is +X. Yaw 0 points to +z; steering left raises yaw. */
const BEXTRA = {
  tern: { lean: 0.9, fee: 40, thrUp: 2.4, thrDn: 3.2 },
  surge: { lean: -2.2, fee: 90, thrUp: 4.2, thrDn: 5 },
  marlin: { lean: 0.6, fee: 160, thrUp: 2.6, thrDn: 3.4 },
  odyssey: { lean: 1.0, fee: 300, thrUp: 1.5, thrDn: 2.2 }
};
const BLIM = 3320;
const Boat = { on: false, bill: 0, mechT: 0, p: null, boats: [], all: [], near: null, view: 1, zoom: 1, inited: false, cyaw: 0, focus: { x: 0, y: 0, z: 0 }, hudT: 0, warn: '', canExit: false, snapCam: true, tipT: 0, valetT: 0, trail: [], tm: 0, wakeMesh: null, foam: null, lastDrop: null };
const _bY = new THREE.Vector3(0, 1, 0), _bq1 = new THREE.Quaternion(), _bq2 = new THREE.Quaternion(), _bl1 = new THREE.Vector3(), _be1 = new THREE.Euler();
const _bIn = { st: 0, th: 0, br: 0, hand: 0, boost: false, analog: false }, _bz = { st: 0, th: 0, br: 1, hand: 1, boost: false, analog: false }, _bgr = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false }, _bsp = { x: 0, z: 0, yaw: 0 };
const _bcm = { p: new THREE.Vector3(), t: new THREE.Vector3() };

/* ---------- the sea surface used for bobbing (the rendered sea is flat) ---------- */
Boat.wave = function (x, z, t) {
  return 0.11 * Math.sin(0.42 * x + 0.31 * z + 1.3 * t) + 0.07 * Math.sin(-0.27 * x + 0.5 * z + 1.9 * t + 1.7) + 0.035 * Math.sin(0.9 * x - 0.6 * z + 2.7 * t);
};
Boat.owned = function (id) { return !!(save.boat && save.boat.own[id]); };

/* ---------- setup ---------- */
Boat.init = function () {
  if (!Dock.s || Boat.inited) return; Boat.inited = true; boatInit();
  for (const id of BIDS) {
    const S = BSPEC[id]; Object.assign(S, BEXTRA[id]);
    const L = S.L, B = S.B;   /* hull outline sampled for collision: bow, bow quarters, beam, quarters, transom */
    S.pts = [[0, L * 0.5 - 0.1], [B * 0.3, L * 0.3], [-B * 0.3, L * 0.3], [B * 0.5 - 0.05, 0], [-B * 0.5 + 0.05, 0], [B * 0.42, -L * 0.5 + 0.1], [-B * 0.42, -L * 0.5 + 0.1], [0, -L * 0.5]];
  }
  for (const id of BIDS) Boat.make(id, 0, BSPEC[id].slip, false);
  Boat.make('tern', 1, 4, true); Boat.make('marlin', 1, 5, true); Boat.make('surge', 1, 7, true);
  Boat.buildWake();
};
Boat.make = function (id, hue, slip, decor) {
  const o = Boats.create(id, hue), S = o.spec; Dock.slipPos(slip, S.L, _bsp);
  const P = { id, spec: S, holder: o.holder, model: o.model, parts: o.parts, hue, decor, slip, home: { x: _bsp.x, z: _bsp.z, yaw: _bsp.yaw }, x: _bsp.x, z: _bsp.z, y: 0, yaw: _bsp.yaw, vx: 0, vz: 0, r: 0, steer: 0, thr: 0, br: 0, rpm: 0.18, speed: 0, u: 0, uPrev: 0, acc: 0, pitch: 0, roll: 0, dynP: 0, dynR: 0, rise: 0, tag: null, st: 'parked', skip: null, hdg: 0, depth: 4, sy: 0, cy: 1, strikeCool: 0, ph: Math.random() * 6.28 };
  P.sy = Math.sin(P.yaw); P.cy = Math.cos(P.yaw);
  scene.add(o.holder); Boat.all.push(P); if (!decor) { Boat.boats.push(P); Boat.tagFor(P); }
  Boat.attitude(P, 1, 0); return P;
};
Boat.tagFor = function (P) {
  if (P.tag) { P.holder.remove(P.tag); P.tag.material.map.dispose(); P.tag.material.dispose(); P.tag = null; }
  if (Boat.owned(P.id)) return;
  const c = mkCanvas(384, 96), g = c.getContext('2d'); g.fillStyle = 'rgba(8,12,18,0.82)'; g.fillRect(0, 0, 384, 96); g.fillStyle = '#2aa8d6'; g.fillRect(0, 0, 8, 96);
  g.textBaseline = 'middle'; g.fillStyle = '#fff'; const ttl = P.spec.name.toUpperCase() + ' · ' + P.spec.role; let fs = 40; g.font = '700 ' + fs + 'px Rajdhani, Arial, sans-serif'; while (fs > 22 && g.measureText(ttl).width > 348) { fs -= 2; g.font = '700 ' + fs + 'px Rajdhani, Arial, sans-serif'; }
  g.fillText(ttl, 22, 32); g.fillStyle = '#4be08a'; g.font = '700 38px Rajdhani, Arial, sans-serif'; g.fillText('FOR SALE  ' + money(P.spec.cost), 22, 70);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: true }));
  const k = clamp(P.spec.L / 6.6, 0.8, 1.2); sp.scale.set(6.2 * k, 1.55 * k, 1); sp.position.set(0, P.spec.tag, 0); P.holder.add(sp); P.tag = sp;
};
Boat.tags = function () { for (const P of Boat.boats) Boat.tagFor(P); };

/* ---------- attitude: waves + planing + lean, applied to the model ---------- */
Boat.attitude = function (P, dt, t) {
  const S = P.spec, sy = P.sy = Math.sin(P.yaw), cy = P.cy = Math.cos(P.yaw), hl = S.L * 0.35, hb = S.B * 0.5, ws = clamp(1.6 - S.L * 0.1, 0.55, 1.4), tt = t + P.ph;
  const wc = Boat.wave(P.x, P.z, tt), wf = Boat.wave(P.x + sy * hl, P.z + cy * hl, tt), wb = Boat.wave(P.x - sy * hl, P.z - cy * hl, tt), wl = Boat.wave(P.x + cy * hb, P.z - sy * hb, tt), wr = Boat.wave(P.x - cy * hb, P.z + sy * hb, tt);
  const tp = Math.atan2(wf - wb, hl * 2) * ws + P.dynP, tr = Math.atan2(wl - wr, hb * 2) * ws * 1.4 + P.dynR, ty = wc * ws * 0.9 + P.rise - S.draft * 0.0, k = Math.min(1, dt * 7);
  P.pitch += (tp - P.pitch) * k; P.roll += (tr - P.roll) * k; P.y += (ty - P.y) * k;
  P.holder.position.set(P.x, P.y, P.z); P.holder.rotation.set(-P.pitch, P.yaw, P.roll, 'YXZ');
};

/* ---------- boarding and leaving ---------- */
Boat.scan = function (dt) {
  Boat.near = null; if (!Boat.inited) return;
  if (Foot.on && !Talk.on && !Boat.on) {
    let best = 3.6;
    for (const P of Boat.boats) {
      if (P.st !== 'parked') continue; const dx = Foot.x - P.x, dz = Foot.z - P.z; if (dx * dx + dz * dz > 400) continue;
      const lz = dx * P.sy + dz * P.cy, lx = dx * P.cy - dz * P.sy, ex = Math.max(0, Math.abs(lx) - (P.spec.B * 0.5 + 0.8)), ez = Math.max(0, Math.abs(lz) - (P.spec.L * 0.5 + 0.8)), d = Math.hypot(ex, ez);
      if (d < best) { best = d; Boat.near = P; }
    }
  }
  /* the dock hand: a boat left far from its slip goes home once you are back at the marina and well away from it */
  Boat.valetT = Boat.valetT || 0;
  if (!Boat.on && dt) {
    let any = null;
    for (const P of Boat.boats) if (P.st === 'parked' && Boat.owned(P.id) && Math.hypot(P.x - P.home.x, P.z - P.home.z) > 25 && Math.hypot(Pl.x - P.x, Pl.z - P.z) > 45) any = P;
    if (any && Dock.dist(Pl.x, Pl.z) < 75) { Boat.valetT += dt; if (Boat.valetT > 3) { Boat.valetT = 0; Boat.home(any); UI.toast('A dock hand brought the ' + any.spec.name + ' back to its slip', 'info'); } } else Boat.valetT = 0;
  }
};
Boat.gate = function () { if (Mi) return 'Finish or abandon the run first'; if (Fare.phase !== 'idle') return 'You have a taxi fare waiting'; if (Wanted.stars > 0) return 'The police are after you. Lose them first'; return ''; };
Boat.useNear = function () {
  const P = Boat.near; if (!P) return; const gt = Boat.gate(); if (gt) { UI.toast(gt, 'bad'); return; }
  if (!Boat.owned(P.id) && P.id === 'tern' && VM.armed && VMK[VM.armed.kind].veh === 'boat') UI.toast('Borrowing the Tern for the run', 'info');
  else if (!Boat.owned(P.id)) {
    if (save.money < P.spec.cost) { UI.toast('You need ' + money(P.spec.cost) + ' to buy the ' + P.spec.name, 'bad'); return; }
    save.money -= P.spec.cost; save.boat.own[P.id] = true; writeSave(); Boat.tags(); UI.toast('Bought the ' + P.spec.name + ' · ' + money(P.spec.cost), 'good'); Snd.win();
  }
  Boat.board(P);
};
Boat.board = function (P) {
  if (!Foot.on || Boat.on || Fly.on) return; const gt = Boat.gate(); if (gt) { UI.toast(gt, 'bad'); return; }
  if (Talk.on) Talk.close(true); Fight.reset(); Foot.on = false; Foot.state = 'walk'; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  Boat.on = true; Boat.p = P; P.st = 'driving'; P.thr = P.br = P.steer = P.r = 0; P.vx = P.vz = 0; P.rpm = 0.18; P.strikeCool = 0; if (P.tag) P.tag.visible = false;
  Boat.skipperOn(P); Boat.trail.length = 0;
  Boat.view = save.boat.view; Cam.lookYaw = Cam.lookPitch = 0; Boat.zoom = 1; Boat.snapCam = true; Boat.warn = ''; Boat.tipT = 0; Boat.tipShown = false;
  Foot.parkCar(car); syncPl(); UI.footMode(false); UI.boatMode(true); Snd.door();
  UI.toast(TouchIn.on ? 'GAS to move off · EXIT to get out' : 'W gas · S brake and reverse · A D steer · Space anchor · C camera', 'info');
  VM.onBoard('boat');
};
Boat.skipperOn = function (P) {
  Boat.skipperOff(P); const app = footApp(); P.skip = boatSkipper(app, P.parts.skip); P.model.add(P.skip);
};
Boat.skipperOff = function (P) {
  if (!P.skip) return; P.model.remove(P.skip); P.skip.traverse((m) => { if (m.isMesh) m.geometry.dispose(); }); P.skip = null;
};
/* where to put your feet when you step off: the nearest walkable spot on a ring around the hull */
Boat.dropPoint = function (P, out) {
  const S = P.spec; let best = 1e9, ok = false;
  for (const rad of [1.1, 2.0, 3.2, 4.6, 6.4]) {
    for (let k = 0; k < 20; k++) {
      const a = k / 20 * TAU, lx = Math.cos(a) * (S.B * 0.5 + rad), lz = Math.sin(a) * (S.L * 0.5 + rad), x = P.x + lx * P.cy + lz * P.sy, z = P.z - lx * P.sy + lz * P.cy;
      if (footBlockedAt(x, z)) continue; const d = Math.hypot(lx, lz) + Math.abs(lx) * 0.2; if (d < best) { best = d; out.x = x; out.z = z; ok = true; }
    }
    if (ok) return true;
  }
  return false;
};
Boat.dropFoot = function (P, pos) {
  if (!Foot.ped) Foot.ped = footNewPed(); Foot.ped.app = footApp();
  Foot.on = true; Foot.x = pos.x; Foot.z = pos.z; groundAt(pos.x, pos.z, _bgr); Foot.y = _bgr.h; Foot.vx = Foot.vz = Foot.vy = 0; Foot.air = false; Foot.state = 'walk'; Foot.speed = 0; Foot.dip = 0; Foot.hitCool = 1;
  Foot.yaw = Foot.body = Math.atan2(P.x - pos.x, P.z - pos.z); Foot.pitch = 0; Foot.camD = 3.4; Foot.prevView = Cam.view; Foot.tp = Cam.view === 2; Cam.lookYaw = Cam.lookPitch = 0;
};
Boat.exit = function () {
  const P = Boat.p; if (!Boat.on || !P || P.st !== 'driving') return;
  if (P.speed > 3.5) { UI.toast('Slow down before getting out', 'bad'); return; }
  if (!Boat.dropPoint(P, _bsp)) { UI.toast('Nowhere to get out here · head for the dock or the shore', 'bad'); return; }
  Boat.leave(P); Boat.dropFoot(P, _bsp); syncPl(); UI.boatMode(false); UI.footMode(true); Snd.door(); writeSave();
  UI.toast('On foot · F to climb back aboard', 'info');
};
Boat.callYard = function (P) {
  const b = Boat.bill; Boat.bill = 0; Boat.mechT = 0;
  Mech.offer('boat', b, () => { P.vx = P.vz = 0; P.speed = 0; P.u = 0; P.thr = P.br = 0; Boat.snapCam = true; }, { name: P.spec.name });
};
/* climbing out with the bill unsettled: the yard charges the flat rate */
Boat.settleBill = function () { if (!(Boat.bill > 0)) return; const f = Math.min(save.money, Boat.bill); Boat.bill = 0; Boat.mechT = 0; if (f > 0) { save.money -= f; writeSave(); UI.toast('Boatyard bill ' + money(f), 'info'); } };
Boat.leave = function (P) {
  Boat.settleBill();
  if (VM.m) VM.abort('Run abandoned');
  Boat.on = false; P.st = 'parked'; P.vx = P.vz = 0; P.thr = P.br = P.r = P.steer = 0; P.speed = 0; P.u = 0; P.dynP = P.dynR = P.rise = 0; if (P.tag) P.tag.visible = !Boat.owned(P.id); P.holder.visible = true;
  Boat.skipperOff(P); camera.up.set(0, 1, 0); Cam.fov = save.set.fov; camera.fov = save.set.fov; camera.updateProjectionMatrix(); Boat.trail.length = 0; Boat.hideWake();
};
Boat.home = function (P) {
  const H = P.home; P.x = H.x; P.z = H.z; P.yaw = H.yaw; P.vx = P.vz = 0; P.r = 0; P.thr = P.br = 0; P.speed = 0; P.u = 0; P.dynP = P.dynR = P.rise = 0; P.st = Boat.on && Boat.p === P ? 'driving' : 'parked'; P.holder.visible = true; if (P.tag) P.tag.visible = !Boat.owned(P.id) && P.st === 'parked'; Boat.attitude(P, 1, App.time); Boat.trail.length = 0;
};
/* abort (teleport, respawn): the boat goes back to its slip and you are out of it */
Boat.end = function () { const P = Boat.p; if (!Boat.on || !P) return; Boat.leave(P); Boat.home(P); UI.boatMode(false); UI.footMode(false); };
Boat.reset = function () {
  const P = Boat.p; if (!Boat.on || !P) return; if (VM.m) VM.abort('Run abandoned'); Boat.home(P); P.st = 'driving'; Boat.snapCam = true; UI.toast('Back at the slip', 'info');
};
Boat.cycle = function () { Boat.view = (Boat.view + 1) % 3; save.boat.view = Boat.view; Boat.snapCam = true; UI.toast(['Helm', 'Chase', 'Far chase'][Boat.view] + ' view', 'info'); };

/* ---------- input ---------- */
Boat.input = function (dt) {
  const K = Keys, T = TouchIn, I = _bIn;
  let st = ((K.KeyA || K.ArrowLeft) ? 1 : 0) - ((K.KeyD || K.ArrowRight) ? 1 : 0) + T.l - T.r, th = (K.KeyW || K.ArrowUp) ? 1 : 0, br = (K.KeyS || K.ArrowDown) ? 1 : 0, hand = K.Space ? 1 : 0, boost = !!(K.ShiftLeft || K.ShiftRight), analog = false;
  th = Math.max(th, T.gas); br = Math.max(br, T.brk); hand = Math.max(hand, T.hand); boost = boost || !!T.nit;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { pads = null; }
  if (pads) for (const p of pads) if (p && p.connected) {
    const bv = (i) => (p.buttons[i] ? p.buttons[i].value || (p.buttons[i].pressed ? 1 : 0) : 0), ax = Math.abs(p.axes[0]) > 0.1 ? p.axes[0] : 0;
    if (ax) { st = -ax; analog = true; } th = Math.max(th, bv(7)); br = Math.max(br, bv(6)); hand = Math.max(hand, bv(0)); boost = boost || bv(1) > 0.5 || bv(5) > 0.5;
    for (const [i, code] of [[3, 'KeyC'], [9, 'Escape'], [8, 'KeyM'], [12, 'KeyF'], [2, 'KeyR']]) { const on = bv(i) > 0.5; if (on && !padPrev[i]) onKey(code); padPrev[i] = on; } break;
  }
  I.st = clamp(st, -1, 1); I.th = clamp(th, 0, 1); I.br = clamp(br, 0, 1); I.hand = hand; I.boost = boost; I.analog = analog; return I;
};

/* ---------- collision: the hull outline against sea bed, decks, rocks and the other boats ---------- */
Boat.blocked = function (P, x, z, yaw) {
  const S = P.spec, sy = Math.sin(yaw), cy = Math.cos(yaw), pts = S.pts, lim = S.draft + 0.12, dock = !!Dock.s;
  for (let i = 0; i < pts.length; i++) {
    const lx = pts[i][0], lz = pts[i][1], px = x + lx * cy + lz * sy, pz = z - lx * sy + lz * cy;
    if (px * px + pz * pz > BLIM * BLIM) return 1;
    const th = terrainHeight(px, pz); if (th > -lim) return 2;
    if (dock && Dock.deck(px, pz, 0.25)) return 3;
    if (th > -9 && solidHit(px, 0.4, pz, 0.1)) return 4;
    for (let j = 0; j < Boat.all.length; j++) {
      const O = Boat.all[j]; if (O === P || O.st === 'driving') continue; const dx = px - O.x, dz = pz - O.z; if (dx * dx + dz * dz > 100) continue;
      const ox = dx * O.cy - dz * O.sy, oz = dx * O.sy + dz * O.cy, a = ox / (O.spec.B * 0.5 + 0.15), b = oz / (O.spec.L * 0.5 + 0.15); if (a * a + b * b < 1) return 5;
    }
  }
  return 0;
};

/* ---------- physics sub-step ---------- */
Boat.sub = function (P, h, I) {
  const S = P.spec, Vm = S.Vmax, boost = I.boost && S.boost, acc = S.acc * (boost ? 1.45 : 1), Vl = Vm * 1.2 * (boost ? 1.14 : 1), kq = (0.3056 * S.acc - 0.02 * Vm) / (Vm * Vm);
  /* turn first, so the velocity left over from the old heading becomes side slip in the new one */
  let sp0 = Math.abs(P.u), dir = P.u < -0.3 ? -1 : 1, lowF = 1 - clamp(sp0 / 3.2, 0, 1), g = clamp(sp0 / 3.2, 0, 1) / (1 + Math.pow(sp0 / (1.1 * Vm), 2)) + (P.thr > P.br ? P.thr : P.br * 0.4) * 0.5 * lowF;
  const rt = P.steer * S.yawMax * g * dir * (I.hand ? 0.6 : 1); P.r += (rt - P.r) * (1 - Math.exp(-S.kr * h));
  const yawN = P.yaw + P.r * h; if (!Boat.blocked(P, P.x, P.z, yawN) || Boat.blocked(P, P.x, P.z, P.yaw)) P.yaw = yawN; else P.r *= -0.15;
  const sy = Math.sin(P.yaw), cy = Math.cos(P.yaw); let u = P.vx * sy + P.vz * cy, w = P.vx * cy - P.vz * sy, a = 0;
  if (P.thr > 0.001) a += acc * P.thr * Math.max(0, 1 - Math.pow(u / Vl, 2));
  if (P.br > 0.02) { if (u > 1.0) a -= (2.4 + 0.55 * S.acc) * P.br; else a -= S.acc * S.rev * P.br * Math.max(0, 1 - Math.pow(Math.max(0, -u) / (0.3 * Vm), 2)); }
  a -= kq * u * Math.abs(u) + 0.02 * u; if (P.thr < 0.05 && P.br < 0.05) a -= 0.07 * u;
  if (I.hand) { a -= 0.9 * u + 0.015 * u * Math.abs(u); w *= Math.exp(-3 * h); }
  u += a * h; if (P.thr < 0.05 && P.br < 0.05 && Math.abs(u) < 0.04) u = 0;
  w *= Math.exp(-(S.kLat + 0.12 * Math.abs(w)) * h);
  P.vx = u * sy + w * cy; P.vz = u * cy - w * sy; P.u = u;
  /* move, sliding along whatever is in the way */
  let nx = P.x + P.vx * h, nz = P.z + P.vz * h;
  if (Boat.blocked(P, nx, P.z, P.yaw)) { P.hitV = Math.max(P.hitV, Math.abs(P.vx)); P.vx *= -0.2; P.vz *= Math.exp(-1.6 * h); nx = P.x; }
  if (Boat.blocked(P, nx, nz, P.yaw)) { P.hitV = Math.max(P.hitV, Math.abs(P.vz)); P.vz *= -0.2; P.vx *= Math.exp(-1.6 * h); nz = P.z; }
  P.x = nx; P.z = nz;
};
/* nudge a boat out of anything it is somehow already inside (a teleport, a rotation at the quay) */
Boat.unstick = function (P) {
  if (!Boat.blocked(P, P.x, P.z, P.yaw)) return;
  for (let r = 0.6; r < 7; r += 0.6) for (let k = 0; k < 12; k++) { const a = k / 12 * TAU, x = P.x + Math.cos(a) * r, z = P.z + Math.sin(a) * r; if (!Boat.blocked(P, x, z, P.yaw)) { P.x = x; P.z = z; P.vx = P.vz = 0; return; } }
};
Boat.strike = function (P, v) {
  Cam.shake = Math.max(Cam.shake, Math.min(3, v * 0.22)); if (v > 3) Snd.crash(Math.min(30, v * 1.6)); else Snd.clank();
  for (let i = 0; i < Math.min(14, 4 + v); i++) emit(Part.smoke, P.x + (Math.random() - 0.5) * P.spec.B, 0.2, P.z + (Math.random() - 0.5) * P.spec.L * 0.4, (Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3, 0.8 + Math.random() * 0.5, 0.6, 2.2, 0.92, 0.96, 1, 0.55, 5);
  if (v > 7 && P.strikeCool <= 0) {
    P.strikeCool = 3; const raw = devOn('god') ? 0 : Math.round(clamp(v - 6, 0, 20) * P.spec.fee * 0.15);
    if (v >= 11 && raw > 0 && !VM.m && !Mi && !Race.on) {   /* a hard hit holes the hull: the yard crew comes out and the mechanic offer follows */
      Boat.bill = raw; Boat.mechT = 1.8; UI.banner('HULL BREACHED', 'The boatyard crew is on its way'); Boat.warn = 'HULL BREACHED'; Boat.warnT = 2;
    } else {
      const fee = Math.min(save.money, raw);
      if (fee > 0) { save.money -= fee; writeSave(); } UI.banner('HULL STRIKE', fee ? 'Repairs ' + money(fee) : 'No damage'); Boat.warn = 'HULL STRIKE'; Boat.warnT = 1.4;
    }
  }
};

/* ---------- per-frame step ---------- */
Boat.step = function (dt) {
  const P = Boat.p; if (!Boat.on || !P) return;
  if (Boat.bill > 0) { Boat.mechT -= dt; if (Boat.mechT <= 0 && App.mode === 'play') Boat.callYard(P); }
  const S = P.spec, frozen = App.mode !== 'play' || devOn('free') || Police.hold || Boat.bill > 0, I = frozen ? _bz : Boat.input(dt);
  const rate = I.analog || TouchIn.l || TouchIn.r ? 5 : lerp(3.6, 2.0, clamp(P.speed / 20, 0, 1)) * (I.st === 0 ? 1.5 : 1);
  P.steer = approach(P.steer, I.st, rate * dt); P.thr = approach(P.thr, I.th, (I.th > P.thr ? S.thrUp : S.thrDn) * dt); P.br = approach(P.br, I.br, 6 * dt);
  P.rpm += ((0.18 + 0.62 * P.thr + 0.2 * clamp(P.speed / S.Vmax, 0, 1) + (I.boost && S.boost ? 0.12 : 0)) - P.rpm) * Math.min(1, dt * 3);
  P.boost = I.boost && S.boost && P.thr > 0.5;
  const n = Math.min(8, Math.ceil(dt / 0.02)), h = dt / n; P.hitV = 0; P.strikeCool -= dt;
  for (let i = 0; i < n; i++) Boat.sub(P, h, I);
  Boat.unstick(P);
  P.speed = Math.hypot(P.vx, P.vz); P.hdg = Air.hdg(P.yaw);
  if (P.hitV > 1.5) Boat.strike(P, P.hitV);
  /* attitude targets: planing hump, squat under acceleration, lean in turns, a little rise at speed */
  const f = P.speed / (0.5 * S.Vmax), hump = S.hump * (f < 1 ? Math.sin(f * Math.PI / 2) : 0.35 + 0.65 * Math.exp(-(f - 1) * 2.2));
  P.acc += ((P.u - P.uPrev) / Math.max(dt, 1e-3) - P.acc) * Math.min(1, dt * 4); P.uPrev = P.u;
  P.dynP = hump + clamp(P.acc * 0.012, -0.05, 0.08); P.dynR = clamp(S.lean * P.r * P.u * 0.02, -0.55, 0.55); P.rise = S.hump * 0.9 * clamp(P.speed / S.Vmax, 0, 1.2);
  P.depth = -terrainHeight(P.x, P.z);
  if (P.speed > 2) save.boat.hrs += dt / 3600;
  Boat.canExit = P.speed < 3.5;
  let w = ''; if (Boat.warnT > 0) { Boat.warnT -= dt; w = Boat.warn; } else if (P.speed > 4 && P.depth < S.draft + 1.3) w = 'SHALLOWS'; else if (Math.hypot(P.x, P.z) > BLIM - 90) w = 'OPEN SEA ENDS HERE';
  if (w !== Boat.warn) Boat.warn = w;
  Boat.tipT += dt; if (Boat.tipT > 12 && !Boat.tipShown && P.speed < 1.5 && P.thr < 0.05) { Boat.tipShown = true; UI.toast(TouchIn.on ? 'GAS to go · BRAKE reverses · ANCHOR holds · EXIT to step off' : 'Shift boost (fast boats) · Space anchor · S reverses · C camera · R back to the slip', 'info'); }
  Boat.fx(dt, P); Boat.focus.x = P.x; Boat.focus.y = P.y; Boat.focus.z = P.z;
  syncPl();
};

/* ---------- wake ribbon and spray ---------- */
function boatFoamTex() {
  const W = 64, H = 128, c = mkCanvas(W, H), g = c.getContext('2d'), im = g.createImageData(W, H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = (x / (W - 1)) * 2 - 1, v = y / (H - 1), n = 0.5 + 0.5 * fbm(x * 0.21, y * 0.13, 3), e = Math.pow(Math.max(0, 1 - Math.abs(u) * 0.98), 0.8), ridge = 0.55 + 0.45 * Math.pow(Math.abs(u), 1.6);
    const a = clamp((0.25 + 0.95 * n) * e * ridge * Math.pow(1 - v, 1.35), 0, 1), i = (y * W + x) * 4; im.data[i] = 244; im.data[i + 1] = 250; im.data[i + 2] = 255; im.data[i + 3] = Math.round(a * 255);
  }
  g.putImageData(im, 0, 0); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
const BWN = 44;
Boat.buildWake = function () {
  const g = new THREE.BufferGeometry(), pos = new Float32Array(BWN * 6), uv = new Float32Array(BWN * 4), idx = [];
  for (let i = 0; i < BWN; i++) { uv[i * 4] = 0; uv[i * 4 + 2] = 1; if (i < BWN - 1) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); } }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx); g.setDrawRange(0, 0);
  const m = new THREE.MeshBasicMaterial({ map: boatFoamTex(), transparent: true, depthWrite: false, side: THREE.DoubleSide, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false; scene.add(mesh); Boat.wakeMesh = mesh;
};
Boat.hideWake = function () { if (Boat.wakeMesh) { Boat.wakeMesh.visible = false; Boat.wakeMesh.geometry.setDrawRange(0, 0); } };
Boat.updateWake = function (dt) {
  const M = Boat.wakeMesh, P = Boat.p; if (!M) return; const T = Boat.trail, now = App.time;
  if (!Boat.on || !P || P.st !== 'driving' || P.speed < 1.2) { while (T.length && now - T[0].t > 3.6) T.shift(); }
  else { const S = P.spec, sx = P.x - P.sy * S.L * 0.46, sz = P.z - P.cy * S.L * 0.46, l = T[T.length - 1]; if (!l || Math.hypot(sx - l.x, sz - l.z) > 0.9) T.push({ x: sx, z: sz, t: now, w: S.B * 0.5 * 0.9, k: clamp(P.speed / (0.45 * S.Vmax), 0.25, 1) }); while (T.length > BWN) T.shift(); while (T.length && now - T[0].t > 3.6) T.shift(); }
  if (T.length < 2) { M.visible = false; M.geometry.setDrawRange(0, 0); return; }
  const pos = M.geometry.attributes.position.array, uv = M.geometry.attributes.uv.array, n = T.length, wk = P ? P.spec.wake : 1;
  for (let i = 0; i < n; i++) {
    const j = n - 1 - i, p = T[j], a = T[Math.min(n - 1, j + 1)], b = T[Math.max(0, j - 1)], age = now - p.t, v = clamp(age / 3.6, 0, 1);
    let dx = a.x - b.x, dz = a.z - b.z; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const hw = p.w + age * (0.55 + 0.5 * wk) * p.k + 0.1; pos[i * 6] = p.x - dz * hw; pos[i * 6 + 1] = 0.07; pos[i * 6 + 2] = p.z + dx * hw; pos[i * 6 + 3] = p.x + dz * hw; pos[i * 6 + 4] = 0.07; pos[i * 6 + 5] = p.z - dx * hw;
    uv[i * 4 + 1] = v; uv[i * 4 + 3] = v;
  }
  M.geometry.attributes.position.needsUpdate = true; M.geometry.attributes.uv.needsUpdate = true; M.geometry.setDrawRange(0, (n - 1) * 6); M.visible = true;
  M.material.opacity = (0.35 + 0.5 * env.day) * clamp(P ? P.speed / (0.3 * P.spec.Vmax) : 0, 0.3, 1); M.material.color.setScalar(0.2 + 0.8 * env.day);
};
Boat.fx = function (dt, P) {
  const S = P.spec, sp = P.speed, sy = P.sy, cy = P.cy; if (sp < 3) return; const lt = 0.25 + 0.75 * env.day;
  const sprayN = sp * 2.4 * (0.5 + S.wake * 0.5);
  for (const sd of [-1, 1]) {
    if (Math.random() > dt * sprayN) continue; const lx = sd * S.B * 0.42, lz = S.L * 0.34, x = P.x + lx * cy + lz * sy, z = P.z - lx * sy + lz * cy, out = 0.7 + sp * 0.07;
    emit(Part.smoke, x, 0.18, z, sd * cy * out + P.vx * 0.35, 1.2 + sp * 0.05 + Math.random() * 0.8, -sd * sy * out + P.vz * 0.35, 0.55 + Math.random() * 0.35, 0.42 + S.wake * 0.2, 1.4 + S.wake * 0.8, 0.94 * lt, 0.97 * lt, lt, 0.5, 6);
  }
  if (P.thr > 0.35 && Math.random() < dt * (10 + sp * 1.4 * S.wake)) {
    const lx = (Math.random() - 0.5) * S.B * 0.5, lz = -S.L * 0.5 - 0.2, x = P.x + lx * cy + lz * sy, z = P.z - lx * sy + lz * cy, up = S.boost ? 2.4 + sp * 0.08 : 0.9;
    emit(Part.smoke, x, 0.12, z, -sy * (1 + sp * 0.12) + P.vx * 0.15, up + Math.random() * 0.7, -cy * (1 + sp * 0.12) + P.vz * 0.15, 0.8 + Math.random() * 0.5, 0.5 + S.wake * 0.3, 1.8 + S.wake, 0.95 * lt, 0.98 * lt, lt, 0.5, 5);
  }
};

/* ---------- visuals: moored boats rocking, the one you drive, nav lights at night ---------- */
Boat.visual = function (dt) {
  if (!Boat.inited) return; const t = App.time, cx = camera.position.x, cz = camera.position.z, night = env.lampOn > 0.3;
  for (const P of Boat.all) {
    const act = Boat.on && Boat.p === P, dx = P.x - cx, dz = P.z - cz, near = act || dx * dx + dz * dz < 520 * 520;
    P.holder.visible = near; if (!near) continue;
    Boat.attitude(P, dt, t); if (P.parts.nav) P.parts.nav.visible = night;
  }
  Boat.updateWake(dt);
};

/* ---------- camera ---------- */
Boat.camera = function (dt) {
  const P = Boat.p; if (!P || !Boat.on || devOn('free')) return; const S = P.spec;
  Cockpit.group.visible = false; car.ext.visible = true;
  Cam.shake *= Math.max(0, 1 - dt * 5); const sh = save.set.shake ? Cam.shake : 0, spd = P.speed; let wantFov = save.set.fov + clamp(spd * 0.3, 0, 12);
  if (P.skip) P.skip.visible = Boat.view !== 0;
  if (Boat.view === 0) {
    _bq1.setFromEuler(_be1.set(-P.pitch * 0.6, P.yaw, P.roll * 0.5, 'YXZ')); _bl1.set(S.eye[0], S.eye[1], S.eye[2]).applyQuaternion(_bq1);
    camera.position.set(P.x + _bl1.x + (Math.random() - 0.5) * sh * 0.05, P.y + _bl1.y + (Math.random() - 0.5) * sh * 0.05, P.z + _bl1.z + (Math.random() - 0.5) * sh * 0.05);
    const ly = Cam.back ? Math.PI : Cam.lookYaw; _bq2.setFromAxisAngle(_bY, Math.PI); _bq1.multiply(_bq2); _bq2.setFromEuler(_be1.set(Cam.lookPitch, ly, 0, 'YXZ')); camera.quaternion.copy(_bq1.multiply(_bq2));
    wantFov += 4;
  } else {
    if (Boat.snapCam) { Boat.cyaw = P.yaw; Boat.snapCam = false; } else Boat.cyaw += angDiff(Boat.cyaw, P.yaw) * (1 - Math.exp(-dt * (2.4 + Math.min(2.5, spd * 0.06))));
    const c = Boat.view === 1 ? S.chase : S.far, d = c[0] * Boat.zoom, hh = c[1] * (0.7 + 0.3 * Boat.zoom), ly = Cam.lookYaw + (Cam.back ? Math.PI : 0), a = Boat.cyaw + ly, fx = Math.sin(a), fz = Math.cos(a);
    _bcm.p.set(P.x - fx * d, P.y + hh, P.z - fz * d); _bcm.t.set(P.x + (ly ? 0 : fx * 9), P.y + 1.0 + Cam.lookPitch * 8, P.z + (ly ? 0 : fz * 9));
    groundAt(_bcm.p.x, _bcm.p.z, _bgr); const gy = Math.max(0, _bgr.h) + 1.3;
    camera.position.set(_bcm.p.x + (Math.random() - 0.5) * sh * 0.05, Math.max(_bcm.p.y, gy) + (Math.random() - 0.5) * sh * 0.05, _bcm.p.z + (Math.random() - 0.5) * sh * 0.05);
    camera.lookAt(_bcm.t);
  }
  if (camera.aspect < 1.33) wantFov = Math.min(105, 2 * Math.atan(Math.tan(wantFov * DEG / 2) * 1.33 / camera.aspect) / DEG);
  Cam.fov += (wantFov - Cam.fov) * Math.min(1, dt * 4); if (Math.abs(camera.fov - Cam.fov) > 0.05) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
  if (!Cam.dragging) { Cam.lookYaw *= Math.exp(-dt * 3); Cam.lookPitch *= Math.exp(-dt * 3); }
};

/* ---------- sound ---------- */
Boat.sound = function (dt) {
  const P = Boat.p; if (!Snd.ok || !P || App.mode !== 'play') return; const S = P.spec, t = Snd.ctx.currentTime, sn = S.snd, rpm = P.rpm, V = P.speed, inH = Boat.view === 0 ? 0.85 : 1, f = sn.f * (0.7 + 1.5 * rpm);
  Snd.loopSet('bt1', f, (0.06 + 0.12 * rpm) * inH, sn.saw, sn.lp * (0.6 + 0.9 * rpm));
  Snd.loopSet('bt2', f * 1.5, (0.02 + 0.05 * rpm) * inH, 'square', sn.lp * 0.5 * (0.6 + 0.8 * rpm));
  Snd.wind.g.gain.setTargetAtTime(Math.min(0.5, Math.pow(clamp(V / 30, 0, 1), 1.2) * 0.4 * sn.hiss), t, 0.1); Snd.wind.f.frequency.setTargetAtTime(500 + V * 30, t, 0.1);
  Snd.rumble.g.gain.setTargetAtTime(0.03 + 0.17 * clamp(V / 20, 0, 1), t, 0.1);
};

/* ---------- HUD ---------- */
Boat.hud = function (dt) {
  const P = Boat.p; if (!Boat.on || !P) return; Boat.hudT -= dt; if (Boat.hudT > 0) return; Boat.hudT = 0.07;
  const S = P.spec; tx('fsv', String(Math.round(toUnit(P.speed * 3.6)))); tx('fsu', unitName());
  const ft = save.set.units === 'mph', dep = Math.max(0, P.depth); tx('fav', dep > 60 ? '60+' : String(Math.round(ft ? dep * 3.281 : dep))); tx('fau', ft ? 'FT' : 'M');
  const md = Dock.dist(P.x, P.z); tx('fvs', md < 1000 ? 'MARINA ' + Math.round(ft ? md * 3.281 : md) + (ft ? ' FT' : ' M') : 'MARINA ' + (md / (ft ? 1609 : 1000)).toFixed(1) + (ft ? ' MI' : ' KM')); tx('fag', S.name.toUpperCase());
  const hd = Math.round(P.hdg || 0) % 360; tx('fhv', String(hd).padStart(3, '0')); tx('fhc', ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(hd / 45) % 8]);
  E.fthb.style.width = (P.thr * 100).toFixed(0) + '%'; E.fthr.classList.toggle('ab', !!P.boost);
  const wn = Boat.warn; if (E.fwn._w !== wn) { E.fwn._w = wn; E.fwn.textContent = wn; E.fwn.hidden = !wn; }
  E.fsp.classList.remove('lo');
};
Boat.prompt = function (pr) {
  const P = Boat.p; let h = '';
  if (P && P.st === 'driving' && Boat.canExit && P.thr < 0.05) h = TouchIn.on ? '<em>EXIT</em> to get out' : '<em>F</em> Get out of the ' + esc(P.spec.name) + ' · <em>R</em> back to the slip';
  if (h) { if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; } else if (!pr.hidden) pr.hidden = true;
};

/* ---------- map ---------- */
Boat.drawFullIcons = function (g, k) {
  if (!Boat.inited) return;
  for (const P of Boat.boats) {
    if (!Boat.owned(P.id)) continue; if (Math.hypot(P.x - P.home.x, P.z - P.home.z) < 30 && !(Boat.on && Boat.p === P)) continue;
    const s = FM.toScreen(P.x, P.z); g.save(); g.fillStyle = '#2aa8d6'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; g.beginPath(); g.arc(s[0], s[1], 6 * k, 0, TAU); g.fill(); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(s[0] - 3.2 * k, s[1] + 1.2 * k); g.lineTo(s[0] + 3.2 * k, s[1] + 1.2 * k); g.lineTo(s[0] + 1.8 * k, s[1] + 3 * k); g.lineTo(s[0] - 1.8 * k, s[1] + 3 * k); g.closePath(); g.fill(); g.restore();
  }
};
