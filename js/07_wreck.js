/* ================= CRASH WRECKS AND PLANE RECOVERY =================
   A crashed aircraft no longer vanishes. It carries its impact velocity into a rigid-body slide and tumble along the ground (a dozen contact
   points with impulses, friction and a little bounce), sheds panels, wheels and blades, gouges and scorches the ground, and burns and smokes
   when it hit hard (a really fast one blows up). Once it has stopped, the flatbed from 07_tow.js is sent out: it drives in, swings round,
   backs up to the tail, hooks a cable and drags the wreck home behind it, to its own stand. R skips the lot. Water crashes float, sink and are
   salvaged instead. If anything fails the old "back at the stand after a moment" behaviour is used. */
const Wreck = { job: null, deb: [], dec: [], g: null, m: null, mc: new Map(), skipping: false };
const _wrkQ = new THREE.Quaternion(), _wrkR = new THREE.Vector3(), _wrkV = new THREE.Vector3(), _wrkU = new THREE.Vector3(), _wrkP = new THREE.Vector3(), _wrkL = new THREE.Vector3(), _wrkE = new THREE.Euler(0, 0, 0, 'YXZ');
const _wrkS = { x: 0, z: 0, tx: 0, tz: 1 }, _wrkC = { x: 0, z: 0, tx: 0, tz: 1 };
const wrkSm = (x) => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };

Wreck.res = function () {
  if (Wreck.g) return;
  const cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 10); cyl.rotateZ(Math.PI / 2);
  Wreck.g = { box: new THREE.BoxGeometry(1, 1, 1), cyl, dec: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2) };
  Wreck.m = {
    skid: new THREE.MeshBasicMaterial({ color: 0x0a0a0b, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }),
    burn: new THREE.MeshBasicMaterial({ color: 0x040404, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x17181b, roughness: 0.95 })
  };
};
Wreck.matFor = function (hex, charred) {
  const key = hex + (charred ? 'c' : ''); let m = Wreck.mc.get(key);
  if (!m) { const c = lc(hex); if (charred) c.multiplyScalar(0.28); m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.25, side: THREE.DoubleSide }); Wreck.mc.set(key, m); }
  return m;
};
/* a flat dark mark on the ground: skid gouges and the burnt patch. They stay after the wreck has gone (the oldest fade out of the list) */
Wreck.decal = function (mat, x, z, len, wid, yaw) {
  const m = new THREE.Mesh(Wreck.g.dec, mat); m.position.set(x, flyGround(x, z) + 0.05, z); m.rotation.y = yaw; m.scale.set(wid, 1, len); m.renderOrder = 1; m.frustumCulled = false; scene.add(m);
  Wreck.dec.push(m); while (Wreck.dec.length > 90) scene.remove(Wreck.dec.shift());
};

