/* ================= TOW TRUCK =================
   Wreck the car (health 0) and a flatbed wrecker comes for it. Once the car has stopped, the truck drives in along the road, swings past,
   reverses up to the car's nose, slides and tips its bed, winches the car aboard on a cable, levels the bed and drives off with it.
   A tow-cam takes over while you watch; then the car is repaired and put back on the road for a fee. R skips the whole thing (free).
   If anything goes wrong building the truck the old "repaired after three seconds" behaviour is used instead. */
const Tow = { on: false, phase: 'off', t: 0, g: null, pivot: null, slide: null, slot: null, winch: null, wheels: [], cable: null, path: null, u: 0, v: 0, fade: 0, snd: 0 };
const _tg = { h: 0, mu: 1, rr: 0, rough: 0, road: false, water: false }, _tq = {}, _trp = {};
const _tv1 = new THREE.Vector3(), _tv2 = new THREE.Vector3(), _tq1 = new THREE.Quaternion(), _tq2 = new THREE.Quaternion(), _te = new THREE.Euler(0, 0, 0, 'YXZ'), _tqi = new THREE.Quaternion();
const tsm = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

/* sit a vehicle group on the ground: height from the terrain under its axles, pitch and roll to match */
function placeVehicle(g, x, z, yaw, wb, tw) {
  const s = Math.sin(yaw), c = Math.cos(yaw), h = (px, pz) => { groundAt(px, pz, _tg); return _tg.h; };
  const hf = h(x + s * wb / 2, z + c * wb / 2), hr = h(x - s * wb / 2, z - c * wb / 2), hl = h(x - c * tw / 2, z + s * tw / 2), hrr = h(x + c * tw / 2, z - s * tw / 2);
  g.position.set(x, (hf + hr + hl + hrr) / 4 + 0.02, z); g.rotation.set(-Math.atan2(hf - hr, wb), yaw, Math.atan2(hrr - hl, tw), 'YXZ');
}

