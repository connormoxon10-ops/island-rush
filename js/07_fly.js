/* ================= FLYING =================
   Walk up to a parked plane and press F. The flight model is arcade-realistic: real lift / stall / drag / thrust curves and a rate-limited
   control law, with an optional assist (stick centred = hold the flight path, banks are commanded as angles and wings level on release).
   Wheels contact the ground through three points, so takeoff rolls, rotation, flares, bounces and wing/nose strikes all fall out of the
   same model. Crashing (hard landing, trees, buildings, water, overspeed) wrecks the plane and puts you back at its stand for a small fee.
   Units are metres and seconds; models face +Z, the left wing is +X; heading is compass degrees (north is -z). */
const PEXTRA = {
  sparrow: { lvl: 1.4, fee: 100, maxBank: 58 * DEG, aero: false },
  vixen: { lvl: 0.7, fee: 250, maxBank: 82 * DEG, aero: true },
  talon: { lvl: 0.8, fee: 500, maxBank: 78 * DEG, aero: true },
  /* gs = how hard the nose wheel steers on the ground (big planes turn slowly) */
  wren: { lvl: 1.0, fee: 150, maxBank: 62 * DEG, aero: true, gs: 1 },
  gull: { lvl: 0.7, fee: 900, maxBank: 52 * DEG, aero: false, gs: 0.65 },
  meridian: { lvl: 0.55, fee: 3000, maxBank: 32 * DEG, aero: false, gs: 0.4 },
  kestrel: { lvl: 1, fee: 700, maxBank: 0, aero: false, gs: 0 },
  zephyr: { lvl: 1, fee: 500, maxBank: 0, aero: false, gs: 0.3 }
};
const Fly = { on: false, p: null, planes: [], near: null, view: 1, zoom: 1, wT: 0, inited: false, cq: new THREE.Quaternion(), focus: { x: 0, y: 0, z: 0 }, hudT: 0, warn: '', tipT: 0, agl: 0, canExit: false, flights: 0, snapCam: true, msg: 0 };
const _Y = new THREE.Vector3(0, 1, 0), _fq = new THREE.Quaternion(), _fq2 = new THREE.Quaternion(), _fF = new THREE.Vector3(), _fU = new THREE.Vector3(), _fR = new THREE.Vector3(), _fW = new THREE.Vector3(), _fA = new THREE.Vector3(), _fP = new THREE.Vector3(), _fE = new THREE.Euler(), _fL = new THREE.Vector3();
const _fZ = { pull: 0, roll: 0, yaw: 0, dthr: 0, brake: 0 }, _fIn = { pull: 0, roll: 0, yaw: 0, dthr: 0, brake: 0 };

/* ---------- setup ---------- */
Fly.init = function () {
  if (!Air.s || Fly.inited) return; Fly.inited = true; planeInit();
  for (const id in PEXTRA) { const S = PSPEC[id]; Object.assign(S, PEXTRA[id]); S.kd = S.thrust * (S.jet ? 1 - Math.pow(S.Vmax / S.Vprop, 2) : 1 - S.Vmax / S.Vprop) / (S.Vmax * S.Vmax * 1.8); }
  for (const sp of Air.spots) Fly.make(sp);
  const A = Air.s, ax = A.cx - 45, az = A.cz + 138, al = buildAirliner(); al.root.position.set(ax, A.H0 + 0.07, az); al.root.traverse((m) => { if (m.isMesh) m.castShadow = true; }); scene.add(al.root);
  const H0 = A.H0, ab = (x0, z0, x1, z1, yb, yt) => Air.boxes.push([ax + x0, az + z0, ax + x1, az + z1, H0 + yt, H0 + yb, 0, 0, 0]);   /* the airliner: body, wings, engines, tailplane, fin */
  ab(-2.1, -18, 2.1, 18, 0.8, 5.6); ab(-16.5, -5.7, 16.5, 3, 1.8, 4.0); ab(-6.6, 0.5, -4.2, 4.5, 0.3, 2.6); ab(4.2, 0.5, 6.6, 4.5, 0.3, 2.6);
  ab(-6.2, -18, 6.2, -13.8, 3.6, 4.9); ab(-0.4, -17.7, 0.4, -11.2, 4.8, 9); ab(-0.4, -18.2, 0.4, -14.5, 9, 12.9);
};
Fly.make = function (sp) {
  const A = Air.s, o = Planes.create(sp.id, sp.hue), S = o.spec, x = A.cx + sp.u, z = A.cz + sp.v, y = Air.groundY(x, z) + S.cgY;
  const P = { id: sp.id, spec: S, holder: o.holder, parts: o.parts, hue: sp.hue, home: { x, y, z, yaw: sp.yaw }, x, y, z, q: new THREE.Quaternion().setFromAxisAngle(_Y, sp.yaw), vx: 0, vy: 0, vz: 0, thr: 0, rpm: 0, ab: 0, ip: 0, ir: 0, iy: 0, wp: 0, wy: 0, wr: 0, gt: 1, gnd: true, speed: 0, airT: 0, st: 'parked', cN: 0, rh: 0, tag: null, bank: 0, pitch: 0, land: null };
  scene.add(o.holder); Fly.planes.push(P); Fly.place(P); Fly.tagFor(P); return P;
};
Fly.place = function (P) { P.holder.position.set(P.x, P.y, P.z); P.holder.quaternion.copy(P.q); };
Fly.owned = function (id) { return PSPEC[id].cost === 0 || !!(save.air && save.air.own[id]); };
Fly.tagFor = function (P) {
  if (P.tag) { P.holder.remove(P.tag); P.tag.material.map.dispose(); P.tag.material.dispose(); P.tag = null; }
  if (Fly.owned(P.id)) return;
  const c = mkCanvas(384, 96), g = c.getContext('2d'); g.fillStyle = 'rgba(8,12,18,0.82)'; g.fillRect(0, 0, 384, 96); g.fillStyle = '#ffb02e'; g.fillRect(0, 0, 8, 96);
  g.font = '700 40px Rajdhani, Arial, sans-serif'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(P.spec.name.toUpperCase() + ' · ' + P.spec.role, 22, 32); g.fillStyle = '#4be08a'; g.font = '700 38px Rajdhani, Arial, sans-serif'; g.fillText('FOR SALE  ' + money(P.spec.cost), 22, 70);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, fog: true }));
  sp.scale.set(7.2, 1.8, 1); sp.position.set(0, P.spec.tagY || 3.4, 0); P.holder.add(sp); P.tag = sp;
};
Fly.tags = function () { for (const P of Fly.planes) Fly.tagFor(P); };