/* ---------- the crash itself ---------- */
Wreck.begin = function (P, imp) {
  try { return Wreck.begin2(P, imp); } catch (e) { console.error('wreck failed', e); P.wk = null; return false; }
};
Wreck.begin2 = function (P, imp) {
  Wreck.res(); const S = P.spec, sp = imp.sp, water = !!imp.water, solid = !!imp.solid, cy = S.cgY, L = S.len * 0.5, ty = S.topY || cy * 0.9, hw = Math.min(1.1, S.span * 0.12);
  const k = P.wk = { vx: imp.vx, vy: imp.vy, vz: imp.vz, wx: 0, wy: 0, wz: 0, t: 0, rest: 0, resting: false, water, sunk: false, contacts: 0, sp, burn: false, expl: 0, exploded: false, hit: 0, hitT: 0, snd: 0, lastX: P.x, lastZ: P.z,
    I: 0.08 * (S.len * S.len + S.span * S.span) + 1.5, sev: clamp((sp - 10) / 30, 0, 1), mats: null, ang: Math.random() * 6.28, dx: 0, dz: 1, pts: [], restH: 0 };
  _wrkV.set(0, 0, 1).applyQuaternion(P.q); let hx = Math.hypot(k.vx, k.vz) > 4 ? k.vx : _wrkV.x, hz = Math.hypot(k.vx, k.vz) > 4 ? k.vz : _wrkV.z; const hl = Math.hypot(hx, hz) || 1; k.dx = hx / hl; k.dz = hz / hl;
  k.pts = [[hw, -cy + 0.25, L * 0.7], [-hw, -cy + 0.25, L * 0.7], [hw, -cy + 0.25, -L * 0.7], [-hw, -cy + 0.25, -L * 0.7], [0, 0, L], [0, ty * 0.7, -L + 0.3], [0, -cy * 0.3, -L],
    [S.span * 0.5, 0.1, 0], [-S.span * 0.5, 0.1, 0], [hw * 0.7, ty, L * 0.2], [-hw * 0.7, ty, L * 0.2], [0, ty, -L * 0.4]];
  if (S.rotR) k.pts.push([S.rotR, 2.05, 0], [-S.rotR, 2.05, 0], [0, 2.05, S.rotR], [0, 2.05, -S.rotR]);
  if (water) { k.burn = false; k.vy = Math.min(k.vy, 0); return true; }
  if (solid) { k.vx *= 0.3; k.vz *= 0.3; k.vy = Math.min(0, k.vy) * 0.3; }
  /* what the tumble looks like depends on how hard and how it hit */
  const sw = Math.min(2.8, 0.03 * sp + (solid ? 0.8 : 0)), sgn = Math.random() < 0.5 ? -1 : 1;
  k.wx = (Math.random() - 0.35) * sw * 0.8; k.wz = sgn * (0.4 + Math.random() * 0.8) * sw; k.wy = (Math.random() - 0.5) * sw * 0.7;
  k.burn = sp > 24 || (sp > 14 && Math.random() < 0.4) || (solid && sp > 18); k.expl = sp > 42 && Math.random() < 0.8 ? 0.45 + Math.random() * 0.3 : 0;
  Wreck.shed(P, k, Math.round(3 + 14 * k.sev), sp); Wreck.char(P, k, k.burn ? 0.45 + 0.4 * k.sev : k.sev * 0.35);
  P.holder.visible = true; return true;
};
/* paint goes dark and the airframe crumples a little: the model's materials are cloned so other aircraft are unaffected */
Wreck.char = function (P, k, amt) {
  const root = P.holder.children[0]; if (!root) return; k.mats = [];
  if (amt > 0.03) root.traverse((o) => { if (o.isMesh && o.material && !Array.isArray(o.material) && o.material.color) { const m0 = o.material, m1 = m0.clone(); m1.color.multiplyScalar(1 - 0.72 * Math.min(1, amt)); k.mats.push([o, m0, m1]); o.material = m1; } });
  const sv = k.sev; root.scale.set(1 + sv * 0.05, 1 - sv * 0.16, 1 - sv * 0.1); root.rotation.z = (Math.random() - 0.5) * 0.16 * sv; root.rotation.x = (Math.random() - 0.5) * 0.07 * sv;
};
Wreck.unchar = function (P, k) {
  const root = P.holder.children[0]; if (k && k.mats) for (const [o, m0, m1] of k.mats) { o.material = m0; m1.dispose(); }
  if (root) { root.scale.set(1, 1, 1); root.rotation.set(0, 0, 0); } if (k) k.mats = null;
};
/* panels, wing chunks, wheels and blades flung off the airframe */
Wreck.shed = function (P, k, n, sp, boom) {
  const S = P.spec, L = Planes.liv[P.id], lv = (L && L[P.hue || 0]) || { a: 0xd8d8d8, b: 0xf0f0f0 }, ch = k.burn || boom;
  for (let i = 0; i < n; i++) {
    const r = Math.random(); let mesh, gk = 1, h = 0.1;
    if (S.blimp) { mesh = new THREE.Mesh(Wreck.g.box, Wreck.matFor(r < 0.6 ? 0xe8edf2 : lv.a, ch)); mesh.scale.set(2 + Math.random() * 3, 0.04, 2 + Math.random() * 3); gk = 0.25; }
    else if (r < 0.55) { mesh = new THREE.Mesh(Wreck.g.box, Wreck.matFor(Math.random() < 0.5 ? lv.a : lv.b, ch)); mesh.scale.set(0.6 + Math.random() * 1.6, 0.05, 0.5 + Math.random() * 1.2); }
    else if (r < 0.76) { mesh = new THREE.Mesh(Wreck.g.box, Wreck.matFor(lv.b, ch)); mesh.scale.set(Math.max(0.8, S.span * 0.13 * (0.6 + Math.random())), 0.1, 1.0 + Math.random() * 1.6); h = 0.12; }
    else if (r < 0.88) { mesh = new THREE.Mesh(Wreck.g.cyl, Wreck.m.tire); const d = 0.5 + Math.random() * 0.3; mesh.scale.set(0.25, d, d); h = d * 0.5; }
    else if (S.rotR) { mesh = new THREE.Mesh(Wreck.g.box, Wreck.m.tire); mesh.scale.set(3.6 + Math.random() * 1.5, 0.03, 0.28); }
    else { mesh = new THREE.Mesh(Wreck.g.box, Wreck.m.tire); mesh.scale.set(0.08, 0.9 + Math.random() * 0.6, 0.14); }
    _wrkR.set((Math.random() - 0.5) * S.span * 0.5, Math.random() * 0.8, (Math.random() - 0.5) * S.len * 0.7).applyQuaternion(P.q);
    mesh.position.set(P.x + _wrkR.x, P.y + _wrkR.y, P.z + _wrkR.z); mesh.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); mesh.castShadow = false; scene.add(mesh);
    const sc = 3 + sp * 0.3 + (boom ? 8 : 0);
    Wreck.deb.push({ m: mesh, vx: k.vx * 0.5 + (Math.random() - 0.5) * sc, vy: 2 + Math.random() * (3 + sp * 0.2 + (boom ? 9 : 0)), vz: k.vz * 0.5 + (Math.random() - 0.5) * sc, wx: (Math.random() - 0.5) * 12, wy: (Math.random() - 0.5) * 12, wz: (Math.random() - 0.5) * 12, h, gk, rest: false });
  }
  while (Wreck.deb.length > 70) { const d = Wreck.deb.shift(); scene.remove(d.m); }
};
Wreck.debris = function (dt) {
  const D = Wreck.deb;
  for (let i = 0; i < D.length; i++) {
    const d = D[i]; if (d.rest) continue; const m = d.m, p = m.position;
    d.vy -= G * d.gk * dt; const dr = Math.max(0, 1 - 0.25 * dt * (d.gk < 1 ? 4 : 1)); d.vx *= dr; d.vz *= dr;
    p.x += d.vx * dt; p.y += d.vy * dt; p.z += d.vz * dt; m.rotation.x += d.wx * dt; m.rotation.y += d.wy * dt; m.rotation.z += d.wz * dt;
    const gy = Math.max(flyGround(p.x, p.z), terrainHeight(p.x, p.z) < 0.2 ? 0.05 : -9) + d.h;
    if (p.y < gy) {
      p.y = gy;
      if (d.vy < -1.2) { d.vy *= -0.28; d.vx *= 0.7; d.vz *= 0.7; d.wx *= 0.6; d.wy *= 0.6; d.wz *= 0.6; } else { d.vy = 0; const f = Math.max(0, 1 - 5 * dt); d.vx *= f; d.vz *= f; d.wx *= f; d.wy *= f; d.wz *= f; if (d.vx * d.vx + d.vz * d.vz < 0.04 && Math.abs(d.wx) + Math.abs(d.wy) + Math.abs(d.wz) < 0.4) d.rest = true; }
    }
  }
};

