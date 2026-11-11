/* ---------- car damage: dents that follow the hit, scraped paint, smoke and fire, and the explosion ----------
   The player's body meshes are subdivided once, then every vertex is re-placed from its pristine position whenever the damage list changes:
   each dent pushes metal inwards with a rippled, crumpled falloff; scuffs repaint patches with bare-metal streaks; a blown car is charred and sagged.
   Damage is tied to car.health: any repair (workshop, menu, mechanic, respawn after a tow) heals the dents in proportion. */
const Dmg = {
  M: [], grp: null, dm: null, dents: [], scuffs: [], hp: 100, dirty: false, tApply: 0, st: 'ok', blast: 0, char: 0, glassBroken: false, blowT: 0, fireOn: false, deb: [], scT: 0,
  pcol: -1, mo: null, vm: [1, 1, 1], crack: null, glassOrig: null, geo: null, pm: null, bm: null, fx0: 0,
};
function _dmH(i, j, k) { let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(k, 1274126177)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
function _dmN(x, y, z) {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), fx = x - i, fy = y - j, fz = z - k, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const a = _dmH(i, j, k), b = _dmH(i + 1, j, k), c = _dmH(i, j + 1, k), d = _dmH(i + 1, j + 1, k), e = _dmH(i, j, k + 1), f = _dmH(i + 1, j, k + 1), g = _dmH(i, j + 1, k + 1), h = _dmH(i + 1, j + 1, k + 1);
  const x1 = a + (b - a) * u, x2 = c + (d - c) * u, x3 = e + (f - e) * u, x4 = g + (h - g) * u, y1 = x1 + (x2 - x1) * v, y2 = x3 + (x4 - x3) * v; return y1 + (y2 - y1) * w;
}
const _dmSm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* split every triangle with an edge longer than minEdge into four (position, normal and colour interpolated) so that a dent has something to bend */
function _dmSub(geo, minEdge) {
  const P = geo.attributes.position.array, N = geo.attributes.normal.array, C = geo.attributes.color.array, nt = Math.floor(P.length / 9), me2 = minEdge * minEdge;
  const op = [], on = [], oc = [];
  const tri = (A, B, C) => { for (const q of [A, B, C]) { op.push(q[0], q[1], q[2]); on.push(q[3], q[4], q[5]); oc.push(q[6], q[7], q[8]); } };
  const V = (i) => [P[i * 3], P[i * 3 + 1], P[i * 3 + 2], N[i * 3], N[i * 3 + 1], N[i * 3 + 2], C[i * 3], C[i * 3 + 1], C[i * 3 + 2]];
  const mid = (A, B) => { const nx = A[3] + B[3], ny = A[4] + B[4], nz = A[5] + B[5], l = 1 / (Math.hypot(nx, ny, nz) || 1); return [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2, nx * l, ny * l, nz * l, (A[6] + B[6]) / 2, (A[7] + B[7]) / 2, (A[8] + B[8]) / 2]; };
  const ed = (A, B) => (A[0] - B[0]) * (A[0] - B[0]) + (A[1] - B[1]) * (A[1] - B[1]) + (A[2] - B[2]) * (A[2] - B[2]);
  for (let t = 0; t < nt; t++) {
    const A = V(t * 3), B = V(t * 3 + 1), Cc = V(t * 3 + 2);
    if (Math.max(ed(A, B), ed(B, Cc), ed(Cc, A)) < me2) { tri(A, B, Cc); continue; }
    const ab = mid(A, B), bc = mid(B, Cc), ca = mid(Cc, A);
    tri(A, ab, ca); tri(ab, B, bc); tri(ca, bc, Cc); tri(ab, bc, ca);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(op, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(on, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(oc, 3)); g.computeBoundingSphere();
  return g;
}

/* called whenever the player's car mesh is (re)built */
Dmg.attach = function (grp) {
  if (!grp || !grp.userData.dm) return;
  Dmg.detach();
  Dmg.grp = grp; Dmg.dm = grp.userData.dm; Dmg.M = [];
  for (const k of ['P', 'G', 'T', 'D', 'H', 'TL']) {
    const m = Dmg.dm[k]; if (!m || !m.geometry) continue;
    if (k === 'P' || k === 'G' || k === 'T' || k === 'D') { const old = m.geometry; m.geometry = _dmSub(old, 0.085); old.dispose(); }
    const g = m.geometry, a = g.attributes;
    Dmg.M.push({ k, mesh: m, o: new Float32Array(a.position.array), n0: new Float32Array(a.normal.array), c0: new Float32Array(a.color.array), mv: new Uint8Array(a.position.count) });
  }
  Dmg.glassOrig = Dmg.dm.G ? Dmg.dm.G.material : null; Dmg.pcol = -1; Dmg.dirty = true; Dmg.tApply = 0; Dmg.hp = car.health;
};
Dmg.detach = function () {
  if (Dmg.crack) { Dmg.crack.dispose(); Dmg.crack = null; }
  Dmg.M = []; Dmg.grp = null; Dmg.dm = null; Dmg.glassOrig = null;
};

/* ---------- registering damage ---------- */
Dmg.addDent = function (x, y, z, ix, iy, iz, depth, r, up) {
  for (const d of Dmg.dents) {
    if (Math.hypot(d.x - x, d.y - y, d.z - z) < 0.5 * Math.max(d.r, r)) {
      d.depth = Math.min(0.64, Math.max(d.depth, depth) + 0.45 * Math.min(d.depth, depth)); d.r = Math.min(1.35, Math.max(d.r, r) + 0.07); d.r2 = d.r * d.r;
      d.x += (x - d.x) * 0.3; d.y += (y - d.y) * 0.3; d.z += (z - d.z) * 0.3; d.up = Math.max(d.up, up); return d;
    }
  }
  if (Dmg.dents.length >= 14) { let k = 0; for (let i = 1; i < Dmg.dents.length; i++) if (Dmg.dents[i].depth < Dmg.dents[k].depth) k = i; Dmg.dents.splice(k, 1); }
  const d = { x, y, z, ix, iy, iz, depth, r, r2: r * r, up }; Dmg.dents.push(d); return d;
};
Dmg.addScuff = function (x, y, z, r, a, ax) {
  for (const s of Dmg.scuffs) if (Math.hypot(s.x - x, s.y - y, s.z - z) < 0.5 * Math.max(s.r, r)) { s.a = Math.min(1, Math.max(s.a, a) + 0.15); s.r = Math.min(1.8, Math.max(s.r, r)); s.x += (x - s.x) * 0.3; s.z += (z - s.z) * 0.3; return; }
  if (Dmg.scuffs.length >= 26) Dmg.scuffs.shift();
  Dmg.scuffs.push({ x, y, z, r, a, fx: ax === 'z' ? 12 : 2.2, fy: 12, fz: ax === 'z' ? 2.2 : 12 });
};
/* the contact point (world) → a point on the car's skin, and the direction the metal is pushed */
Dmg.skin = function (c, out) {
  const S = c.ext.userData.S, hl = S.hl, hw = S.hw, s = Math.sin(c.yaw), co = Math.cos(c.yaw), dx = c.cx - c.x, dz = c.cz - c.z;
  const lx = dx * co - dz * s, lz = dx * s + dz * co, ax = Math.abs(lx) / hw, az = Math.abs(lz) / hl;
  if (az > ax * 0.8) { const sg = lz < 0 ? -1 : 1; out.z = sg * hl * 0.97; out.x = clamp(lx, -hw * 0.92, hw * 0.92); out.iz = -sg; out.ix = ax > 0.7 ? (lx < 0 ? 0.3 : -0.3) : 0; out.front = true; }
  else { const sg = lx < 0 ? -1 : 1; out.x = sg * hw * 0.98; out.z = clamp(lz, -hl * 0.86, hl * 0.86); out.ix = -sg; out.iz = az > 0.6 ? (lz < 0 ? 0.3 : -0.3) : 0; out.front = false; }
  const l = Math.hypot(out.ix, out.iz) || 1; out.ix /= l; out.iz /= l; return out;
};
const _dmSk = { x: 0, z: 0, ix: 0, iz: 0, front: false };
Dmg.hit = function (c, v, dealt) {
  if (!Dmg.grp || c.ext !== Dmg.grp || devOn('god')) return;
  const k = Dmg.skin(c, _dmSk), sev = clamp(dealt / 30, 0.08, 1.25), y = 0.5 + Math.random() * 0.25 + (sev > 0.7 ? 0.1 : 0);
  const depth = 0.04 + 0.42 * sev, r = 0.36 + 0.5 * sev, up = k.front ? 0.28 * sev : 0.05 * sev;
  Dmg.addDent(k.x, y, k.z, k.ix, -0.1, k.iz, depth, r, up);
  Dmg.addScuff(k.x, y, k.z, r * 1.5 + 0.25, 0.55 + 0.45 * sev, k.front ? 'x' : 'z');
  if (sev > 0.5 || v > 8) Dmg.chips(c, k, sev, y);
  if (v > 11 || c.health < 45) { if (!Dmg.glassBroken && Dmg.dm && Dmg.dm.G) { Dmg.glassBroken = true; sparks(c.cx, c.y + 1.1, c.cz, 18, 6); } }
  Dmg.dirty = true; Dmg.tApply = Math.min(Dmg.tApply, 0.0);
};
/* sliding along a wall at speed: paint scrapes, no dent, no health */
Dmg.scrape = function (c) {
  if (!Dmg.grp || c.ext !== Dmg.grp || devOn('god') || App.time - Dmg.scT < 0.3) return; Dmg.scT = App.time;
  const k = Dmg.skin(c, _dmSk); Dmg.addScuff(k.x, 0.45 + Math.random() * 0.3, k.z, 0.5 + Math.random() * 0.3, 0.5, k.front ? 'x' : 'z'); Dmg.dirty = true;
  if (Math.random() < 0.7) sparks(c.cx, c.y + 0.5, c.cz, 5, 4);
};

/* ---------- loose bits: bumper chunks, mirror shards, panels ---------- */
Dmg.res = function () {
  if (Dmg.geo) return; Wreck.res(); Dmg.geo = Wreck.g.box;
  Dmg.pm = new THREE.MeshStandardMaterial({ color: 0xaa2222, roughness: 0.5, metalness: 0.3, side: THREE.DoubleSide }); Dmg.bm = new THREE.MeshStandardMaterial({ color: 0x131416, roughness: 0.85, metalness: 0.1, side: THREE.DoubleSide });
};
Dmg.chunk = function (x, y, z, vx, vy, vz, sx, sy, sz, burnt) {
  Dmg.res(); const m = new THREE.Mesh(Dmg.geo, burnt ? Dmg.bm : Dmg.pm); m.scale.set(sx, sy, sz); m.position.set(x, y, z); m.rotation.set(Math.random() * 6, Math.random() * 6, Math.random() * 6); m.castShadow = false; scene.add(m);
  Dmg.deb.push({ m, vx, vy, vz, wx: (Math.random() - 0.5) * 14, wy: (Math.random() - 0.5) * 14, wz: (Math.random() - 0.5) * 14, h: Math.min(sx, sy, sz) * 0.5, t: 0, rest: false });
  while (Dmg.deb.length > 44) { const d = Dmg.deb.shift(); scene.remove(d.m); }
};
Dmg.chips = function (c, k, sev, y) {
  Dmg.res(); if (Dmg.grp) Dmg.pm.color.copy(Dmg.grp.userData.paint.color);
  const s = Math.sin(c.yaw), co = Math.cos(c.yaw), wx = c.x + s * k.z + co * k.x, wz = c.z + co * k.z - s * k.x, n = sev > 0.9 ? 4 : sev > 0.5 ? 2 : 1;
  for (let i = 0; i < n; i++) Dmg.chunk(wx, c.y + y, wz, c.vx * 0.6 + (Math.random() - 0.5) * 6, 2 + Math.random() * 3.5, c.vz * 0.6 + (Math.random() - 0.5) * 6, 0.1 + Math.random() * 0.3, 0.03, 0.08 + Math.random() * 0.2, Math.random() < 0.3);
};
Dmg.debris = function (dt) {
  const D = Dmg.deb;
  for (let i = D.length - 1; i >= 0; i--) {
    const d = D[i], m = d.m, p = m.position; d.t += dt;
    if (d.t > 40) { scene.remove(m); D.splice(i, 1); continue; }
    if (d.rest) continue;
    d.vy -= 22 * dt; p.x += d.vx * dt; p.y += d.vy * dt; p.z += d.vz * dt; m.rotation.x += d.wx * dt; m.rotation.y += d.wy * dt; m.rotation.z += d.wz * dt;
    const gy = Math.max(terrainHeight(p.x, p.z), 0) + d.h;
    if (p.y < gy) { p.y = gy; if (d.vy < -1.5) { d.vy *= -0.3; d.vx *= 0.65; d.vz *= 0.65; d.wx *= 0.6; d.wy *= 0.6; d.wz *= 0.6; } else { d.vy = 0; const f = Math.max(0, 1 - 6 * dt); d.vx *= f; d.vz *= f; d.wx *= f; d.wy *= f; d.wz *= f; if (d.vx * d.vx + d.vz * d.vz < 0.05) d.rest = true; } }
  }
};

/* ---------- rebuild the vertex data from the damage list ---------- */
Dmg.apply = function () {
  const D = Dmg.dents, Sc = Dmg.scuffs, nD = D.length, nS = Sc.length, B = Dmg.blast, CH = Dmg.char, any = nD > 0 || nS > 0 || B > 0 || CH > 0, paint = Dmg.grp && Dmg.grp.userData.paint;
  if (paint) { const pc = paint.color; Dmg.vm[0] = clamp(0.42 / Math.max(pc.r, 0.012), 0.3, 40); Dmg.vm[1] = clamp(0.42 / Math.max(pc.g, 0.012), 0.3, 40); Dmg.vm[2] = clamp(0.44 / Math.max(pc.b, 0.012), 0.3, 40); Dmg.pcol = pc.getHex(); }
  const vm = Dmg.vm;
  /* a burnt shell loses its gloss: dull the paint finish while charred, put it back when repaired */
  if (paint) {
    if (CH > 0) { if (!Dmg.mo || Dmg.mo.m !== paint) Dmg.mo = { m: paint, cc: paint.clearcoat, ro: paint.roughness, ei: paint.envMapIntensity }; paint.clearcoat = Dmg.mo.cc * 0.12; paint.roughness = Math.max(Dmg.mo.ro, 0.88); paint.envMapIntensity = Dmg.mo.ei * 0.3; }
    else if (Dmg.mo) { if (Dmg.mo.m === paint) { paint.clearcoat = Dmg.mo.cc; paint.roughness = Dmg.mo.ro; paint.envMapIntensity = Dmg.mo.ei; } Dmg.mo = null; }
  }
  for (const e of Dmg.M) {
    const O = e.o, nv = O.length / 3, geo = e.mesh.geometry, A = geo.attributes, P = A.position.array, N = A.normal.array, Cc = A.color.array, isP = e.k === 'P', moving = e.mv;
    if (!any) { P.set(O); N.set(e.n0); Cc.set(e.c0); A.position.needsUpdate = A.normal.needsUpdate = A.color.needsUpdate = true; continue; }
    for (let i = 0; i < nv; i++) {
      const x = O[i * 3], y = O[i * 3 + 1], z = O[i * 3 + 2]; let ox = 0, oy = 0, oz = 0, nz = -1, grime = 0, sc = 0;
      for (let q = 0; q < nD; q++) {
        const d = D[q], ddx = x - d.x, ddy = (y - d.y) * 0.85, ddz = z - d.z, r2 = ddx * ddx + ddy * ddy + ddz * ddz; if (r2 >= d.r2) continue;
        const dist = Math.sqrt(r2), f = 1 - dist / d.r, w = f * f * (3 - 2 * f); if (nz < 0) nz = _dmN(x * 6.5, y * 6.5, z * 6.5);
        const ha = clamp((y - 0.16) / 0.3, 0.25, 1), k = d.depth * w * (0.62 + 0.8 * nz) * ha, rip = (Math.sin(dist * 21 + nz * 5) * 0.06 + Math.sin(ddx * 17 + ddz * 13 + nz * 4) * 0.05) * d.depth * w * ha;
        ox += d.ix * (k + rip); oy += d.iy * k + d.up * k * _dmSm(0.5, 0.8, y) * 1.6; oz += d.iz * (k + rip);
        const pull = 0.2 * w * Math.min(1, d.depth * 2.2); ox -= ddx * pull; oz -= ddz * pull;
        grime = Math.max(grime, w * Math.min(1, d.depth * 3.2));
      }
      for (let q = 0; q < nS; q++) {
        const s = Sc[q], ddx = x - s.x, ddy = y - s.y, ddz = z - s.z, r2 = ddx * ddx + ddy * ddy + ddz * ddz, rr = s.r * s.r; if (r2 >= rr) continue;
        const f = 1 - Math.sqrt(r2) / s.r, n2 = _dmN(x * s.fx + 3.1, y * s.fy + 1.7, z * s.fz + 5.3), m = f * s.a * (0.04 + 1.0 * _dmSm(0.52, 0.7, n2));
        if (m > sc) sc = m;
      }
      if (B > 0) {
        const nb = _dmN(x * 3.2 + 9, y * 3.2, z * 3.2) - 0.5, nb2 = _dmN(x * 9, y * 9 + 3, z * 9) - 0.5;
        oy -= B * 0.26 * _dmSm(0.75, 1.35, y); ox += Math.sign(x) * 0.035 * B * Math.min(1, Math.abs(x) * 2) + nb * 0.2 * B; oy += nb * 0.14 * B + nb2 * 0.06 * B + B * 0.12 * _dmSm(0.5, 0.75, y) * (z > 0.6 ? 1 : 0); oz += nb2 * 0.14 * B;
      }
      P[i * 3] = x + ox; P[i * 3 + 1] = y + oy; P[i * 3 + 2] = z + oz; moving[i] = (ox * ox + oy * oy + oz * oz) > 1e-6 ? 1 : 0;
      if (isP) {
        let r = e.c0[i * 3], g = e.c0[i * 3 + 1], b = e.c0[i * 3 + 2];
        if (sc > 0) { const a = Math.min(1, sc * 1.15); r += (vm[0] * (0.7 + 0.3 * grime) - r) * a; g += (vm[1] * (0.7 + 0.3 * grime) - g) * a; b += (vm[2] * (0.7 + 0.3 * grime) - b) * a; }
        if (grime > 0) { const k = 1 - 0.42 * grime; r *= k; g *= k; b *= k; }
        if (CH > 0) { const sn = _dmN(x * 5 + 2, y * 5, z * 5), cm = Math.min(0.96, CH * (0.72 + 0.75 * sn)), dk = 0.07 + 0.1 * sn; r += (vm[0] * dk - r) * cm; g += (vm[1] * dk - g) * cm; b += (vm[2] * dk - b) * cm; }
        Cc[i * 3] = r; Cc[i * 3 + 1] = g; Cc[i * 3 + 2] = b;
      }
    }
    /* faceted normals where the metal moved: blend the flat face normal into the original */
    N.set(e.n0);
    for (let t = 0; t < nv; t += 3) {
      if (!(moving[t] | moving[t + 1] | moving[t + 2])) continue;
      const ax = P[t * 3 + 3] - P[t * 3], ay = P[t * 3 + 4] - P[t * 3 + 1], az = P[t * 3 + 5] - P[t * 3 + 2], bx = P[t * 3 + 6] - P[t * 3], by = P[t * 3 + 7] - P[t * 3 + 1], bz = P[t * 3 + 8] - P[t * 3 + 2];
      let fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx; const fl = Math.hypot(fx, fy, fz); if (fl < 1e-9) continue; fx /= fl; fy /= fl; fz /= fl;
      const dot = fx * e.n0[t * 3] + fy * e.n0[t * 3 + 1] + fz * e.n0[t * 3 + 2], sg = dot < 0 ? -1 : 1;
      for (let j = 0; j < 3; j++) { const o = (t + j) * 3; const nx = e.n0[o] * 0.3 + fx * sg * 0.7, ny = e.n0[o + 1] * 0.3 + fy * sg * 0.7, nzz = e.n0[o + 2] * 0.3 + fz * sg * 0.7, l = 1 / (Math.hypot(nx, ny, nzz) || 1); N[o] = nx * l; N[o + 1] = ny * l; N[o + 2] = nzz * l; }
    }
    A.position.needsUpdate = A.normal.needsUpdate = A.color.needsUpdate = true; geo.computeBoundingSphere();
  }
  /* glass, lamps */
  const dm = Dmg.dm; if (!dm) return;
  let fSm = false, rSm = false; for (const d of D) if (d.depth > 0.2) { if (d.z > 1.2) fSm = true; else if (d.z < -1.2) rSm = true; }
  if (dm.H) dm.H.visible = !fSm && !Dmg.blast; if (dm.TL) dm.TL.visible = !rSm && !Dmg.blast;
  if (dm.G) {
    if (Dmg.blast > 0) dm.G.visible = false;
    else {
      dm.G.visible = true;
      if (Dmg.glassBroken) { if (!Dmg.crack) { Dmg.crack = new THREE.MeshStandardMaterial({ color: 0x8e9aa6, roughness: 0.32, metalness: 0.35, transparent: true, opacity: 0.62, envMapIntensity: 0.9, side: THREE.DoubleSide }); } if (dm.G.material !== Dmg.crack) dm.G.material = Dmg.crack; }
      else if (Dmg.glassOrig && dm.G.material !== Dmg.glassOrig) dm.G.material = Dmg.glassOrig;
    }
  }
};
Dmg.clear = function () {
  Dmg.dents.length = 0; Dmg.scuffs.length = 0; Dmg.blast = 0; Dmg.char = 0; Dmg.glassBroken = false; Dmg.st = 'ok'; Dmg.fireOn = false; Dmg.blowT = 0; Dmg.dirty = true; Dmg.tApply = 0;
  for (const d of Dmg.deb) scene.remove(d.m); Dmg.deb.length = 0;
};
/* a repair: the dents shrink with the health that comes back */
Dmg.heal = function (hp) {
  if (hp >= 99.5) { Dmg.clear(); return; }
  const f = clamp((100 - hp) / Math.max(1, 100 - Dmg.hp), 0, 1);
  for (const d of Dmg.dents) { d.depth *= f; d.r2 = d.r * d.r; } for (const s of Dmg.scuffs) s.a *= f;
  Dmg.dents = Dmg.dents.filter((d) => d.depth > 0.02); Dmg.scuffs = Dmg.scuffs.filter((s) => s.a > 0.06);
  if (Dmg.st === 'blown' && hp > 0) { Dmg.blast = 0; Dmg.char = 0; Dmg.st = 'ok'; }
  if (hp > 50) Dmg.glassBroken = false;
  Dmg.dirty = true; Dmg.tApply = 0;
};

/* ---------- flames, smoke, the explosion ---------- */
Dmg.flash = function () {
  const f = document.getElementById('flash'); if (!f) return; f.style.transition = 'none'; f.style.opacity = '0.9'; void f.offsetWidth; f.style.transition = 'opacity 1.1s ease-out'; f.style.opacity = '0';
};
Dmg.explode = function (c) {
  if (Dmg.st === 'blown') return; Dmg.st = 'blown'; Dmg.blowT = 0; Dmg.blast = 1; Dmg.char = 0.9; Dmg.glassBroken = true; Dmg.dirty = true; Dmg.tApply = 0; Dmg.fireOn = false;
  const x = c.x, y = c.y + 0.9, z = c.z, R = Math.random;
  for (let i = 0; i < 46; i++) emit(Part.spark, x + (R() - 0.5) * 2.4, y + R() * 1.2, z + (R() - 0.5) * 2.4, (R() - 0.5) * 11, 2 + R() * 10, (R() - 0.5) * 11, 0.5 + R() * 0.7, 2.6 + R() * 2.4, 3.6, 3.0, 1.2 + R() * 0.4, 0.2, 0.8, 1.2);
  for (let i = 0; i < 36; i++) emit(Part.smoke, x + (R() - 0.5) * 2.4, y + R() * 1.2, z + (R() - 0.5) * 2.4, (R() - 0.5) * 8, 3.5 + R() * 7, (R() - 0.5) * 8, 2.8 + R() * 2.2, 2.3 + R(), 7.5, 0.04, 0.04, 0.045, 0.78, -0.25);
  sparks(x, y, z, 110, 30); Cam.shake = Math.max(Cam.shake, 5); App.dmg = 1; Snd.crash(34); if (Snd.ok) Snd.noiseHit(Snd.ctx.currentTime, 1.3, 0.8, 0, 800, Snd.sfx);
  Dmg.flash(); Dmg.res(); Dmg.pm.color.copy(Dmg.grp ? Dmg.grp.userData.paint.color : Dmg.pm.color);
  const s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  for (let i = 0; i < 12; i++) {
    const a = R() * 6.283, sp = 6 + R() * 12, big = i < 5; Dmg.chunk(x + (R() - 0.5) * 2, y + R(), z + (R() - 0.5) * 2, Math.cos(a) * sp + c.vx * 0.4, 5 + R() * 11, Math.sin(a) * sp + c.vz * 0.4, big ? 0.5 + R() * 0.7 : 0.15 + R() * 0.3, 0.04, big ? 0.4 + R() * 0.6 : 0.1 + R() * 0.3, i % 3 === 2);
  }
  try { Wreck.res(); Wreck.decal(Wreck.m.burn, x, z, 7.5, 4.4, c.yaw); } catch (e) { /* ignore */ }
  void s; void co;
};
const _dmFx = { x: 0, y: 0, z: 0 };
Dmg.hood = function (c, ly, lz) { const s = Math.sin(c.yaw), co = Math.cos(c.yaw), hl = c.ext.userData.hl || 2.2; _dmFx.x = c.x + s * lz * hl; _dmFx.z = c.z + co * lz * hl; _dmFx.y = c.y + ly; return _dmFx; };
Dmg.fx = function (dt, c) {
  const R = Math.random, rate = (r) => { const a = r * dt; return Math.floor(a) + (R() < a % 1 ? 1 : 0); };
  if (Dmg.st === 'blown') {
    const t = Dmg.blowT, fi = t < 45 ? 1 : Math.max(0, 1 - (t - 45) / 40), sm = 0.45 + 0.55 * fi;
    for (let i = rate(18 * sm); i > 0; i--) emit(Part.smoke, c.x + (R() - 0.5) * 2.2, c.y + 0.9 + R() * 0.7, c.z + (R() - 0.5) * 3, (R() - 0.5) * 1.4 + 0.8, 2.4 + R() * 2.4, (R() - 0.5) * 1.4, 3.4 + R() * 2, 1.7, 5.5, 0.05, 0.05, 0.055, 0.6, -0.2);
    for (let i = rate(26 * fi); i > 0; i--) emit(Part.spark, c.x + (R() - 0.5) * 2, c.y + 0.5 + R() * 0.8, c.z + (R() - 0.5) * 3.2, (R() - 0.5) * 1.2, 1.6 + R() * 2.4, (R() - 0.5) * 1.2, 0.45 + R() * 0.4, 0.8 + R() * 0.7, 1.2, 2.6, 1.0 + R() * 0.4, 0.15, 0.55, -1.5);
    return;
  }
  const hp = c.health;
  if (hp < 22) {
    const f = clamp((22 - hp) / 22, 0, 1), P = Dmg.hood(c, 0.9, 0.52);
    for (let i = rate(10 + 30 * f); i > 0; i--) emit(Part.spark, P.x + (R() - 0.5) * 0.9, P.y + R() * 0.3, P.z + (R() - 0.5) * 0.9, c.vx * 0.6 + (R() - 0.5), 1.4 + R() * 2.2, c.vz * 0.6 + (R() - 0.5), 0.3 + R() * 0.3, 0.45 + R() * 0.5 * f, 0.9, 2.6, 1.0 + R() * 0.45, 0.15, 0.5, -1.4);
    for (let i = rate(14 + 18 * f); i > 0; i--) emit(Part.smoke, P.x + (R() - 0.5) * 0.8, P.y + 0.3, P.z + (R() - 0.5) * 0.8, c.vx * 0.5 + (R() - 0.5), 2 + R() * 1.6, c.vz * 0.5 + (R() - 0.5), 1.8 + R(), 0.8, 3.2, 0.04, 0.04, 0.045, 0.6, -0.3);
  } else {
    /* a smashed nose lets the steam out */
    let fd = 0; for (const d of Dmg.dents) if (d.z > 1.0 && d.depth > 0.18) fd = Math.max(fd, d.depth);
    if (fd > 0 && R() < dt * 14 * fd) { const P = Dmg.hood(c, 0.85, 0.5); emit(Part.smoke, P.x + (R() - 0.5) * 0.6, P.y, P.z + (R() - 0.5) * 0.6, c.vx * 0.6 + (R() - 0.5) * 0.6, 1.2 + R(), c.vz * 0.6 + (R() - 0.5) * 0.6, 1.5, 0.5, 2.4, 0.8, 0.8, 0.82, 0.38, -0.2); }
  }
};

/* ---------- per frame (play mode, after the physics step) ---------- */
Dmg.update = function (dt) {
  const c = car; if (!Dmg.grp || c.ext !== Dmg.grp) return;
  if (c.health > Dmg.hp + 0.01) Dmg.heal(c.health); Dmg.hp = c.health;
  Dmg.debris(dt);
  if (Dmg.st === 'blown') Dmg.blowT += dt;
  else if (c.health < 14 && c.health > 0 && !Race.on && !devOn('god') && c.wrecked <= 0 && App.mode === 'play') {
    /* the engine is burning: it will go up in a few seconds unless it gets repaired */
    if (!Dmg.fireOn) { Dmg.fireOn = true; UI.banner('ENGINE FIRE', 'Get clear, she is going to blow'); Snd.fail(); }
    c.health -= dt * (0.8 + 1.5 * (1 - c.health / 14)); Dmg.hp = c.health;
  } else if (c.health >= 14) Dmg.fireOn = false;
  if (!(Dmg.M.length)) return;
  Dmg.fx(dt, c);
  if (Dmg.pcol !== -1 && Dmg.grp.userData.paint.color.getHex() !== Dmg.pcol && (Dmg.dents.length || Dmg.scuffs.length)) Dmg.dirty = true;
  Dmg.tApply -= dt; if (Dmg.dirty && Dmg.tApply <= 0) { Dmg.dirty = false; Dmg.tApply = 0.12; Dmg.apply(); }
};