/* ---------- boarding and leaving ---------- */
Fly.scan = function () {
  Fly.near = null; if (!Foot.on || Talk.on || !Fly.inited || Fly.on) return; let best = 1e9;
  for (const P of Fly.planes) {
    if (P.st !== 'parked') continue; const dx = Foot.x - P.x, dz = Foot.z - P.z; if (dx * dx + dz * dz > 380) continue;
    _fF.set(0, 0, 1).applyQuaternion(P.q); const l = Math.hypot(_fF.x, _fF.z) || 1, fx = _fF.x / l, fz = _fF.z / l, lz = dx * fx + dz * fz, lx = dx * -fz + dz * fx;
    if (Math.abs(lz) < P.spec.len * 0.34 + 1.4 && Math.abs(lx) < 3.8) { const d = Math.hypot(lx, lz); if (d < best) { best = d; Fly.near = P; } }
  }
};
Fly.useNear = function () {
  const P = Fly.near; if (!P) return;
  if (!Fly.owned(P.id)) {
    if (save.money < P.spec.cost) { UI.toast('You need ' + money(P.spec.cost) + ' to buy the ' + P.spec.name, 'bad'); return; }
    save.money -= P.spec.cost; save.air.own[P.id] = true; writeSave(); Fly.tags(); UI.toast('Bought the ' + P.spec.name + ' · ' + money(P.spec.cost), 'good'); Snd.win();
  }
  Fly.board(P);
};
Fly.board = function (P) {
  if (!Foot.on || Fly.on) return; if (Mi) { UI.toast('Finish or abandon the run first', 'bad'); return; } if (Fare.phase !== 'idle') { UI.toast('You have a taxi fare waiting', 'bad'); return; } if (Wanted.stars > 0) { UI.toast('The police are after you. Lose them first', 'bad'); return; }
  if (Talk.on) Talk.close(true); Fight.reset(); Foot.on = false; Foot.state = 'walk'; try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* ignore */ }
  Fly.on = true; Fly.p = P; P.st = 'flying'; P.thr = P.spec.heli ? 0.45 : 0; P.hY = undefined; P.rpm = P.spec.idle; P.ip = P.ir = P.iy = 0; P.wp = P.wy = P.wr = 0; P.rh = 0; P.airT = 0; P.land = null; if (P.tag) P.tag.visible = false;
  Fly.view = save.air.view; if (P.spec.blimp && Fly.view === 0) Fly.view = 1; Cam.lookYaw = Cam.lookPitch = 0; Fly.zoom = 1; Fly.snapCam = true; Fly.warn = ''; Fly.tipT = 0; Fly.msg = 0;
  Foot.parkCar(car); syncPl(); UI.footMode(false); UI.flyMode(true); Snd.door();
  UI.toast(P.spec.heli ? (TouchIn.on ? 'THR+ to climb · tilt to move' : 'Shift climbs · W S A D tilt · Q E turn · Space brakes to a hover') : P.spec.blimp ? (TouchIn.on ? 'THR+ for power · PULL climbs' : 'Shift throttle · S climbs, W sinks · A D turn · Space brakes') : TouchIn.on ? 'Throttle up, then PULL to lift off' : 'Shift throttle up · hold S to lift off at ~' + Math.round(toUnit(P.spec.Vr * 3.6)) + ' ' + unitName().toLowerCase(), 'info');
  VM.onBoard('plane');
};
Fly.dropFoot = function (P, side) {
  _fF.set(0, 0, 1).applyQuaternion(P.q); const l = Math.hypot(_fF.x, _fF.z) || 1, fx = _fF.x / l, fz = _fF.z / l; let pos = null;
  for (const s of [1, -1]) for (const dz of [0.3, -1.2, 1.5]) { const x = P.x + (fz * s) * 2.5 + fx * dz, z = P.z + (-fx * s) * 2.5 + fz * dz; if (!footBlockedAt(x, z)) { pos = { x, z, yaw: Math.atan2(-fz * s, fx * s) }; break; } }
  if (!pos) pos = { x: P.x + fz * 3, z: P.z - fx * 3, yaw: 0 };
  if (!Foot.ped) Foot.ped = footNewPed(); Foot.ped.app = footApp();
  Foot.on = true; Foot.x = pos.x; Foot.z = pos.z; groundAt(pos.x, pos.z, _fg); Foot.y = _fg.h; Foot.vx = Foot.vz = Foot.vy = 0; Foot.air = false; Foot.state = 'walk'; Foot.speed = 0; Foot.dip = 0; Foot.hitCool = 1;
  Foot.yaw = Foot.body = Math.atan2(P.x - pos.x, P.z - pos.z); Foot.pitch = 0; Foot.camD = 3.4; Foot.prevView = Cam.view; Foot.tp = Cam.view === 2; Cam.lookYaw = Cam.lookPitch = 0;
};
Fly.exit = function () {
  const P = Fly.p; if (!Fly.on || !P || P.st !== 'flying') return;
  if (!P.gnd || P.speed > 3.5) { UI.toast('Land and stop before getting out', 'bad'); return; }
  Fly.leave(P); Fly.dropFoot(P); syncPl(); UI.flyMode(false); UI.footMode(true); Snd.door(); UI.toast('On foot · F to climb back in', 'info');
};
Fly.leave = function (P) {
  if (VM.m) VM.abort('Run abandoned');
  Fly.on = false; P.st = 'parked'; P.vx = P.vy = P.vz = 0; P.thr = 0; P.rpm = 0; P.ab = 0; P.speed = 0; if (P.tag) P.tag.visible = !Fly.owned(P.id); P.holder.visible = true;
  camera.up.set(0, 1, 0); Cam.fov = save.set.fov; camera.fov = save.set.fov; camera.updateProjectionMatrix();
};
Fly.home = function (P) {
  if (P.wk) Wreck.cleanup(P);
  const H = P.home; P.x = H.x; P.y = H.y; P.z = H.z; P.q.setFromAxisAngle(_Y, H.yaw); P.vx = P.vy = P.vz = 0; P.thr = 0; P.rpm = 0; P.hY = undefined; P.wp = P.wy = P.wr = 0; P.gt = 1; P.gnd = true; P.st = 'parked'; P.speed = 0; P.holder.visible = true; if (P.tag) P.tag.visible = !Fly.owned(P.id); Fly.place(P);
};
/* abort without landing (teleport, respawn): the plane goes back to its stand */
Fly.end = function () { const P = Fly.p; if (!Fly.on || !P) return; Fly.leave(P); Fly.home(P); UI.flyMode(false); UI.footMode(false); };
Fly.reset = function () {
  const P = Fly.p; if (!Fly.on || !P) return; if (P.st === 'wreck') { Wreck.skip(); return; } if (VM.m) VM.abort('Run abandoned'); Fly.home(P); P.st = 'flying'; P.thr = 0; P.holder.visible = true; if (P.tag) P.tag.visible = false; Fly.snapCam = true; UI.toast('Back on the apron', 'info');
};
Fly.cycle = function () { Fly.view = (Fly.view + 1) % 3; if (Fly.view === 0 && Fly.p && Fly.p.spec.blimp) Fly.view = 1; save.air.view = Fly.view; Fly.snapCam = true; UI.toast(['Cockpit', 'Chase', 'Far chase'][Fly.view] + ' view', 'info'); };