/* ---------- rigid body: slide, tumble, bounce ---------- */
Wreck.sub = function (P, k, S, h) {
  const q = P.q, I = k.I; k.vy -= G * h;
  const dr = Math.exp(-0.04 * h * (1 + Math.hypot(k.vx, k.vz) * 0.03)); k.vx *= dr; k.vz *= dr; const wd = Math.exp(-0.22 * h); k.wx *= wd; k.wy *= wd; k.wz *= wd;
  P.x += k.vx * h; P.y += k.vy * h; P.z += k.vz * h;
  const wl = Math.hypot(k.wx, k.wy, k.wz); if (wl > 1e-6) { _wrkV.set(k.wx / wl, k.wy / wl, k.wz / wl); _wrkQ.setFromAxisAngle(_wrkV, wl * h); q.premultiply(_wrkQ).normalize(); }
  const mu = Air.paved(P.x, P.z) ? 0.36 : 0.6; let maxPen = 0, n = 0;
  for (let i = 0; i < k.pts.length; i++) {
    const Lp = k.pts[i]; _wrkR.set(Lp[0], Lp[1], Lp[2]).applyQuaternion(q);
    const pen = flyGround(P.x + _wrkR.x, P.z + _wrkR.z) - (P.y + _wrkR.y); if (pen <= 0.002) continue;
    n++; if (pen > maxPen) maxPen = pen;
    const rx = _wrkR.x, ry = _wrkR.y, rz = _wrkR.z, vpx = k.vx + k.wy * rz - k.wz * ry, vpy = k.vy + k.wz * rx - k.wx * rz, vpz = k.vz + k.wx * ry - k.wy * rx;
    if (vpy >= 0) continue;
    const den = 1 + (rx * rx + rz * rz) / I, e = vpy < -6 ? 0.2 : 0.05, jn = -(1 + e) * vpy / den;
    k.vy += jn; k.wx += -rz * jn / I; k.wz += rx * jn / I; if (jn > k.hit) k.hit = jn;
    const vt = Math.hypot(vpx, vpz);
    if (vt > 1e-4) {
      const tx = vpx / vt, tz = vpz / vt, rtx = ry * tz, rty = rz * tx - rx * tz, rtz = -ry * tx, dT = 1 + (rtx * rtx + rty * rty + rtz * rtz) / I, jt = Math.min(mu * jn, vt / dT);
      k.vx -= tx * jt; k.vz -= tz * jt; k.wx -= rtx * jt / I; k.wy -= rty * jt / I; k.wz -= rtz * jt / I;
    }
  }
  if (maxPen > 0) { P.y += Math.min(maxPen, 1.4) * 0.85; const dk = Math.exp(-(Math.hypot(k.vx, k.vz) < 3 ? 4 : 1.2) * h); k.wx *= dk; k.wy *= dk; k.wz *= dk; }
  k.contacts = n;
};
Wreck.step = function (P, dt) {
  const k = P.wk, S = P.spec; k.t += dt; Fly.focus.x = P.x; Fly.focus.y = P.y; Fly.focus.z = P.z;
  if (k.water) Wreck.stepWater(P, k, S, dt);
  else if (!k.resting) {
    const n = Math.min(12, Math.ceil(dt / 0.007)), h = n ? dt / n : 0; let hit = 0;
    let cmax = 0; for (let i = 0; i < n; i++) { Wreck.sub(P, k, S, h); if (k.hit > hit) hit = k.hit; k.hit = 0; if (k.contacts > cmax) cmax = k.contacts; }
    k.hit = hit; if (n) { k.contacts = cmax; k.cT = cmax > 0 ? 0 : (k.cT || 0) + dt; } const sp = Math.hypot(k.vx, k.vy, k.vz), wm = Math.hypot(k.wx, k.wy, k.wz); k.sp2 = sp;
    if (dt > 0) { if (sp < 0.7 && wm < 0.45 && (k.cT || 0) < 0.4) k.rest += dt; else k.rest = 0; }
    if (k.rest > 0.6 || k.t > 15) { k.resting = true; k.vx = k.vy = k.vz = k.wx = k.wy = k.wz = 0; Wreck.settled(P, k, S); }
  }
  Fly.place(P); Wreck.fx(P, k, S, dt); Wreck.debris(dt);
};
Wreck.settled = function (P, k, S) {
  k.restH = P.y - flyGround(P.x, P.z); k.q0 = P.q.clone();
  if (k.burn) { Wreck.decal(Wreck.m.burn, P.x, P.z, S.len * 0.85 + 3, S.span * 0.55 + 3, Math.atan2(k.dx, k.dz)); Wreck.decal(Wreck.m.burn, P.x + k.dx * 2, P.z + k.dz * 2, S.len * 0.4 + 2, S.span * 0.9 + 3, Math.atan2(k.dx, k.dz) + 0.5); }
};
Wreck.stepWater = function (P, k, S, dt) {
  const dr = Math.exp(-1.6 * dt); k.vx *= dr; k.vz *= dr; P.x += k.vx * dt; P.z += k.vz * dt;
  const sink = k.t < 2.5 ? 0 : (k.t - 2.5) * 0.7, tgt = 0.1 - S.cgY * 0.3 - sink;
  P.y += (tgt - P.y) * Math.min(1, dt * 2.5); if (k.t > 1) { _wrkQ.setFromAxisAngle(_wrkU.set(1, 0, 0), dt * 0.16); P.q.multiply(_wrkQ).normalize(); }
  if (k.t > 6.5 && !k.sunk) { k.sunk = true; P.holder.visible = false; }
  if (!k.sunk && Math.random() < dt * 22) emit(Part.smoke, P.x + (Math.random() - 0.5) * S.span * 0.4, 0.15, P.z + (Math.random() - 0.5) * S.len * 0.4, (Math.random() - 0.5) * 1.4, 0.8 + Math.random(), (Math.random() - 0.5) * 1.4, 1.1, 0.6, 2.2, 0.88, 0.94, 1, 0.5, 1.5);
};