/* ---------- the truck model ---------- */
Tow.build = function () {
  if (Tow.g) return;
  const col = (hex) => { const c = lc(hex); return [c.r, c.g, c.b]; }, Y = col(0xe0a21a), W = col(0xe6e6e1), D = col(0x181a1f), ST = col(0x474c55), RD = col(0xb32a22);
  const mP = Env.reg(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0.15, envMapIntensity: 0.5 }));
  const bx = (G, c, x0, y0, z0, x1, y1, z1) => G.box(x0, y0, z0, x1, y1, z1, c[0], c[1], c[2]);
  const gP = new GB(0, 0, false), gT = new GB(0, 0, false), gG = new GB(0, 0, false), bP = new GB(0, 0, false), bT = new GB(0, 0, false);
  /* chassis + cab-over cab */
  bx(gT, D, -0.55, 0.62, -4.2, 0.55, 0.9, 3.9); bx(gT, D, -0.95, 0.88, -4.0, 0.95, 1.0, 1.75);
  bx(gT, D, -0.97, 0.62, 2.0, 0.97, 1.0, 3.65);                          /* dark wheel wells under the cab */
  bx(gP, Y, -1.1, 0.98, 1.95, 1.1, 1.52, 3.7); bx(gP, Y, -1.06, 1.52, 2.05, 1.06, 2.3, 3.5); bx(gP, W, -1.065, 2.3, 2.05, 1.065, 2.35, 3.5);
  bx(gP, W, -1.105, 1.2, 2.0, 1.105, 1.28, 3.7);                         /* white belt line */
  bx(gT, D, -1.14, 0.42, 3.62, 1.14, 0.8, 3.96); bx(gT, ST, -0.8, 0.95, 3.7, 0.8, 1.38, 3.735);
  bx(gG, D, -0.95, 1.58, 3.495, 0.95, 2.22, 3.52);                       /* windscreen */
  for (const sx of [-1, 1]) { bx(gG, D, Math.min(sx * 1.098, sx * 1.114), 1.58, 2.2, Math.max(sx * 1.098, sx * 1.114), 2.22, 3.4); bx(gT, D, Math.min(sx * 1.17, sx * 1.3), 1.72, 3.38, Math.max(sx * 1.17, sx * 1.3), 1.95, 3.5); bx(gT, D, Math.min(sx * 1.1, sx * 1.2), 1.8, 3.4, Math.max(sx * 1.1, sx * 1.2), 1.84, 3.44); }
  bx(gT, D, -0.62, 2.35, 2.45, 0.62, 2.41, 2.9);                         /* beacon bar base */
  /* bed (slides and tips about the pivot): z is relative to the pivot, deck top is y = 0 */
  bx(bT, ST, -1.2, -0.16, -2.2, 1.2, 0, 3.4);
  for (let z = -2.0; z < 3.0; z += 0.5) bx(bT, D, -1.2, 0, z, 1.2, 0.014, z + 0.08);
  for (const sx of [-1, 1]) bx(bP, Y, Math.min(sx * 1.2, sx * 1.27), -0.2, -2.2, Math.max(sx * 1.2, sx * 1.27), 0.1, 3.4);
  bx(bT, D, -1.2, 0, 3.2, 1.2, 1.05, 3.4); for (let k = 0; k < 6; k++) bx(bT, ST, -0.9 + k * 0.36, 0.25, 3.14, -0.9 + k * 0.36 + 0.05, 1.0, 3.2);
  bx(bT, ST, -0.45, 0.12, 2.85, 0.45, 0.34, 3.15);                       /* winch drum */
  bx(bP, Y, -1.27, -0.2, -2.24, 1.27, -0.04, -2.2);
  const mesh = (G, m, cast) => { const o = G.mesh(m, cast, true); return o; };
  const g = new THREE.Group(); g.add(mesh(gP, mP, true), mesh(gT, MAT.carTrim, true), mesh(gG, MAT.carGlass, false));
  const pivot = new THREE.Group(); pivot.position.set(0, 1.08, -1.7); const slide = new THREE.Group(); pivot.add(slide); slide.add(mesh(bP, mP, true), mesh(bT, MAT.carTrim, true)); g.add(pivot);
  const slot = new THREE.Object3D(); slide.add(slot); const winch = new THREE.Object3D(); winch.position.set(0, 0.34, 3.0); slide.add(winch);
  /* lamps */
  for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.04), MAT.carHead); h.position.set(sx * 0.78, 1.08, 3.7); g.add(h); const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.03), MAT.carTail); t.position.set(sx * 1.0, -0.06, -2.215); slide.add(t); }
  const mA = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.9, 0.15) }), mB = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 1.9, 0.15) });
  const lamp = (m, x, y, z, parent) => { const o = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.28), m); o.position.set(x, y, z); parent.add(o); return o; };
  lamp(mA, -0.4, 2.47, 2.67, g); lamp(mB, 0.4, 2.47, 2.67, g);
  const spr = (x, y, z, parent, sc) => { const m = new THREE.SpriteMaterial({ map: MAT.glow, color: 0xffa51e, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }), s = new THREE.Sprite(m); s.position.set(x, y, z); s.scale.setScalar(sc || 3.2); parent.add(s); return s; };
  const sA = spr(-0.4, 2.6, 2.67, g), sB = spr(0.4, 2.6, 2.67, g), sC = spr(-1.0, 0.3, -2.6, slide, 1.5), sD = spr(1.0, 0.3, -2.6, slide, 1.5);
  /* "TOW" on the doors */
  { const cv = mkCanvas(256, 128), x = cv.getContext('2d'); x.fillStyle = '#15171b'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = '800 80px Rajdhani, Arial Black, sans-serif'; x.fillText('TOW', 128, 50); x.font = '700 30px Rajdhani, Arial, sans-serif'; x.fillText('24 HOUR', 128, 104);
    const tex = new THREE.CanvasTexture(cv); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
    for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.65), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); m.position.set(sx * 1.112, 1.4, 2.8); m.rotation.y = sx * Math.PI / 2; g.add(m); } }
  /* wheels (spun by distance travelled) */
  const tireM = new THREE.MeshStandardMaterial({ color: lc(0x101114), roughness: 0.92 }), rimM = Env.reg(new THREE.MeshStandardMaterial({ color: lc(0x9aa0a8), roughness: 0.35, metalness: 0.8, envMapIntensity: 1 }));
  const tireG = new THREE.CylinderGeometry(0.47, 0.47, 0.3, 20); tireG.rotateZ(Math.PI / 2); const rimG = new THREE.CylinderGeometry(0.28, 0.28, 0.32, 14); rimG.rotateZ(Math.PI / 2); const barG = new THREE.BoxGeometry(0.34, 0.1, 0.5);
  Tow.wheels = [];
  for (const [x, z] of [[-1.0, 2.75], [1.0, 2.75], [-1.12, -1.55], [1.12, -1.55], [-0.78, -1.55], [0.78, -1.55]]) {
    const w = new THREE.Group(); w.position.set(x, 0.47, z); w.add(new THREE.Mesh(tireG, tireM), new THREE.Mesh(rimG, rimM), new THREE.Mesh(barG, rimM)); w.children.forEach((o) => { o.castShadow = true; }); g.add(w); Tow.wheels.push(w);
  }
  g.traverse((o) => { o.frustumCulled = false; });
  const cable = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1).translate(0, 0, 0.5), new THREE.MeshBasicMaterial({ color: 0x25272c })); cable.visible = false; cable.frustumCulled = false;
  const hook = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.14), new THREE.MeshBasicMaterial({ color: 0x9a9fa6 })); hook.visible = false; hook.frustumCulled = false;
  g.visible = false; scene.add(g, cable, hook);
  Tow.g = g; Tow.pivot = pivot; Tow.slide = slide; Tow.slot = slot; Tow.winch = winch; Tow.cable = cable; Tow.hook = hook; Tow.beac = { mA, mB, sA, sB, sC, sD };
};
Tow.roll = function (d) { for (const w of Tow.wheels) w.rotation.x += d / 0.47; };
Tow.setBed = function (slideK, tiltK) { Tow.slide.position.z = -1.15 * slideK; Tow.pivot.rotation.x = -0.28 * tiltK; };