/* ---------- input ---------- */
Fly.input = function (dt) {
  const K = Keys, T = TouchIn, I = _fIn;
  let pull = ((K.KeyS || K.ArrowDown) ? 1 : 0) - ((K.KeyW || K.ArrowUp) ? 1 : 0) + T.gas - T.brk; if (save.set.finv) pull = -pull;
  let roll = ((K.KeyD || K.ArrowRight) ? 1 : 0) - ((K.KeyA || K.ArrowLeft) ? 1 : 0) + T.r - T.l, yaw = (K.KeyE ? 1 : 0) - (K.KeyQ ? 1 : 0);
  let dthr = ((K.ShiftLeft || K.ShiftRight || K.KeyX) ? 1 : 0) - (K.KeyZ ? 1 : 0) + T.nit - T.hand, brake = K.Space ? 1 : 0;
  let pads = null; try { pads = navigator.getGamepads ? navigator.getGamepads() : null; } catch (e) { pads = null; }
  if (pads) for (const p of pads) if (p && p.connected) {
    const dz = (v) => (Math.abs(v) > 0.12 ? v : 0), bv = (i) => (p.buttons[i] ? p.buttons[i].value || (p.buttons[i].pressed ? 1 : 0) : 0);
    roll += dz(p.axes[0]); pull += save.set.finv ? -dz(p.axes[1]) : dz(p.axes[1]); yaw += dz(p.axes[2] || 0); dthr += bv(7) - bv(6) + (bv(5) > 0.5 ? 1 : 0) - (bv(4) > 0.5 ? 1 : 0); brake = Math.max(brake, bv(0));
    for (const [i, code] of [[3, 'KeyC'], [9, 'Escape'], [8, 'KeyM'], [12, 'KeyF'], [2, 'KeyR']]) { const on = bv(i) > 0.5; if (on && !padPrev[i]) onKey(code); padPrev[i] = on; } break;
  }
  if (T.brk && Fly.p && Fly.p.gnd) brake = 1;
  I.pull = clamp(pull, -1, 1); I.roll = clamp(roll, -1, 1); I.yaw = clamp(yaw, -1, 1); I.dthr = clamp(dthr, -1, 1); I.brake = brake; return I;
};

/* ---------- ground height under a world point (airport apron is a touch higher than the field) ---------- */
function flyGround(x, z) { return Air.groundY(x, z); }