/* ---------- smoke, fire, sparks, skid marks and noise ---------- */
Wreck.fx = function (P, k, S, dt) {
  if (dt <= 0) return; const t = k.t, rate = (r) => { const a = r * dt; return Math.floor(a) + (Math.random() < a % 1 ? 1 : 0); };
  if (k.water) return;
  /* secondary explosion */
  if (k.expl > 0) { k.expl -= dt; if (k.expl <= 0 && !k.exploded) Wreck.boom(P, k, S); }
  /* impacts: a thump and sparks each time it hits the ground hard */
  k.hitT -= dt; if (k.hit > 3 && k.hitT <= 0) { k.hitT = 0.18; sparks(P.x, P.y, P.z, Math.min(40, Math.round(k.hit * 3)), 4 + k.hit * 0.6); Snd.crash(Math.min(28, k.hit * 2.4)); Cam.shake = Math.max(Cam.shake, Math.min(2.4, k.hit * 0.22)); }
  /* scraping along the ground */
  const sp = k.resting ? 0 : Math.hypot(k.vx, k.vz);
  if (sp > 3 && k.contacts > 0) {
    const grass = !Air.paved(P.x, P.z);
    if (Math.random() < dt * Math.min(40, sp * 2.4)) emit(Part.smoke, P.x + (Math.random() - 0.5) * S.span * 0.3, flyGround(P.x, P.z) + 0.3, P.z + (Math.random() - 0.5) * S.len * 0.3, (Math.random() - 0.5) * 2, 0.8 + Math.random() * 1.2, (Math.random() - 0.5) * 2, 1.5, 0.9, 3.6, grass ? 0.5 : 0.7, grass ? 0.44 : 0.7, grass ? 0.32 : 0.7, 0.38, -0.1);
    if (sp > 8 && Math.random() < dt * 20) sparks(P.x + (Math.random() - 0.5) * S.span * 0.4, flyGround(P.x, P.z) + 0.2, P.z + (Math.random() - 0.5) * S.len * 0.3, 3, 4);
    k.snd -= dt; if (k.snd <= 0 && Snd.ok) { k.snd = 0.1; Snd.noiseHit(Snd.ctx.currentTime, 0.14, 0.08 + Math.min(0.25, sp * 0.006), 500, 3200, Snd.sfx); }
    const d = Math.hypot(P.x - k.lastX, P.z - k.lastZ);
    if (d > 1.7) { Wreck.decal(Wreck.m.skid, (P.x + k.lastX) / 2, (P.z + k.lastZ) / 2, d + 0.9, Math.max(1.1, S.span * 0.13) * (0.75 + Math.random() * 0.5), Math.atan2(P.x - k.lastX, P.z - k.lastZ)); k.lastX = P.x; k.lastZ = P.z; }
  }
  /* fire and smoke */
  const fi = k.burn ? (t < 55 ? 1 : Math.max(0, 1 - (t - 55) / 45)) : 0, sm = k.burn ? 0.7 + 0.3 * fi : Math.max(0, 1 - t / 14) * (0.2 + 0.8 * k.sev);
  for (let i = rate(26 * sm); i > 0; i--) {
    _wrkR.set((Math.random() - 0.5) * S.span * 0.2, 0.2 + Math.random() * 0.8, (Math.random() - 0.5) * S.len * 0.5).applyQuaternion(P.q);
    emit(Part.smoke, P.x + _wrkR.x, P.y + _wrkR.y, P.z + _wrkR.z, (Math.random() - 0.5) * 1.3 + 0.8, 2.2 + Math.random() * 2.2, (Math.random() - 0.5) * 1.3, 3.4 + Math.random() * 2, 1.7, 5.5, 0.05, 0.05, 0.055, 0.62, -0.2);
  }
  for (let i = rate(34 * fi); i > 0; i--) {
    _wrkR.set((Math.random() - 0.5) * S.span * 0.28, 0.1 + Math.random() * 0.7, (Math.random() - 0.5) * S.len * 0.5).applyQuaternion(P.q);
    emit(Part.spark, P.x + _wrkR.x, P.y + _wrkR.y, P.z + _wrkR.z, (Math.random() - 0.5) * 1.2, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 1.2, 0.5 + Math.random() * 0.4, 0.6 + Math.random() * 0.5, 1.0, 2.6, 1.1 + Math.random() * 0.3, 0.15, 0.55, -1.6);
  }
  if (fi > 0.3 && Math.random() < dt * 7) emit(Part.spark, P.x + (Math.random() - 0.5) * 3, P.y + 1, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 4 + Math.random() * 4, (Math.random() - 0.5) * 3, 1.3, 0.14, -0.06, 3, 1.4, 0.4, 1, 5);
};
Wreck.boom = function (P, k, S) {
  k.exploded = true; sparks(P.x, P.y + 1, P.z, 120, 30); Cam.shake = Math.max(Cam.shake, 4); Snd.crash(34); if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 1.1, 0.7, 0, 900, Snd.sfx);
  for (let i = 0; i < 38; i++) emit(Part.spark, P.x + (Math.random() - 0.5) * 3, P.y + Math.random() * 2, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 16, 3 + Math.random() * 11, (Math.random() - 0.5) * 16, 0.7 + Math.random() * 0.7, 1.1, 2.4, 2.8, 1.3, 0.25, 0.7, 3);
  for (let i = 0; i < 34; i++) emit(Part.smoke, P.x + (Math.random() - 0.5) * 3, P.y + Math.random() * 2, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 9, 3 + Math.random() * 8, (Math.random() - 0.5) * 9, 2.6 + Math.random() * 1.6, 2.4, 7, 0.04, 0.04, 0.045, 0.75, -0.2);
  Wreck.shed(P, k, 9, 40, true); if (k.mats) for (const [, , m1] of k.mats) m1.color.multiplyScalar(0.55); else Wreck.char(P, k, 0.9);
  k.vy += 2.5; k.wx += (Math.random() - 0.5) * 1.5; k.wz += (Math.random() - 0.5) * 1.5;
};