/* ---------- begin / plan ---------- */
Tow.begin = function () {
  if (Wreck.job) return false;
  try { Tow.build(); } catch (e) { console.error('tow truck build failed', e); return false; }
  Tow.on = true; Tow.phase = 'wait'; Tow.t = 0; Tow.cp = null; Tow.shot = ''; Tow.cam2 = null; Tow.g.visible = false; Tow.cable.visible = false; Tow.hook.visible = false; Tow.setBed(0, 0); Tow.sndT = 0; return true;
};
Tow.plan = function () {
  const c = car, f = [Math.sin(c.yaw), Math.cos(c.yaw)], r = [Math.cos(c.yaw), -Math.sin(c.yaw)];
  c.vx = c.vz = c.speed = 0; const hl = car.ext.userData.hl || 2.2, D = 4.94 + 0.4 + hl, L1 = 10;
  Tow.hl = hl; Tow.zEnd = 2.7 - hl; Tow.rest = { x: c.x, y: c.y, z: c.z, yaw: c.yaw, pitch: c.pitch, roll: c.roll }; Tow.f = f; Tow.r = r;
  Tow.FP = [c.x + f[0] * D, c.z + f[1] * D]; const sx = Tow.FP[0] + f[0] * L1, sz = Tow.FP[1] + f[1] * L1, pts = [];
  if (findNearestRoadPoint(sx, sz, _tq) && _tq.dist < 40) {
    const rd = roads[_tq.road], sg = (_tq.tx * f[0] + _tq.tz * f[1]) >= 0 ? 1 : -1, s1 = _tq.s; let s0 = clamp(s1 - sg * 80, 0, rd.len);
    if (Math.abs(s1 - s0) < 30) s0 = clamp(s1 + sg * 80, 0, rd.len);
    const n = Math.max(2, Math.ceil(Math.abs(s1 - s0) / 5)), dirS = s1 >= s0 ? 1 : -1;
    for (let k = 0; k <= n; k++) { roadPoint(rd, s0 + (s1 - s0) * k / n, _trp); let tx = _trp.tx * dirS, tz = _trp.tz * dirS; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l; pts.push([_trp.x + tz * 2.8, _trp.z - tx * 2.8]); }
  } else { pts.push([sx - f[0] * 60 + r[0] * 3, sz - f[1] * 60 + r[1] * 3], [sx + r[0] * 2, sz + r[1] * 2]); }
  const Lp = pts[pts.length - 1], lat = clamp((Lp[0] - sx) * r[0] + (Lp[1] - sz) * r[1], -4.5, 4.5), PF = [sx + r[0] * lat, sz + r[1] * lat];
  Tow.PF = PF; Tow.lat = lat; const dd = Math.hypot(PF[0] - Lp[0], PF[1] - Lp[1]);
  if (dd > 1.5) {
    const pa = pts[pts.length - 2] || [Lp[0] - f[0], Lp[1] - f[1]]; let tx = Lp[0] - pa[0], tz = Lp[1] - pa[1]; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const k = dd * 0.45 + 2, p1 = [Lp[0] + tx * k, Lp[1] + tz * k], p2 = [PF[0] - f[0] * k, PF[1] - f[1] * k];
    for (let i = 1; i <= 8; i++) { const t = i / 8, u = 1 - t; pts.push([u * u * u * Lp[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * PF[0], u * u * u * Lp[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * PF[1]]); }
  }
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  Tow.path = { pts, cum, len: cum[cum.length - 1] }; Tow.u = 0; Tow.v = 11; Tow.phase = 'drive'; Tow.t = 0; Tow.honk = false;
  const side = lat >= 0 ? -1 : 1; Tow.side = [r[0] * side, r[1] * side];
  Tow.g.visible = true; Tow.setBed(0, 0); Tow.pose(0);
};
/* position along the approach path (arc length u) */
Tow.pathAt = function (u, out) {
  const P = Tow.path, pts = P.pts; u = clamp(u, 0, P.len); let i = 1; while (i < pts.length - 1 && P.cum[i] < u) i++;
  const a = pts[i - 1], b = pts[i], l = P.cum[i] - P.cum[i - 1] || 1, t = (u - P.cum[i - 1]) / l; out.x = a[0] + (b[0] - a[0]) * t; out.z = a[1] + (b[1] - a[1]) * t; out.yaw = Math.atan2(b[0] - a[0], b[1] - a[1]); return out;
};
const _tp = { x: 0, z: 0, yaw: 0 };
Tow.pose = function (u) {
  const P = Tow.path; Tow.pathAt(u, _tp); let yaw = _tp.yaw;
  const rem = P.len - u; if (rem < 6) yaw = _tp.yaw + angDiff(_tp.yaw, car.yaw) * (1 - rem / 6);
  placeVehicle(Tow.g, _tp.x, _tp.z, yaw, 4.3, 2.0);
};

/* ---------- per step ---------- */
Tow.update = function (dt) {
  const c = car; Tow.t += dt; const ph = Tow.phase;
  if (ph === 'wait') {
    if ((Math.abs(c.speed) < 0.7 && !c.air && Tow.t > 0.8) || Tow.t > 5) Tow.plan(); return false;
  }
  /* the wreck stays exactly where it stopped until the winch takes it */
  if (ph === 'drive' || ph === 'reverse' || ph === 'hook') { const R = Tow.rest; c.x = R.x; c.y = R.y; c.z = R.z; c.yaw = R.yaw; c.pitch = R.pitch; c.roll = R.roll; c.vx = c.vz = c.speed = 0; c.w = 0; }
  const near = Math.hypot(Tow.g.position.x - Pl.x, Tow.g.position.z - Pl.z);
  if (ph === 'drive') {
    const P = Tow.path, rem = P.len - Tow.u; if (!Tow.honk && Tow.t > 0.5) { Tow.honk = true; Snd.horn(); }
    const vt = rem > 0.2 ? Math.max(0.9, Math.min(15, Math.sqrt(2 * 4.5 * rem))) : 0; Tow.v += clamp(vt - Tow.v, -8 * dt, 4 * dt); const du = Tow.v * dt; Tow.u += du; Tow.roll(du); Tow.pose(Tow.u);
    Snd.towEngine(clamp(1 - near / 220, 0, 1), Tow.v / 15);
    if (rem < 0.25 && Tow.v < 1.2) { Tow.phase = 'reverse'; Tow.t = 0; Tow.revLast = 0; Snd.hiss(); }
  } else if (ph === 'reverse') {
    const Lr = Math.hypot(Tow.PF[0] - Tow.FP[0], Tow.PF[1] - Tow.FP[1]), w = Math.min(1, Tow.t / 4.2), e = tsm(w), de = 6 * w * (1 - w);
    const x = Tow.PF[0] + (Tow.FP[0] - Tow.PF[0]) * e, z = Tow.PF[1] + (Tow.FP[1] - Tow.PF[1]) * e, yaw = car.yaw + Math.atan(Tow.lat * de / Math.max(4, Lr));
    placeVehicle(Tow.g, x, z, yaw, 4.3, 2.0); Tow.roll(-(e - Tow.revLast) * Lr); Tow.revLast = e;
    const b = Math.min(1, Tow.t / 3.0); Tow.setBed(tsm(b / 0.6), tsm((b - 0.4) / 0.6));
    Tow.snd += dt; if (Tow.snd > 0.55) { Tow.snd = 0; Snd.beep(1150, 0.15); }
    Snd.towEngine(clamp(1 - near / 220, 0, 1) * 0.8, 0.15 + 0.2 * de);
    if (w >= 1) { Tow.phase = 'hook'; Tow.t = 0; Tow.hooked = false; placeVehicle(Tow.g, Tow.FP[0], Tow.FP[1], car.yaw, 4.3, 2.0); Tow.setBed(1, 1); Snd.hiss(); }
  } else if (ph === 'hook') {
    Snd.towEngine(clamp(1 - near / 220, 0, 1) * 0.5, 0.05);
    if (!Tow.hooked && Tow.t > 0.35) { Tow.hooked = true; Snd.clank(); Tow.cable.visible = true; Tow.hook.visible = true; }
    if (Tow.t > 1.0) { Tow.startPull(); }
  } else if (ph === 'pull') {
    const Pt = 3.0, k = tsm(Tow.t / Pt); Tow.slotAt(k);
    Tow.snd += dt; if (Tow.snd > 0.11) { Tow.snd = 0; Snd.ratchet(); }
    Cam.shake = Math.max(Cam.shake, 0.12); Snd.towEngine(clamp(1 - near / 220, 0, 1) * 0.7, 0.35);
    if (Tow.t >= Pt) { Tow.phase = 'level'; Tow.t = 0; Snd.hiss(); }
  } else if (ph === 'level') {
    const b = 1 - Math.min(1, Tow.t / 1.8); Tow.setBed(tsm(b / 0.6), tsm((b - 0.4) / 0.6)); Tow.slotAt(1);
    Snd.towEngine(clamp(1 - near / 220, 0, 1) * 0.6, 0.12);
    if (Tow.t >= 1.8) { Tow.setBed(0, 0); Tow.phase = 'depart'; Tow.t = 0; Tow.v = 0; Tow.fwd = 0; Snd.horn(); }
  } else if (ph === 'depart') {
    Tow.v = Math.min(13, Tow.v + 3.3 * dt); const du = Tow.v * dt; Tow.fwd += du; Tow.roll(du);
    placeVehicle(Tow.g, Tow.FP[0] + Tow.f[0] * Tow.fwd, Tow.FP[1] + Tow.f[1] * Tow.fwd, car.yaw, 4.3, 2.0); Tow.slotAt(1);
    Snd.towEngine(clamp(1 - near / 220, 0, 1), Tow.v / 13);
    if (Tow.t > 2.2 && !Tow.fading) { Tow.fading = true; UI.fade(true); }
    if (Tow.t > 3.0) return true;
  }
  Tow.lights(dt);
  return false;
};
/* the car's place on the bed, in the sliding bed's own frame */
Tow.startPull = function () {
  const c = car, R = Tow.rest; Tow.phase = 'pull'; Tow.t = 0; Tow.fading = false; Tow.g.updateMatrixWorld(true);
  _tv1.set(R.x, R.y, R.z); Tow.slide.worldToLocal(_tv1); Tow.p0 = [_tv1.x, _tv1.y, _tv1.z];
  _te.set(-R.pitch, R.yaw, R.roll, 'YXZ'); _tq1.setFromEuler(_te); Tow.slide.getWorldQuaternion(_tq2); _tq2.invert(); Tow.q0 = _tq1.premultiply(_tq2).clone();
};
Tow.slotAt = function (k) {
  const p0 = Tow.p0, S = Tow.slot, y = p0[1] * Math.max(0, 1 - k / 0.45);
  S.position.set(lerp(p0[0], 0, k), y, lerp(p0[2], Tow.zEnd, k)); _tqi.identity(); S.quaternion.copy(Tow.q0).slerp(_tqi, k);
  Tow.g.updateMatrixWorld(true); S.matrixWorld.decompose(_tv1, _tq1, _tv2);
  const c = car; c.x = _tv1.x; c.y = _tv1.y; c.z = _tv1.z; _te.setFromQuaternion(_tq1, 'YXZ'); c.pitch = -_te.x; c.yaw = _te.y; c.roll = _te.z; c.vx = c.vz = c.speed = 0; c.w = 0; c.sY = c.sV = 0;
};
Tow.lights = function (dt) {
  const B = Tow.beac; Tow.fl = (Tow.fl || 0) + dt; const a = (Tow.fl % 0.5) < 0.25;
  B.mA.color.setRGB(a ? 3.4 : 0.35, a ? 1.9 : 0.2, a ? 0.15 : 0.02); B.mB.color.setRGB(a ? 0.35 : 3.4, a ? 0.2 : 1.9, a ? 0.02 : 0.15);
  B.sA.material.opacity = a ? 0.9 : 0; B.sB.material.opacity = a ? 0 : 0.9; B.sC.material.opacity = a ? 0.8 : 0; B.sD.material.opacity = a ? 0 : 0.8;
};
Tow.cleanup = function () {
  Tow.skipping = false; Tow.on = false; Tow.phase = 'off'; Tow.fading = false; if (Tow.g) { Tow.g.visible = false; Tow.cable.visible = false; Tow.hook.visible = false; }
};
Tow.repair = function () {
  const c = car, td = Rel.perk('tow'), fee = Math.min(Math.round(250 * (1 - td)), save.money); save.money -= fee; c.health = 100; App.respawn(false); UI.toast('Repaired' + (fee ? ' · fee ' + money(fee) : '') + (td > 0 ? ' · a friend covered ' + pcs(td) : ''), 'info');
};
/* the tow truck has dropped the car at the garage: pick the repair route (do the work, or pay the rush rate) */
Tow.mechanic = function () {
  const td = Rel.perk('tow'), base = Math.round(250 * (1 - td));
  const nm = (typeof CAR_BY_ID !== 'undefined' && CAR_BY_ID[save.car]) ? CAR_BY_ID[save.car].name : '';
  Mech.offer('car', base, () => { car.health = 100; App.respawn(false); }, { name: nm });
};
Tow.finish = function () { Tow.cleanup(); Tow.mechanic(); setTimeout(() => UI.fade(false), 250); };
Tow.abort = function () { Tow.cleanup(); UI.fade(false); };
/* R while wrecked: black out, then the same repair as the end of the tow */
Tow.skip = function () {
  if (Tow.skipping || App.mode !== 'play') return; Tow.skipping = true; Tow.fading = true; UI.fade(true);
  setTimeout(() => { Tow.skipping = false; if (car.wrecked > 0) Tow.finish(); else UI.fade(false); }, 420);
};

/* ---------- tow-cam (runs after the normal camera, every frame) ---------- */
const _tcc = new THREE.Vector3(), _tll = new THREE.Vector3();
/* a camera spot beside / behind the job that is not inside a building: first candidate whose line of sight to the job is clear */
Tow.pickCam = function (mx, mz) {
  const f = Tow.f, r = Tow.r, sd = Tow.side, list = [[sd[0], sd[1], 13, 3.6], [-sd[0], -sd[1], 13, 3.6], [-f[0], -f[1], 12, 3.4], [sd[0], sd[1], 8, 3.0], [-sd[0], -sd[1], 8, 3.0], [-f[0], -f[1], 7, 3.0], [f[0], f[1], 10, 3.4], [sd[0], sd[1], 5, 2.6]];
  for (const [dx, dz, d, h] of list) { let ok = true; for (let k = 1; k <= 10; k++) if (footBlockedAt(mx + dx * d * k / 10, mz + dz * d * k / 10)) { ok = false; break; } if (ok) return { dx, dz, d, h }; }
  return { dx: sd[0], dz: sd[1], d: 4, h: 5.5 };
};
Tow.camera = function (dt) {
  if (!Tow.on || Tow.phase === 'wait' || Tow.phase === 'off' || !Tow.g.visible) return;
  const c = car, ph = Tow.phase;
  if (ph === 'pull' || ph === 'level' || ph === 'depart') { car.body.position.set(c.x, c.y, c.z); car.body.rotation.set(-c.pitch, c.yaw, c.roll, 'YXZ'); car.body.updateMatrixWorld(true); }
  /* cable + hook: winch drum to the car's nose */
  if (Tow.cable.visible) {
    Tow.winch.getWorldPosition(_tv1); _tv2.set(0, 0.42, Tow.hl); car.body.localToWorld(_tv2); const len = _tv1.distanceTo(_tv2);
    Tow.cable.position.copy(_tv1); Tow.cable.lookAt(_tv2); Tow.cable.scale.z = Math.max(0.01, len); Tow.hook.position.copy(_tv2);
  }
  if (Foot.on || devOn('free')) return;
  Cockpit.group.visible = false; car.ext.visible = true;
  const R = Tow.rest, gp = Tow.g.position; let want, look;
  if (ph === 'drive') {
    _tcc.set(R.x - Tow.f[0] * 3.2 + Tow.side[0] * 5.8, 0, R.z - Tow.f[1] * 3.2 + Tow.side[1] * 5.8); _tcc.y = Math.max(R.y + 1.7, terrainHeight(_tcc.x, _tcc.z) + 1.5); want = _tcc; look = _tll.set(gp.x, gp.y + 1.6, gp.z);
  } else {
    const mx = (c.x + gp.x) / 2, mz = (c.z + gp.z) / 2;
    if (!Tow.cam2) Tow.cam2 = Tow.pickCam((R.x + Tow.FP[0]) / 2, (R.z + Tow.FP[1]) / 2);
    const K = Tow.cam2; _tcc.set(mx + K.dx * K.d, 0, mz + K.dz * K.d); _tcc.y = Math.max(c.y + K.h, terrainHeight(_tcc.x, _tcc.z) + 1.5); want = _tcc;
    look = ph === 'depart' ? _tll.set(gp.x, gp.y + 1.3, gp.z) : _tll.set(mx, Math.max(c.y, gp.y) + 0.9, mz);
  }
  if (!Tow.cp || Tow.shot !== (ph === 'drive' ? 'a' : 'b')) { if (!Tow.cp) { Tow.cp = new THREE.Vector3().copy(want); Tow.lp = new THREE.Vector3().copy(look); } Tow.shot = ph === 'drive' ? 'a' : 'b'; }
  const kp = Math.min(1, dt * (Tow.shot === 'a' ? 6 : 2.6)), kl = Math.min(1, dt * 6);
  Tow.cp.lerp(want, kp); Tow.lp.lerp(look, kl);
  camera.position.copy(Tow.cp); camera.lookAt(Tow.lp);
  const fov = 56; const af = camera.aspect < 1.33 ? Math.min(100, 2 * Math.atan(Math.tan(fov * DEG / 2) * 1.33 / camera.aspect) / DEG) : fov;
  if (Math.abs(camera.fov - af) > 0.05) { camera.fov = af; camera.updateProjectionMatrix(); }
};