/* ---------- physics sub-step ---------- */
/* ---------- rotorcraft and airship: simple command-rate models that share the plane's ground contact ---------- */
Fly.idle = function (P) { return P.spec.heli ? P.thr < 0.5 : P.thr < 0.05; };
Fly.subRot = function (P, h, I) {
  const S = P.spec, q = P.q, gnd = P.gt > 0;
  if (P.hY === undefined) { _fF.set(0, 0, 1).applyQuaternion(q); P.hY = Math.atan2(_fF.x, _fF.z); P.hP = 0; P.hR = 0; P.hw = 0; }
  const sy = Math.sin(P.hY), cy = Math.cos(P.hY), fx = sy, fz = cy, lx = cy, lz = -sy;      /* forward and left on the ground plane */
  if (S.heli) {
    const lift = clamp((P.rpm - 0.62) / 0.3, 0, 1), gk = gnd ? 0.12 : 1, k = Math.min(1, h * 3.4);
    P.hP += (I.pull * 0.5 * gk - P.hP) * k;                                                  /* + = nose up */
    P.hR += (I.roll * 0.46 * gk - P.hR) * k;                                                 /* + = bank right */
    P.hw += (-I.yaw * 1.5 * (0.3 + 0.7 * lift) - P.hw) * Math.min(1, h * 3.2); P.hY += P.hw * h;
    const tl = lift * (gnd ? 0.25 : 1), af = -Math.tan(P.hP) * G * 0.9 * tl, al = -Math.tan(P.hR) * G * 0.9 * tl, vh = Math.hypot(P.vx, P.vz);
    const dk = 0.05 + 0.0022 * vh + (I.brake ? 0.9 : 0) + (gnd ? 0.8 : 0);                   /* Space = brake to a hover; skids drag on the ground */
    P.vx += (fx * af + lx * al - P.vx * dk) * h; P.vz += (fz * af + lz * al - P.vz * dk) * h;
    const vyT = (P.thr - 0.45) / 0.55 * (P.thr > 0.45 ? 8 : 6.5), aL = clamp((vyT - P.vy) * 2.4, -11, 13);
    P.vy += lerp(-G, aL, lift) * h;
  } else {
    const vf = P.vx * fx + P.vz * fz, vl = P.vx * lx + P.vz * lz, wake = clamp(0.35 + Math.abs(vf) / 10, 0.35, 1);
    const aF = P.thr * 1.5 * (P.rpm > 0.15 ? 1 : 0.3) - vf * 0.09 * (1 + (I.brake ? 3 : 0)), aLat = -vl * 0.7;
    P.vx += (fx * aF + lx * aLat) * h; P.vz += (fz * aF + lz * aLat) * h;
    const vyT = clamp(I.pull, -1, 1) * 3.4; P.vy += clamp((vyT - P.vy) * 0.9, -2.5, 2.5) * h;     /* buoyant: S climbs, W sinks, nothing falls */
    const wT = -(I.yaw * 0.45 + I.roll * 0.4) * wake; P.hw += (wT - P.hw) * Math.min(1, h * 0.8); P.hY += P.hw * h;
    P.hP += (clamp(P.vy * 0.045, -0.2, 0.2) - P.hP) * Math.min(1, h * 1.2); P.hR += (clamp(-P.hw * vf * 0.03, -0.12, 0.12) - P.hR) * Math.min(1, h * 1.2);
  }
  _fE.set(-P.hP, P.hY, P.hR, 'YXZ'); q.setFromEuler(_fE);
  P.bank = P.hR; P.pitch = P.hP; P.alpha = 0; P.cl = 0; P.stalled = false; P.ab = 0;
  P.x += P.vx * h; P.y += P.vy * h; P.z += P.vz * h;
  const g0 = flyGround(P.x, P.z), agl = P.y - S.cgY - g0; P.agl = agl;
  if (agl < 8) Fly.contact(P, h, I, Math.hypot(P.vx, P.vy, P.vz), P.hR, P.hP); else { P.gt = Math.max(0, P.gt - h); P.gnd = false; P.cN = 9; }
};
Fly.sub = function (P, h, I) {
  if (P.spec.heli || P.spec.blimp) { Fly.subRot(P, h, I); return; }
  const S = P.spec, q = P.q, Vs = S.Vs, aS = S.aStall, hold = save.set.fassist !== false;
  _fF.set(0, 0, 1).applyQuaternion(q); _fU.set(0, 1, 0).applyQuaternion(q); _fR.set(-1, 0, 0).applyQuaternion(q);
  const vx = P.vx, vy = P.vy, vz = P.vz, V = Math.sqrt(vx * vx + vy * vy + vz * vz), vf = vx * _fF.x + vy * _fF.y + vz * _fF.z, vu = vx * _fU.x + vy * _fU.y + vz * _fU.z, vr = vx * _fR.x + vy * _fR.y + vz * _fR.z;
  const alpha = V > 2 ? Math.atan2(-vu, Math.max(Math.abs(vf), 0.6)) : 0, beta = V > 2 ? Math.atan2(vr, Math.max(Math.abs(vf), 0.6)) : 0;
  const bank = Math.atan2(-_fR.y, _fU.y), pitchA = Math.asin(clamp(_fF.y, -1, 1)); P.bank = bank; P.pitch = pitchA; P.alpha = alpha;
  const gnd = P.gt > 0, vr2 = (V / Vs) * (V / Vs);
  /* lift */
  const a = alpha / aS; let cl = Math.abs(a) <= 1 ? a : Math.sign(a) * Math.max(0.3, 1 - (Math.abs(a) - 1) * 1.5);
  let aL = clamp(G * vr2 * cl, -S.gmax * 0.55 * G, S.gmax * 1.08 * G); P.cl = cl; P.stalled = Math.abs(a) > 1.04 && V > 6 && !gnd;
  let lx = _fU.x, ly = _fU.y, lz = _fU.z;
  if (V > 3) { const ix = vx / V, iy = vy / V, iz = vz / V, d = lx * ix + ly * iy + lz * iz; lx -= d * ix; ly -= d * iy; lz -= d * iz; const l = Math.hypot(lx, ly, lz) || 1; lx /= l; ly /= l; lz /= l; }
  /* thrust, drag */
  const thr = P.thr; let ab = 0; if (S.jet && !S.noAB && thr > 0.88) ab = (thr - 0.88) / 0.12; P.ab = ab;
  const T = S.thrust * thr * (1 + ab * 0.5) * (S.jet ? Math.max(0, 1 - Math.pow(V / (S.Vprop * (1 + ab * 0.2)), 2)) : Math.max(0, 1 - V / S.Vprop));
  /* airbrakes / spoilers (Space in the air): a real deceleration that grows with speed, so on the Talon it bleeds off ~9 m/s2 at 120 m/s and ~19 m/s2 flat out;
     it fades out near stall speed so holding it on final can't stall you by itself */
  const abr = I.brake && !gnd ? 1.6 : 1, vN = V / S.Vmax, aBk = I.brake && !gnd ? (S.brakeA || 0.45) * (4 + 10 * vN * vN) * clamp((V - 1.1 * Vs) / (0.5 * Vs), 0, 1) : 0;
  const aD = S.kd * V * V * (1 + 0.8 * vN * vN) * abr + aBk + 0.012 * Vs * Vs * aL * aL / Math.max(V * V, 0.36 * Vs * Vs);
  const kS = 1.2 + 0.03 * V, aSide = -vr * kS, iv = V > 0.1 ? 1 / V : 0;
  /* landing aid: a ground-effect cushion. In the last few metres a hard sink rate is eased towards ~1.6 m/s, so a sensible approach touches down firmly without needing a perfect flare */
  const aglp = P.agl == null ? 99 : P.agl; let cush = 0;
  if (!gnd && aglp < 9 && vy < -1.6 && V > Vs * 0.8) cush = Math.min(16, (-vy - 1.6) * 4.8) * (1 - aglp / 9);
  P.vx += (lx * aL + _fF.x * T - vx * iv * aD + _fR.x * aSide) * h;
  P.vy += (ly * aL + _fF.y * T - vy * iv * aD + _fR.y * aSide - G + cush) * h;
  P.vz += (lz * aL + _fF.z * T - vz * iv * aD + _fR.z * aSide) * h;
  /* control law: rates in the body frame */
  const e = clamp(vr2 / 0.81, 0.05, 1) / (1 + Math.max(0, V / Vs - 2.4) * 0.16);
  let wp, wr, wy; const hs = P.cl;
  if (!gnd) {
    const gam = V > 3 ? Math.asin(clamp(P.vy / V, -1, 1)) : 0, cgm = Math.cos(gam), cB = clamp(ly / Math.max(0.2, cgm), -1, 1);
    const den = (cB >= 0 ? 1 : -1) * Math.max(0.45, Math.abs(cB)), Tn = T * (_fF.x * lx + _fF.y * ly + _fF.z * lz), nHold = hold ? clamp((Math.cos(gam) - Tn / G) / den, -2.4, 2.4) : 1;
    const lowV = hold ? clamp((1.25 * Vs - V) / (0.3 * Vs), 0, 1) : 0, aTrim = clamp(aS * Vs * Vs / Math.max(V * V, 1) * nHold, -aS * 0.9, aS * 0.97) * (1 - 0.6 * lowV);
    if (hold) {
      const cap = Math.max(aTrim, aS * Math.min(0.86, S.gmax * Vs * Vs / Math.max(V * V, 1))), capN = Math.min(aTrim, -aS * Math.min(0.6, S.gmax * 0.5 * Vs * Vs / Math.max(V * V, 1)));
      const target = P.ip >= 0 ? lerp(aTrim, cap, P.ip) : lerp(aTrim, capN, -P.ip);
      wp = clamp((target - alpha) * S.stab * 2.2, -S.pr, S.pr) * e;
    } else wp = (P.ip * S.pr * 0.85 - (alpha - aTrim) * 0.5) * e;
    if (Math.abs(alpha) > aS * 1.02) wp += -Math.sign(alpha) * (Math.abs(alpha) / aS - 1) * 1.5;
    /* roll: bank-angle command with wings-level on release (aerobatic planes drop into free rolling when the key is held) */
    if (hold) {
      if (S.aero && Math.abs(P.ir) > 0.92) P.rh += h; else if (Math.abs(P.ir) < 0.3) P.rh = 0;
      if (S.aero && P.rh > 0.55) wr = P.ir * S.rr * e; else { const tb = P.ir * S.maxBank * clamp(0.35 + 0.65 * aglp / 22, 0.35, 1); wr = clamp((tb - bank) * 3.2 * Math.max(0.35, S.lvl), -S.rr, S.rr) * e; if (Math.abs(bank) > 1.75 && Math.abs(P.ir) < 0.1) wr *= 0.25; }
    } else wr = P.ir * S.rr * e;
    wy = -P.iy * S.yr * e - beta * 2.6 * e;
    if (P.stalled) wr += Math.sin(App.time * 9 + P.x) * 0.45 * (Math.abs(alpha) / aS - 1);
  } else {
    const eg = clamp((V - S.Vr * 0.72) / (S.Vr * 0.34), 0, 1);
    wp = P.ip * S.pr * eg * 0.42; if (pitchA > 0.21 && wp > 0) wp = 0; if (P.cN > 0.06 && P.ip < 0.35) wp -= clamp(P.cN * 1.8, 0, 1);
    wr = 0; const steer = clamp(P.iy + P.ir * 0.9, -1, 1); wy = -steer * 0.95 * (S.gs || 1) / (1 + V * 0.06) * clamp(V / 2 + thr * 0.6, 0, 1);
  }
  const k = Math.min(1, h * 14); P.wp += (wp - P.wp) * k; P.wr += (wr - P.wr) * k; P.wy += (wy - P.wy) * k;
  _fA.set(-P.wp, P.wy, P.wr); const ang = _fA.length() * h; if (ang > 1e-7) { _fA.normalize(); _fq.setFromAxisAngle(_fA, ang); q.multiply(_fq); q.normalize(); }
  P.x += P.vx * h; P.y += P.vy * h; P.z += P.vz * h;
  /* ground */
  const g0 = flyGround(P.x, P.z), agl = P.y - S.cgY - g0; P.agl = agl;
  if (agl < 8) Fly.contact(P, h, I, V, bank, pitchA); else { P.gt = Math.max(0, P.gt - h); P.gnd = false; P.cN = 9; }
};
const _wN = new THREE.Vector3(), _wL = new THREE.Vector3(), _wR = new THREE.Vector3();
Fly.contact = function (P, h, I, V, bank, pitchA) {
  const S = P.spec, G_ = S.gear, q = P.q, cg = S.cgY;
  _wN.set(0, -cg, G_.nz).applyQuaternion(q); _wL.set(G_.mx, -cg, G_.mz).applyQuaternion(q); _wR.set(-G_.mx, -cg, G_.mz).applyQuaternion(q);
  const gN = flyGround(P.x + _wN.x, P.z + _wN.z), gL = flyGround(P.x + _wL.x, P.z + _wL.z), gR = flyGround(P.x + _wR.x, P.z + _wR.z);
  const cN = P.y + _wN.y - gN, cL = P.y + _wL.y - gL, cR = P.y + _wR.y - gR, minC = Math.min(cN, cL, cR); P.cN = cN;
  /* water */
  const th = terrainHeight(P.x, P.z); if (th < 0.2 && minC < 0.5 && !Air.paved(P.x, P.z)) { Fly.crash('Ditched in the water', true); return; }
  /* wing tips, nose and tail */
  for (const pt of [[0, 0.15, S.len * 0.5], [0, S.tailY || 0.5, -S.len * 0.5 + 0.4], [S.span * 0.5, 0.7, 0], [-S.span * 0.5, 0.7, 0]]) {
    _fW.set(pt[0], pt[1], pt[2]).applyQuaternion(q); const gg = flyGround(P.x + _fW.x, P.z + _fW.z);
    if (P.y + _fW.y < gg - 0.05 && V > 5) { Fly.crash(pt[0] ? 'Wing hit the ground' : pt[2] > 0 ? 'Nose into the ground' : 'Tail strike', false); return; }
  }
  if (minC < 0.01) {
    const first = P.gt <= 0, sink = Math.max(0, -P.vy);
    if (first) {
      const bd = Math.abs(bank) / DEG, pd = pitchA / DEG;
      if (sink > S.crash) { Fly.crash('Hard landing', false); return; }
      if (bd > 38 && V > 10) { Fly.crash('Wing strike on landing', false); return; }
      if (pd < -15 && V > 12) { Fly.crash('Nose gear collapsed', false); return; }
      P.land = { sink, V, bank: bd, x: P.x, z: P.z, air: P.airT }; P.airT = 0;
      if (sink > 1.2) { Cam.shake = Math.max(Cam.shake, Math.min(1.4, sink * 0.3)); }
    }
    if (minC < 0) P.y -= minC; if (P.vy < 0) { P.vy = first && sink > 3.2 ? sink * 0.12 : 0; }
    P.gt = 0.1;
  } else P.gt = Math.max(0, P.gt - h);
  P.gnd = P.gt > 0;
  if (P.gnd) {
    /* nose gear below the surface: rotate nose up about the mains; wings level on the ground */
    if (cN < -0.01) { const d = clamp(-cN / Math.max(0.5, G_.nz - G_.mz), 0, 0.25); _fq.setFromAxisAngle(_fA.set(1, 0, 0), -d); q.multiply(_fq); }
    _fq.setFromAxisAngle(_fA.set(0, 0, 1), -bank * Math.min(1, h * 7)); if (!(Math.abs(bank) > 0.9)) q.multiply(_fq);
    const fl = Math.hypot(_fF.x, _fF.z) || 1; _fF.set(0, 0, 1).applyQuaternion(q); const fl2 = Math.hypot(_fF.x, _fF.z) || 1, fx = _fF.x / fl2, fz = _fF.z / fl2, rx = -fz, rz = fx;
    let along = P.vx * fx + P.vz * fz, lat = P.vx * rx + P.vz * rz; lat *= Math.exp(-(I.brake ? 12 : 7) * h);
    const grass = !Air.paved(P.x, P.z), rr = (grass ? 0.07 : 0.018) + (I.brake ? 0.55 : P.thr < 0.03 ? 0.11 : 0);
    const dec = rr * G * h; along = Math.abs(along) <= dec ? 0 : along - Math.sign(along) * dec;
    P.vx = fx * along + rx * lat; P.vz = fz * along + rz * lat;
    if (grass && V > 12 && Math.abs(bank) > 0.35) { /* rough field */ }
  }
};