/* ---------- per frame while the aircraft is a wreck ---------- */
Wreck.tick = function (P, dt) {
  const k = P.wk; Wreck.step(P, dt); Pl.x = P.x; Pl.z = P.z; Pl.y = P.y; Pl.speed = 0; Cam.shake *= Math.max(0, 1 - dt * 2);
  let J = Wreck.job;
  if (!J && ((k.resting && k.t > 1) || (k.water && k.sunk))) { J = Wreck.job = { P, ph: 'wait', t: 0, v: 0, u: 0, sD: 0 }; }
  if (!J) return;
  J.t += dt; const ph = J.ph;
  try {
    if (ph === 'wait') { if (J.t > (k.water ? 0.8 : 2.4)) { if (k.water) Wreck.salvage(P, J); else Wreck.plan(P, J); } }
    else if (ph === 'salv') { if (J.t > 1.6) Wreck.finish(P); }
    else Wreck.run(P, J, dt);
  } catch (e) { console.error('plane recovery failed', e); Wreck.finish(P); }
};
Wreck.salvage = function (P, J) { J.ph = 'salv'; J.t = 0; UI.banner('SALVAGE', 'A recovery crew is hauling it out · R to skip'); UI.fade(true, 'SALVAGE', 'The ' + P.spec.name + ' is being hauled out of the water'); };