/* ---------- crash ---------- */
Fly.crash = function (why, water, solid) {
  const P = Fly.p; if (!P || P.st !== 'flying') return; const inRun = !!VM.m; const imp = { vx: P.vx, vy: P.vy, vz: P.vz, sp: Math.hypot(P.vx, P.vy, P.vz), water: !!water, solid: !!solid }; P.st = 'wreck'; Fly.wT = 0; Fly.why = why; Fly.splash = !!water;
  if (VM.m) VM.fail(VM.m.hull !== undefined && VM.m.hull <= 0 ? 'SHOT DOWN' : 'CRASHED', [why]);
  Cam.shake = Math.max(Cam.shake, 3); Snd.crash(30); if (water) Snd.splash();
  const x = P.x, y = P.y, z = P.z;
  if (water) { for (let i = 0; i < 40; i++) emit(Part.smoke, x + (Math.random() - 0.5) * 6, 0.3, z + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 8, 3 + Math.random() * 9, (Math.random() - 0.5) * 8, 1.4 + Math.random(), 1.6, 5, 0.8, 0.9, 1, 0.6, 9); }
  else { sparks(x, y, z, 90, 24); for (let i = 0; i < 26; i++) emit(Part.smoke, x + (Math.random() - 0.5) * 3, y + Math.random() * 2, z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 7, 2 + Math.random() * 6, (Math.random() - 0.5) * 7, 2 + Math.random() * 2, 2.2, 6, 0.08, 0.08, 0.08, 0.7, -0.5); }
  if (!Wreck.begin(P, imp)) P.holder.visible = false; P.vx = P.vy = P.vz = 0; P.speed = 0; Fly.focus.x = x; Fly.focus.y = y; Fly.focus.z = z;
  /* the bill is settled at the hangar afterwards (Fly.billPlane); a failed Flight Office run is just charged */
  const raw = devOn('god') ? 0 : P.spec.fee, viaMech = raw > 0 && !inRun, fee = viaMech ? 0 : Math.min(save.money, raw); save.money -= fee; P.bill = viaMech ? raw : 0; writeSave();
  UI.banner('CRASHED', why + (raw ? ' · repair bill ' + money(raw) : ''));
};
Fly.wreckTick = function (dt) {
  const P = Fly.p; if (P.wk) { Fly.wT += dt; Wreck.tick(P, dt); return; }
  Fly.wT += dt; Cam.shake *= Math.max(0, 1 - dt * 3);
  if (Fly.wT < 2.8 && !Fly.splash && Math.random() < dt * 55) { emit(Part.smoke, P.x + (Math.random() - 0.5) * 2, P.y + 0.5, P.z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5, 2.6, 1.6, 5, 0.06, 0.06, 0.06, 0.55, -0.3); if (Math.random() < 0.5) emit(Part.spark, P.x + (Math.random() - 0.5), P.y + 0.3, P.z + (Math.random() - 0.5), (Math.random() - 0.5) * 2, 2 + Math.random() * 3, (Math.random() - 0.5) * 2, 0.6, 0.5, 0.5, 3, 1.4, 0.4, 0.9, 3); }
  Pl.x = P.x; Pl.z = P.z; Pl.y = P.y; Pl.speed = 0;
  if (Fly.wT > 3.3) { Fly.leave(P); Fly.home(P); Fly.dropFoot(P); syncPl(); UI.flyMode(false); UI.footMode(true); UI.toast('The ' + P.spec.name + ' is back at its stand', 'info'); Fly.billPlane(P); }
};
Fly.billPlane = function (P) { const b = P.bill || 0; P.bill = 0; if (b > 0) Mech.offer('plane', b, null, { name: P.spec.name }); };

/* ---------- obstacles: trees, rocks, buildings (checked at nose, tips and centre) ---------- */
const _op = [[0, 0, 0], [0, 0.2, 0], [0, 0.2, 0], [0, 0.6, 0], [0, 0.6, 0]];
Fly.obstacles = function (P) {
  const S = P.spec; if (P.agl > 300) return; const q = P.q; _op[1][2] = S.len * 0.5; _op[2][2] = -S.len * 0.5; _op[3][0] = S.span * 0.5; _op[4][0] = -S.span * 0.5;
  for (const pt of _op) {
    _fW.set(pt[0], pt[1], pt[2]).applyQuaternion(q); const x = P.x + _fW.x, y = P.y + _fW.y, z = P.z + _fW.z;
    const hit = solidHit(x, y, z, 0.5);
    if (hit) { Fly.crash(hit === 3 && Air.near(x, z, 2) ? 'Hit an airport building' : SOLID_MSG[hit], false, true); return; }
  }
  if (S.rotR) for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {   /* the rotor disc is wider than the cabin */
    _fW.set(d[0] * S.rotR, 2.05, d[1] * S.rotR).applyQuaternion(q); const hit = solidHit(P.x + _fW.x, P.y + _fW.y, P.z + _fW.z, 0.3);
    if (hit) { Fly.crash('Rotor strike', false, true); return; }
  }
};

/* ---------- per-frame step ---------- */
Fly.step = function (dt) {
  const P = Fly.p; if (!Fly.on || !P) return;
  if (P.st === 'wreck') { Fly.wreckTick(dt); return; }
  const S = P.spec, frozen = App.mode !== 'play' || devOn('free') || Police.hold, I = frozen ? _fZ : Fly.input(dt);
  P.ip = approach(P.ip, I.pull, (I.pull === 0 ? 9 : 4.5) * dt); P.ir = approach(P.ir, I.roll, (I.roll === 0 ? 9 : 5) * dt); P.iy = approach(P.iy, I.yaw, (I.yaw === 0 ? 9 : 5) * dt);
  P.brk = (P.brk || 0) + ((I.brake ? 1 : 0) - (P.brk || 0)) * Math.min(1, dt * 7);   /* airbrake panels follow the brake key */
  if (S.heli) {   /* collective springs back to the hover mark; the rotor spools up when you ask for lift and stays up while airborne */
    P.thr += (clamp(0.45 + I.dthr * 0.55, 0, 1) - P.thr) * Math.min(1, dt * 2.2); P.rpm += (((P.thr > 0.5 || !P.gnd || (P.thr > 0.2 && P.rpm > 0.9)) ? 1 : S.idle) - P.rpm) * Math.min(1, dt * 0.7);
  } else { P.thr = clamp(P.thr + I.dthr * 0.55 * dt, 0, 1); P.rpm += ((S.idle + (1 - S.idle) * P.thr) - P.rpm) * Math.min(1, dt * 3); }
  const n = Math.min(14, Math.ceil(dt / 0.01)), h = dt / n;
  for (let i = 0; i < n; i++) { Fly.sub(P, h, I); if (P.st === 'wreck') break; }
  if (P.st === 'wreck') { Fly.wreckTick(0); return; }
  P.speed = Math.hypot(P.vx, P.vy, P.vz); P.ias = P.speed;
  _fF.set(0, 0, 1).applyQuaternion(P.q); P.yawH = Math.atan2(_fF.x, _fF.z); P.hdg = Air.hdg(P.yawH);
  Fly.obstacles(P); if (P.st === 'wreck') { Fly.wreckTick(0); return; }
  if (P.speed > S.Vmax * 1.7) { Fly.crash('The airframe broke up', false); Fly.wreckTick(0); return; }
  if (!P.gnd) { P.airT += dt; save.air.hrs += dt / 3600; } else if (P.airT > 0 && !P.land) P.airT = 0;
  Fly.agl = P.agl; Fly.canExit = P.gnd && P.speed < 3.5;
  /* landing results */
  if (P.land) {
    const L = P.land; P.land = null; const rw = AIR.RW, u = L.x - Air.s.cx, v = L.z - Air.s.cz, onRw = Math.abs(v) < rw.hw && u > rw.u0 && u < rw.u1;
    if (L.sink > 1.2 && L.sink < P.spec.crash) { if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 0.18, 0.5, 0, 1800, Snd.sfx); for (const w of [-1, 1]) emit(Part.smoke, P.x + w * 1.1, P.y - P.spec.cgY + 0.2, P.z, P.vx * 0.2, 0.6, P.vz * 0.2, 1.1, 1.0, 3, 0.85, 0.85, 0.85, 0.4, -0.2); }
    const rot = !!(P.spec.heli || P.spec.blimp);
    if (L.air > (rot ? 40 : 20)) {
      save.air.ldg++; Fly.flights++;
      if ((onRw || (rot && Air.paved(L.x, L.z))) && L.bank < 16 && L.sink < 3.2) {
        const smooth = Math.max(0, 2.6 - L.sink), cen = 1 - Math.min(1, Math.abs(v) / rw.hw), pay = Math.round((40 + smooth * 38 + cen * 30 + (L.sink < 0.8 ? 30 : 0)) * (P.spec.payK || 1));
        save.money += pay; if (pay > (save.air.best || 0)) save.air.best = pay; writeSave();
        UI.banner(L.sink < 0.8 ? 'GREASER' : 'GOOD LANDING', '+' + money(pay) + ' · sink ' + L.sink.toFixed(1) + ' m/s'); Snd.win();
      } else if (L.sink < 3.5) { UI.toast(onRw ? 'Landed · a bit rough' : rot ? 'Landed · set down on the apron for landing pay' : 'Landed off the runway · no landing pay', 'info'); writeSave(); }
      else { UI.toast('Hard touchdown · sink ' + L.sink.toFixed(1) + ' m/s', 'bad'); writeSave(); }
    }
  }
  /* warnings */
  let w = '';
  if (P.stalled) w = 'STALL'; else if (!P.gnd && P.agl < 140 && P.vy < -7 - P.agl * 0.04 && P.agl > 8) w = 'PULL UP'; else if (P.speed > S.Vmax * 1.25) w = 'OVERSPEED';
  if (w !== Fly.warn) { Fly.warn = w; }
  /* time of tips */
  Fly.tipT += dt; if (Fly.tipT > 14 && !Fly.tipShown && P.gnd && P.speed < 2 && Fly.idle(P)) { Fly.tipShown = true; UI.toast(TouchIn.on ? 'THR+ for power · PULL to rotate · EXIT stops the engine' : 'Shift / Z throttle · A D roll · Q E rudder · Space brake · C camera · H assist', 'info'); }
  /* world focus */
  Fly.focus.x = P.x; Fly.focus.y = P.y; Fly.focus.z = P.z;
  syncPl();
};