/* ---------- the tow: plan the route ---------- */
Wreck.poly = function (pts) { const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])); return { pts, cum, len: cum[cum.length - 1] }; };
Wreck.at = function (Pl, s, o) {
  const p = Pl.pts, c = Pl.cum; s = clamp(s, 0, Pl.len); let i = 1; while (i < p.length - 1 && c[i] < s) i++;
  const a = p[i - 1], b = p[i], l = (c[i] - c[i - 1]) || 1, t = (s - c[i - 1]) / l, dx = b[0] - a[0], dz = b[1] - a[1], dl = Math.hypot(dx, dz) || 1;
  o.x = a[0] + dx * t; o.z = a[1] + dz * t; o.tx = dx / dl; o.tz = dz / dl; return o;
};
Wreck.chaikin = function (p, it) {
  for (let n = 0; n < it; n++) { const o = [p[0]]; for (let i = 0; i < p.length - 1; i++) { const a = p[i], b = p[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(p[p.length - 1]); p = o; }
  return p;
};
Wreck.plan = function (P, J) {
  const k = P.wk, S = P.spec; Tow.build(); if (!Tow.g) throw new Error('no tow truck');
  if (Tow.on) throw new Error('truck busy');
  _wrkV.set(0, 0, 1).applyQuaternion(P.q); let fx = _wrkV.x, fz = _wrkV.z, fl = Math.hypot(fx, fz); if (fl < 0.4) { fx = k.dx; fz = k.dz; fl = Math.hypot(fx, fz) || 1; } fx /= fl; fz /= fl;
  const tx = -fx, tz = -fz, nx = tz, nz = -tx, W = [P.x, P.z], len = S.len, DL = 9.9, hookOff = len * 0.5 - 0.4;
  const H = P.home, fhx = Math.sin(H.yaw), fhz = Math.cos(H.yaw), R = Math.max(len, S.span) * 0.5 + 5;
  const TH = [W[0] + tx * hookOff, W[1] + tz * hookOff], FP = [TH[0] + tx * DL, TH[1] + tz * DL], PF = [FP[0] + tx * 10, FP[1] + tz * 10];
  /* where the truck comes from: the airfield's side of the wreck, unless that line cuts across it or ends in the sea */
  let ax = H.x - W[0], az = H.z - W[1], al = Math.hypot(ax, az); if (al < 1) { ax = nx; az = nz; al = 1; } ax /= al; az /= al;
  const lat = S.span * 0.5 + 6, d0 = clamp(al, 60, 100), cands = [[W[0] + ax * d0, W[1] + az * d0], [W[0] + nx * (R + 85) - tx * 20, W[1] + nz * (R + 85) - tz * 20], [W[0] - nx * (R + 85) - tx * 20, W[1] - nz * (R + 85) - tz * 20], [W[0] - tx * 60 + nx * 30, W[1] - tz * 60 + nz * 30]];
  let best = null;
  for (let ci = 0; ci < cands.length; ci++) {
    const S0 = cands[ci], side = ((S0[0] - W[0]) * nx + (S0[1] - W[1]) * nz) >= 0 ? 1 : -1, C2 = [PF[0] - tx * 8 + nx * side * lat, PF[1] - tz * 8 + nz * side * lat];
    const sx = C2[0] - S0[0], sz = C2[1] - S0[1], sl = sx * sx + sz * sz || 1, tt = clamp(((W[0] - S0[0]) * sx + (W[1] - S0[1]) * sz) / sl, 0, 1), dd = Math.hypot(S0[0] + sx * tt - W[0], S0[1] + sz * tt - W[1]);
    if (!best) best = { S0, side, C2 };
    if (dd > R + 3 && terrainHeight(S0[0], S0[1]) > 0.6) { best = { S0, side, C2 }; break; }
  }
  const S0 = best.S0, C2 = best.C2, C1 = [S0[0] + (C2[0] - S0[0]) * 0.4, S0[1] + (C2[1] - S0[1]) * 0.4], ap = [];
  for (let i = 0; i <= 28; i++) { const t = i / 28, u = 1 - t; ap.push([u * u * u * S0[0] + 3 * u * u * t * C1[0] + 3 * u * t * t * C2[0] + t * t * t * PF[0], u * u * u * S0[1] + 3 * u * u * t * C1[1] + 3 * u * t * t * C2[1] + t * t * t * PF[1]]); }
  /* the haul-out route: out along the tail, round, then a straight run-in to the stand so the wreck ends exactly on its marks */
  const Ltot = DL + hookOff, Home = [H.x, H.z], Tfin = [H.x - fhx * Ltot, H.z - fhz * Ltot], R1 = [H.x + fhx * 75, H.z + fhz * 75], R2 = [H.x + fhx * 32, H.z + fhz * 32];
  const run = [W, FP, [FP[0] + tx * 14, FP[1] + tz * 14]], dx = R1[0] - FP[0], dz = R1[1] - FP[1], dl = Math.hypot(dx, dz) || 1;
  if ((dx * tx + dz * tz) / dl < -0.2) { const sg = (dx * nx + dz * nz) >= 0 ? 1 : -1; run.push([FP[0] + tx * 24 + nx * sg * 16, FP[1] + tz * 24 + nz * sg * 16]); }
  run.push(R1, R2);
  J.ap = Wreck.poly(ap); J.dr = Wreck.poly(Wreck.chaikin(run, 3).concat([Home, Tfin])); J.t0 = [tx, tz]; J.n = [nx, nz]; J.side = best.side; J.FP = FP; J.PF = PF; J.TH = TH; J.Ltot = Ltot; J.R = R; J.W = W; J.yawT = Math.atan2(tx, tz);
  J.hook = [0, 0.3, -hookOff]; J.sD = Ltot; J.u = 0; J.v = 10; J.lapsed = false; J.ph = 'drive'; J.t = 0; J.honk = false; J.snd = 0; J.fade = false;
  k.q0 = P.q.clone(); k.restH = P.y - flyGround(P.x, P.z); Tow.g.visible = true; Tow.setBed(0, 0); Tow.cable.visible = false; Tow.hook.visible = false;
  Wreck.truckAt(J.ap, 0, 0); UI.banner('TOW TRUCK', 'On its way · R to skip');
};
Wreck.truckAt = function (path, s, yawOver, ov) {
  Wreck.at(path, s, _wrkS); let yaw = Math.atan2(_wrkS.tx, _wrkS.tz); if (ov !== undefined) yaw = yaw + angDiff(yaw, yawOver) * ov;
  placeVehicle(Tow.g, _wrkS.x, _wrkS.z, yaw, 4.3, 2.0);
};

/* ---------- the tow: drive, back up, hook, haul, drop ---------- */
Wreck.run = function (P, J, dt) {
  const ph = J.ph, S = P.spec, k = P.wk, near = Math.hypot(Tow.g.position.x - P.x, Tow.g.position.z - P.z), vol = clamp(1 - near / 220, 0.25, 1);
  if (ph === 'drive') {
    const A = J.ap, rem = A.len - J.u; if (!J.honk && J.t > 0.5) { J.honk = true; Snd.horn(); }
    const vt = rem > 0.2 ? Math.max(0.9, Math.min(21, Math.sqrt(2 * 5 * rem))) : 0; J.v += clamp(vt - J.v, -8 * dt, 4 * dt); const du = J.v * dt; J.u += du; Tow.roll(du);
    Wreck.truckAt(A, J.u, J.yawT, rem < 9 ? 1 - rem / 9 : undefined); Snd.towEngine(vol, J.v / 21);
    if (rem < 0.25 && J.v < 1.2) { J.ph = 'reverse'; J.t = 0; J.last = 0; Snd.hiss(); }
  } else if (ph === 'reverse') {
    const Lr = Math.hypot(J.PF[0] - J.FP[0], J.PF[1] - J.FP[1]), w = Math.min(1, J.t / 3.6), e = wrkSm(w);
    placeVehicle(Tow.g, J.PF[0] + (J.FP[0] - J.PF[0]) * e, J.PF[1] + (J.FP[1] - J.PF[1]) * e, J.yawT, 4.3, 2.0); Tow.roll(-(e - J.last) * Lr); J.last = e;
    J.snd += dt; if (J.snd > 0.55) { J.snd = 0; Snd.beep(1150, 0.15); } Snd.towEngine(vol * 0.8, 0.18 + 0.2 * w * (1 - w));
    if (w >= 1) { J.ph = 'hook'; J.t = 0; J.hooked = false; placeVehicle(Tow.g, J.FP[0], J.FP[1], J.yawT, 4.3, 2.0); Snd.hiss(); }
  } else if (ph === 'hook') {
    Snd.towEngine(vol * 0.5, 0.05); if (!J.hooked && J.t > 0.35) { J.hooked = true; Snd.clank(); Tow.cable.visible = true; Tow.hook.visible = true; }
    if (J.t > 1.5) { J.ph = 'drag'; J.t = 0; J.v = 0; }
  } else if (ph === 'drag') {
    const D = J.dr; J.v = Math.min(13, J.v + 3.2 * dt); const ds = J.v * dt; J.sD = Math.min(D.len, J.sD + ds); Tow.roll(ds);
    Wreck.truckAt(D, J.sD); Wreck.dragPose(P, J, S, k, dt); Snd.towEngine(vol, J.v / 13);
    J.snd += dt; if (J.snd > 0.1) { J.snd = 0; if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 0.1, 0.07, 500, 2600, Snd.sfx); }
    if (D.len - J.sD > 150 && J.sD - J.Ltot > 28 && !J.lapsed) { J.ph = 'lapse'; J.t = 0; UI.fade(true, 'TOW', 'Hauling the ' + S.name + ' back to the airfield'); }
    else if (J.sD >= D.len - 0.02) { J.ph = 'drop'; J.t = 0; Wreck.settle(P, J, S, k); Snd.hiss(); }
  } else if (ph === 'lapse') {
    if (J.t > 0.6) { J.sD = Math.max(J.sD, J.dr.len - 70); J.v = 9; J.lapsed = true; J.ph = 'drag'; J.t = 0; Wreck.truckAt(J.dr, J.sD); Wreck.dragPose(P, J, S, k, 0); Wreck.snap = true; UI.fade(false); }
  } else if (ph === 'drop') {
    Snd.towEngine(vol * 0.5, 0.05); if (J.t > 0.8 && Tow.cable.visible) { Tow.cable.visible = false; Tow.hook.visible = false; Snd.clank(); }
    if (J.t > 1.4) { J.ph = 'depart'; J.t = 0; J.v = 0; J.fwd = 0; Snd.horn(); }
  } else if (ph === 'depart') {
    J.v = Math.min(13, J.v + 3.3 * dt); const du = J.v * dt; J.fwd += du; Tow.roll(du); const D = J.dr;
    const Tf = D.pts[D.pts.length - 1], dx = -Math.sin(P.home.yaw), dz = -Math.cos(P.home.yaw); placeVehicle(Tow.g, Tf[0] + dx * J.fwd, Tf[1] + dz * J.fwd, Math.atan2(dx, dz), 4.3, 2.0);
    Snd.towEngine(vol, J.v / 13); if (J.t > 1.8 && !J.fade) { J.fade = true; UI.fade(true); } if (J.t > 2.6) Wreck.finish(P);
  }
  Wreck.cable(P, J); Tow.lights(dt);
};
/* the wreck rides behind the truck, nose first no more: it trails tail-first on the cable, righting itself over the first few metres */
Wreck.dragPose = function (P, J, S, k, dt) {
  const D = J.dr, sP = Math.max(0, J.sD - J.Ltot); Wreck.at(D, sP, _wrkC);
  const yaw = Math.atan2(-_wrkC.tx, -_wrkC.tz), a = wrkSm((sP) / 24), gy = flyGround(_wrkC.x, _wrkC.z);
  _wrkE.set(0, yaw, 0, 'YXZ'); _wrkQ.setFromEuler(_wrkE); P.q.copy(k.q0).slerp(_wrkQ, a);
  P.x = _wrkC.x; P.z = _wrkC.z; P.y = gy + k.restH + (S.cgY * 0.9 - k.restH) * a; Fly.place(P); Fly.focus.x = P.x; Fly.focus.y = P.y; Fly.focus.z = P.z; Pl.x = P.x; Pl.z = P.z; Pl.y = P.y;
  if (dt > 0 && J.v > 1.5) {
    if (Math.random() < dt * 18) sparks(P.x + (Math.random() - 0.5) * S.span * 0.3, gy + 0.25, P.z + (Math.random() - 0.5) * S.len * 0.3, 2, 3);
    if (Math.random() < dt * 14) emit(Part.smoke, P.x + (Math.random() - 0.5) * 3, gy + 0.3, P.z + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 1.5, 0.8 + Math.random(), (Math.random() - 0.5) * 1.5, 1.4, 0.8, 3, 0.52, 0.46, 0.34, 0.32, -0.1);
  }
};
/* lay the wreck exactly on its marks at the end of the run */
Wreck.settle = function (P, J, S, k) {
  const H = P.home; P.x = H.x; P.z = H.z; P.y = H.y; P.q.setFromAxisAngle(_Y, H.yaw); Fly.place(P);
};
Wreck.cable = function (P, J) {
  if (!Tow.cable.visible) return; Tow.g.updateMatrixWorld(true); Tow.winch.getWorldPosition(_wrkP);
  _wrkL.set(J.hook[0], J.hook[1], J.hook[2]).applyQuaternion(P.q).add(_wrkV.set(P.x, P.y, P.z)); const len = _wrkP.distanceTo(_wrkL);
  Tow.cable.position.copy(_wrkP); Tow.cable.lookAt(_wrkL); Tow.cable.scale.set(3, 3, Math.max(0.01, len)); Tow.hook.scale.setScalar(2.2); Tow.hook.position.copy(_wrkL);
};

/* ---------- end, skip, tidy up ---------- */
Wreck.cleanup = function (P) {
  const k = P && P.wk;
  if (k) Wreck.unchar(P, k);
  for (const d of Wreck.deb) scene.remove(d.m); Wreck.deb.length = 0;
  if (P) P.wk = null;
  if (Wreck.job) { Wreck.job = null; if (Tow.g) { Tow.cable.scale.set(1, 1, 1); Tow.hook.scale.setScalar(1); Tow.g.visible = false; Tow.cable.visible = false; Tow.hook.visible = false; } Snd.towEngine(0, 0); UI.fade(false); }
  Wreck.cam = null;
};
Wreck.finish = function (P) {
  Wreck.cleanup(P); Wreck.skipping = false;
  if (Fly.p === P && Fly.on) { Fly.leave(P); Fly.home(P); Fly.dropFoot(P); syncPl(); UI.flyMode(false); UI.footMode(true); UI.toast('The ' + P.spec.name + ' is back at its stand', 'info'); }
  Fly.billPlane(P);
  setTimeout(() => UI.fade(false), 250);
};
Wreck.skip = function () {
  const P = Fly.p; if (!P || !Fly.on || P.st !== 'wreck' || Wreck.skipping) return; Wreck.skipping = true; UI.fade(true);
  setTimeout(() => { Wreck.skipping = false; if (Fly.p === P && P.st === 'wreck') Wreck.finish(P); else UI.fade(false); }, 420);
};

/* ---------- camera: follows the slide, then films the tow ---------- */
Wreck.camera = function (P, dt) {
  const k = P.wk, S = P.spec, J = Wreck.job, cp = Wreck.cp || (Wreck.cp = new THREE.Vector3()), lp = Wreck.lp || (Wreck.lp = new THREE.Vector3());
  let wx, wy, wz, lx, ly, lz, fast = 3, ph = J ? J.ph : 'slide';
  const R = Math.max(S.len, S.span) * 0.5 + 6;
  if (!J || ph === 'wait' || ph === 'salv') {
    if (!k.resting && !k.water) {   /* behind and above, keeping the slide in frame */
      const d = Math.max(16, S.len * 0.9 + 9); wx = P.x - k.dx * d + k.dz * d * 0.35; wz = P.z - k.dz * d - k.dx * d * 0.35; wy = flyGround(wx, wz) + 9; lx = P.x; ly = P.y + 1; lz = P.z; fast = 5;
    } else {                        /* a slow circle round the wreck */
      const a = k.ang + k.t * 0.12, d = R + 13; wx = P.x + Math.cos(a) * d; wz = P.z + Math.sin(a) * d; wy = flyGround(wx, wz) + 9; lx = P.x; ly = P.y + 1.5; lz = P.z;
    }
  } else if (ph === 'drive') {
    const sd = -J.side; wx = J.W[0] + J.n[0] * sd * (R + 9); wz = J.W[1] + J.n[1] * sd * (R + 9); wy = flyGround(wx, wz) + 3.2; const g = Tow.g.position; lx = g.x; ly = g.y + 1.6; lz = g.z; fast = 6;
  } else if (ph === 'reverse' || ph === 'hook') {
    const g = Tow.g.position, mx = (g.x + J.TH[0]) / 2, mz = (g.z + J.TH[1]) / 2, sd = -J.side; wx = mx + J.n[0] * sd * 15; wz = mz + J.n[1] * sd * 15; wy = flyGround(wx, wz) + 4.2; lx = mx; ly = P.y + 0.8; lz = mz; fast = 2.6;
  } else {
    const g = Tow.g.position, mx = (g.x + P.x) / 2, mz = (g.z + P.z) / 2; Wreck.at(J.dr, J.sD, _wrkS); const sd = ph === 'depart' ? 1 : (J.camSide || (J.camSide = (Math.random() < 0.5 ? 1 : -1)));
    const d = Math.max(20, Math.hypot(g.x - P.x, g.z - P.z) * 0.8 + 12); wx = mx + _wrkS.tz * sd * d; wz = mz - _wrkS.tx * sd * d; wy = flyGround(wx, wz) + 5.5;
    if (ph === 'depart') { lx = g.x; ly = g.y + 1.3; lz = g.z; } else { lx = mx; ly = Math.max(P.y, g.y) + 1.2; lz = mz; } fast = 2.4;
  }
  wy = Math.max(wy, flyGround(wx, wz) + 1.6);
  if (!Wreck.cam) { Wreck.cam = true; cp.copy(camera.position); lp.set(lx, ly, lz); }
  if (Wreck.snap) { Wreck.snap = false; cp.set(wx, wy, wz); lp.set(lx, ly, lz); }
  cp.x += (wx - cp.x) * Math.min(1, dt * fast); cp.y += (wy - cp.y) * Math.min(1, dt * fast); cp.z += (wz - cp.z) * Math.min(1, dt * fast); lp.x += (lx - lp.x) * Math.min(1, dt * 6); lp.y += (ly - lp.y) * Math.min(1, dt * 6); lp.z += (lz - lp.z) * Math.min(1, dt * 6);
  camera.position.copy(cp); camera.lookAt(lp);
};