/* ---------- visuals: parked planes and the one you fly ---------- */
const _fSt = { rpm: 0, pitch: 0, roll: 0, yaw: 0, ab: 0 };
Fly.visual = function (dt) {
  for (const P of Fly.planes) {
    const act = Fly.on && Fly.p === P;
    if (act && P.st !== 'wreck') { Fly.place(P); _fSt.rpm = P.rpm; _fSt.pitch = P.ip * (save.set.finv ? -1 : 1); _fSt.roll = P.ir; _fSt.yaw = P.iy; _fSt.ab = P.ab; _fSt.brake = P.brk || 0; Planes.pose(P, _fSt, dt); P.parts.cockpit.visible = Fly.view === 0; if (P.parts.hspin) P.parts.hspin.visible = Fly.view !== 0; }
    else if (P.st === 'parked') { _fSt.rpm = 0; _fSt.pitch = _fSt.roll = _fSt.yaw = _fSt.ab = _fSt.brake = 0; Planes.pose(P, _fSt, dt); P.parts.cockpit.visible = false; if (P.parts.hspin) P.parts.hspin.visible = true; }
  }
};

/* ---------- camera ---------- */
const _fcm = { p: new THREE.Vector3(), t: new THREE.Vector3(), u: new THREE.Vector3(), f: new THREE.Vector3() };
Fly.camera = function (dt) {
  const P = Fly.p; if (!P || !Fly.on || devOn('free')) return; const S = P.spec, q = P.q;
  Cockpit.group.visible = false; car.ext.visible = true;
  Cam.shake *= Math.max(0, 1 - dt * 5); const sh = save.set.shake ? Cam.shake : 0, spd = P.speed || 0; let wantFov = save.set.fov + clamp(spd * (S.jet ? 0.06 : 0.12), 0, 14);
  if (P.st === 'wreck') {
    if (P.wk) Wreck.camera(P, dt); else { camera.position.y = Math.max(camera.position.y, flyGround(camera.position.x, camera.position.z) + 1.5); camera.lookAt(P.x, P.y + 1, P.z); } wantFov = save.set.fov;
  } else if (Fly.view === 0) {
    _fL.set(S.eye[0], S.eye[1] - S.cgY, S.eye[2]).applyQuaternion(q); camera.position.set(P.x + _fL.x + (Math.random() - 0.5) * sh * 0.05, P.y + _fL.y + (Math.random() - 0.5) * sh * 0.05, P.z + _fL.z + (Math.random() - 0.5) * sh * 0.05);
    const ly = Cam.back ? Math.PI : Cam.lookYaw; _fq2.setFromAxisAngle(_Y, Math.PI); _fq.copy(q).multiply(_fq2); _fq2.setFromEuler(_fE.set(Cam.lookPitch, ly, 0, 'YXZ')); camera.quaternion.copy(_fq.multiply(_fq2));
    wantFov += 4;
  } else {
    const qc = (S.heli || S.blimp) ? _fq2.setFromAxisAngle(_Y, P.hY || 0) : q;   /* rotorcraft: the camera follows heading only, not tilt */
    if (Fly.snapCam) { Fly.cq.copy(qc); Fly.snapCam = false; } else Fly.cq.slerp(qc, 1 - Math.exp(-dt * (2.6 + Math.min(3, spd * 0.03))));
    const c = Fly.view === 1 ? S.chase : S.far, d = c[0] * Fly.zoom, hh = c[1] * (0.7 + 0.3 * Fly.zoom), ly = Cam.lookYaw + (Cam.back ? Math.PI : 0);
    _fcm.f.set(0, 0, 1).applyQuaternion(Fly.cq); _fcm.u.set(0, 1, 0).applyQuaternion(Fly.cq); _fcm.u.multiplyScalar(0.4).addScaledVector(_Y, 0.6).normalize();
    if (ly) _fcm.f.applyAxisAngle(_Y, ly);
    _fcm.p.set(P.x, P.y, P.z).addScaledVector(_fcm.f, -d).addScaledVector(_fcm.u, hh);
    _fcm.t.set(P.x, P.y, P.z).addScaledVector(_fcm.f, ly ? 0 : 14).addScaledVector(_fcm.u, 0.6 + Cam.lookPitch * 8);
    camera.position.set(_fcm.p.x + (Math.random() - 0.5) * sh * 0.05, Math.max(_fcm.p.y, flyGround(_fcm.p.x, _fcm.p.z) + 1.4) + (Math.random() - 0.5) * sh * 0.05, _fcm.p.z + (Math.random() - 0.5) * sh * 0.05);
    camera.up.copy(_fcm.u); camera.lookAt(_fcm.t); camera.up.set(0, 1, 0);
  }
  if (camera.aspect < 1.33) wantFov = Math.min(105, 2 * Math.atan(Math.tan(wantFov * DEG / 2) * 1.33 / camera.aspect) / DEG);
  Cam.fov += (wantFov - Cam.fov) * Math.min(1, dt * 4); if (Math.abs(camera.fov - Cam.fov) > 0.05) { camera.fov = Cam.fov; camera.updateProjectionMatrix(); }
  if (!Cam.dragging) { Cam.lookYaw *= Math.exp(-dt * 3); Cam.lookPitch *= Math.exp(-dt * 3); }
};
/* thinner haze at altitude so the island opens up below you */
Fly.fog = function () { if (!Fly.on || !Fly.p) return; const a = Math.max(0, camera.position.y - Air.s.H0 - 20); scene.fog.density *= 1 / (1 + a / 170); };

/* ---------- sound ---------- */
Fly.sound = function (dt) {
  const P = Fly.p; if (!Snd.ok || !P || App.mode !== 'play') return; const S = P.spec, t = Snd.ctx.currentTime;
  if (P.st === 'wreck') return;
  const rpm = P.rpm, V = P.speed, inCk = Fly.view === 0 ? 0.8 : 1;
  if (S.heli) { Snd.loopSet('fly1', 16 + rpm * 14, (0.05 + 0.2 * rpm) * inCk, 'square', 160 + rpm * 160); Snd.loopSet('fly2', 70 + rpm * 90, (0.02 + 0.06 * rpm) * inCk, 'sawtooth', 500); }
  else if (S.blimp) { Snd.loopSet('fly1', 20 + rpm * 28, (0.04 + 0.1 * rpm) * inCk, 'sawtooth', 220 + rpm * 300); Snd.loopSet('fly2', 31 + rpm * 42, (0.02 + 0.04 * rpm) * inCk, 'square', 200 + rpm * 200); }
  else if (!S.jet) { const f = 22 + rpm * 62; Snd.loopSet('fly1', f, (0.07 + 0.13 * rpm) * inCk, 'sawtooth', 380 + rpm * 700); Snd.loopSet('fly2', f * 1.505, (0.03 + 0.05 * rpm) * inCk, 'square', 300 + rpm * 500); }
  else { Snd.loopSet('fly1', 52 + rpm * 70, (0.04 + 0.1 * rpm) * inCk, 'sawtooth', 240 + rpm * 500); Snd.intake.g.gain.setTargetAtTime((0.04 + 0.2 * rpm + P.ab * 0.1) * inCk, t, 0.08); Snd.intake.f.frequency.setTargetAtTime(900 + rpm * 2200, t, 0.1); Snd.wind.g.gain.setTargetAtTime(0.1 + rpm * 0.25, t, 0.1); }
  Snd.wind.g.gain.setTargetAtTime(Math.min(0.55, Math.pow(clamp(V / 90, 0, 1), 1.4) * 0.5 + (S.jet ? rpm * 0.2 : 0)), t, 0.1); Snd.wind.f.frequency.setTargetAtTime(300 + V * 14, t, 0.1);
  Snd.rumble.g.gain.setTargetAtTime(P.gnd ? 0.05 * clamp(V / 25, 0, 1) * (Air.paved(P.x, P.z) ? 0.6 : 1.6) : 0, t, 0.1);
  if (Fly.warn === 'STALL') Snd.loopSet('stall', 820, (Math.floor(App.time * 6) & 1) ? 0.05 : 0, 'square', 1600);
  else if (Fly.warn === 'PULL UP') Snd.loopSet('stall', 1100, (Math.floor(App.time * 3.5) & 1) ? 0.06 : 0, 'square', 2200);
};

/* ---------- HUD ---------- */
Fly.hud = function (dt) {
  const P = Fly.p; if (!Fly.on || !P) return; Fly.hudT -= dt; if (Fly.hudT > 0) return; Fly.hudT = 0.07;
  const kmh = P.speed * 3.6, S = P.spec; tx('fsv', String(Math.round(toUnit(kmh)))); tx('fsu', unitName());
  const alt = Math.max(0, P.y - S.cgY), agl = Math.max(0, P.agl || 0); tx('fav', String(Math.round(save.set.units === 'mph' ? alt * 3.281 : alt))); tx('fau', save.set.units === 'mph' ? 'FT' : 'M');
  tx('fvs', (P.vy >= 0 ? '+' : '') + (P.vy).toFixed(1)); tx('fag', 'AGL ' + Math.round(save.set.units === 'mph' ? agl * 3.281 : agl));
  const hd = Math.round(P.hdg || 0) % 360; tx('fhv', String(hd).padStart(3, '0')); tx('fhc', ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(hd / 45) % 8]);
  E.fthb.style.width = (P.thr * 100).toFixed(0) + '%'; E.fthr.classList.toggle('ab', P.ab > 0.02);
  const wn = Fly.warn || (P.gnd && Fly.canExit && P.thr < 0.05 ? '' : ''); if (E.fwn._w !== wn) { E.fwn._w = wn; E.fwn.textContent = wn; E.fwn.hidden = !wn; }
  const sp = E.fsp; sp.classList.toggle('lo', !S.heli && !S.blimp && !P.gnd && P.speed < S.Vs * 1.12 && P.agl > 6);
};
Fly.prompt = function (pr) {
  const P = Fly.p; let h = '';
  if (P && P.st === 'flying' && Fly.canExit && Fly.idle(P)) h = TouchIn.on ? '<em>EXIT</em> to get out' : '<em>F</em> Get out of the ' + esc(P.spec.name);
  if (h) { if (pr._h !== h) { pr._h = h; pr.innerHTML = h; } pr.hidden = false; } else if (!pr.hidden) pr.hidden = true;
};
const _fv = new THREE.Vector3();
Fly.overlay = function (g, w, h) {
  const P = Fly.p; if (!P || P.st === 'wreck' || !save.set.hud) return;
  /* flight path marker */
  const V = P.speed; if (V > 6 && Fly.view !== 2) {
    _fv.set(P.x + P.vx / V * 400, P.y + P.vy / V * 400, P.z + P.vz / V * 400).project(camera);
    if (_fv.z < 1 && Math.abs(_fv.x) < 1.1 && Math.abs(_fv.y) < 1.1) {
      const x = (_fv.x * 0.5 + 0.5) * w, y = (-_fv.y * 0.5 + 0.5) * h; g.save(); g.translate(x, y); g.strokeStyle = 'rgba(80,255,170,0.9)'; g.lineWidth = 2.2; g.beginPath(); g.arc(0, 0, 8, 0, TAU); g.moveTo(-18, 0); g.lineTo(-8, 0); g.moveTo(8, 0); g.lineTo(18, 0); g.moveTo(0, -8); g.lineTo(0, -15); g.stroke(); g.restore();
    }
  }
  /* attitude indicator */
  const r = Math.min(46, w * 0.09), cx = w / 2, cy = h - r - (TouchIn.on ? 20 : 26), pit = clamp(P.pitch, -1.2, 1.2), bk = P.bank;
  g.save(); g.translate(cx, cy); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip(); g.rotate(-bk); const off = pit * r * 1.7;
  g.fillStyle = '#4f86c6'; g.fillRect(-r * 2, -r * 3 + off, r * 4, r * 3); g.fillStyle = '#7a5a36'; g.fillRect(-r * 2, off, r * 4, r * 3);
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2; g.beginPath(); g.moveTo(-r, off); g.lineTo(r, off); g.stroke(); g.lineWidth = 1; for (const d of [-0.35, -0.175, 0.175, 0.35]) { g.beginPath(); g.moveTo(-r * 0.25, off - d * r * 1.7 * 2.9 / 2); g.lineTo(r * 0.25, off - d * r * 1.7 * 2.9 / 2); g.stroke(); }
  g.restore(); g.save(); g.translate(cx, cy); g.strokeStyle = 'rgba(10,14,20,0.8)'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); g.strokeStyle = '#ffb02e'; g.lineWidth = 3; g.beginPath(); g.moveTo(-r * 0.55, 0); g.lineTo(-r * 0.2, 0); g.lineTo(-r * 0.2, 5); g.moveTo(r * 0.55, 0); g.lineTo(r * 0.2, 0); g.lineTo(r * 0.2, 5); g.stroke(); g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(0, 0, 2.4, 0, TAU); g.fill(); g.restore();
};
