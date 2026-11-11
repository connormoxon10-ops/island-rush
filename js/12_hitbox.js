/* ================= HITBOX VIEW (developer mode) =================
   Draws what the collision code actually uses, as see-through wireframe, so shapes can be checked by eye:
     green  tree trunks          cyan  tree crowns (aircraft only)     magenta  rocks (domes)
     yellow poles, tanks, props  red   buildings, roofs, overhangs     blue     your car, traffic
     white  your character       orange the plane's five test points
   Static shapes are built per chunk from ch.cols (see 04_solids.js) for the chunks around the player and rebuilt when a chunk's list changes;
   the moving shapes live in one small dynamic buffer. Turn on with Dev tab > Hitboxes, or Y. */

const HB = {
  root: new THREE.Group(), cache: new Map(), live: null, mat: null, added: false, n: 0, shown: 0,
  C: { trunk: [0.25, 1, 0.35], crown: [0.1, 0.85, 1], rock: [1, 0.3, 1], prop: [1, 0.85, 0.2], bld: [1, 0.3, 0.25], roof: [1, 0.55, 0.35], car: [0.45, 0.7, 1], foot: [1, 1, 1], plane: [1, 0.6, 0.1] }
};
const HB_CAP = 12000;

class HBLines {
  constructor() { this.p = []; this.c = []; }
  seg(x0, y0, z0, x1, y1, z1, k) { this.p.push(x0, y0, z0, x1, y1, z1); this.c.push(k[0], k[1], k[2], k[0], k[1], k[2]); }
  ring(x, y, z, r, k, n) {
    n = n || 14; let px = x + r, pz = z;
    for (let i = 1; i <= n; i++) { const a = i / n * TAU, qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r; this.seg(px, y, pz, qx, y, qz, k); px = qx; pz = qz; }
  }
  cyl(x, z, r, y0, y1, k) {
    const n = r < 0.6 ? 8 : r < 2 ? 12 : 18; this.ring(x, y0, z, r, k, n); this.ring(x, y1, z, r, k, n);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; this.seg(x + Math.cos(a) * r, y0, z + Math.sin(a) * r, x + Math.cos(a) * r, y1, z + Math.sin(a) * r, k); }
  }
  /* a dome: height falls as sqrt(1 - (d/r)^2); rings at set heights plus four profile curves */
  dome(x, z, r, y0, y1, k) {
    const h = y1 - y0, F = [0, 0.55, 0.85], n = r < 1.5 ? 10 : 16;
    for (const f of F) this.ring(x, y0 + h * f, z, r * Math.sqrt(1 - f * f), k, n);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); let px = x + ca * r, py = y0, pz = z + sa * r;
      for (const f of [0.55, 0.85, 1]) { const rr = r * Math.sqrt(1 - f * f), qx = x + ca * rr, qy = y0 + h * f, qz = z + sa * rr; this.seg(px, py, pz, qx, qy, qz, k); px = qx; py = qy; pz = qz; }
    }
  }
  /* a canopy: ellipsoid (radius rb at its middle) or a cone from rb at the bottom to rt at the top */
  crown(o, k) {
    const x = o[0], z = o[1], y0 = o[2], y1 = o[3], rb = o[4], rt = o[5], ell = o[6], h = y1 - y0;
    if (ell) {
      const F = [0.18, 0.5, 0.82]; for (const f of F) this.ring(x, y0 + h * f, z, rb * Math.sqrt(Math.max(0, 1 - (2 * f - 1) * (2 * f - 1))), k, 14);
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); let px = x, py = y0, pz = z;
        for (const f of [0.18, 0.5, 0.82, 1]) { const rr = rb * Math.sqrt(Math.max(0, 1 - (2 * f - 1) * (2 * f - 1))); const qx = x + ca * rr, qy = y0 + h * f, qz = z + sa * rr; this.seg(px, py, pz, qx, qy, qz, k); px = qx; py = qy; pz = qz; }
      }
    } else {
      this.ring(x, y0, z, rb, k, 14); this.ring(x, y0 + h * 0.5, z, (rb + rt) / 2, k, 12); if (rt > 0.05) this.ring(x, y1, z, rt, k, 10);
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a); this.seg(x + ca * rb, y0, z + sa * rb, x + ca * rt, y1, z + sa * rt, k); }
    }
  }
  /* a box [x0,z0,x1,z1,yt,yb,rise,axis,arch]: walls, and the roof ridge or arch when it has one */
  box(o, k, kr) {
    const x0 = o[0], z0 = o[1], x1 = o[2], z1 = o[3], yt = o[4], yb = o[5] === undefined ? yt - 6 : o[5], rise = o[6] || 0;
    this.seg(x0, yb, z0, x1, yb, z0, k); this.seg(x1, yb, z0, x1, yb, z1, k); this.seg(x1, yb, z1, x0, yb, z1, k); this.seg(x0, yb, z1, x0, yb, z0, k);
    this.seg(x0, yt, z0, x1, yt, z0, k); this.seg(x1, yt, z0, x1, yt, z1, k); this.seg(x1, yt, z1, x0, yt, z1, k); this.seg(x0, yt, z1, x0, yt, z0, k);
    this.seg(x0, yb, z0, x0, yt, z0, k); this.seg(x1, yb, z0, x1, yt, z0, k); this.seg(x1, yb, z1, x1, yt, z1, k); this.seg(x0, yb, z1, x0, yt, z1, k);
    if (!rise) return;
    const w = x1 - x0, d = z1 - z0, ax = o[7], alongX = ax === 1 ? true : ax === 2 ? false : w >= d, xm = (x0 + x1) / 2, zm = (z0 + z1) / 2, yr = yt + rise;
    if (alongX) {
      this.seg(x0, yr, zm, x1, yr, zm, kr);
      for (const x of [x0, x1]) {
        if (o[8]) { let pz = z0, py = yt; for (let i = 1; i <= 8; i++) { const a = Math.PI * i / 8, qz = zm - Math.cos(a) * d / 2, qy = yt + Math.sin(a) * rise; this.seg(x, py, pz, x, qy, qz, kr); pz = qz; py = qy; } }
        else { this.seg(x, yt, z0, x, yr, zm, kr); this.seg(x, yr, zm, x, yt, z1, kr); }
      }
    } else {
      this.seg(xm, yr, z0, xm, yr, z1, kr);
      for (const z of [z0, z1]) {
        if (o[8]) { let px = x0, py = yt; for (let i = 1; i <= 8; i++) { const a = Math.PI * i / 8, qx = xm - Math.cos(a) * w / 2, qy = yt + Math.sin(a) * rise; this.seg(px, py, z, qx, qy, z, kr); px = qx; py = qy; } }
        else { this.seg(x0, yt, z, xm, yr, z, kr); this.seg(xm, yr, z, x1, yt, z, kr); }
      }
    }
  }
  cross(x, y, z, s, k) { this.seg(x - s, y, z, x + s, y, z, k); this.seg(x, y - s, z, x, y + s, z, k); this.seg(x, y, z - s, x, y, z + s, k); }
}

function hbBuild(ch) {
  const L = new HBLines(), C = HB.C;
  for (const o of ch.cols.c) { if (o[5]) L.dome(o[0], o[1], o[2], o[3], o[4], C.rock); else L.cyl(o[0], o[1], o[2], o[3], o[4], o[6] === 0 ? C.trunk : C.prop); }
  for (const o of ch.cols.t) L.crown(o, C.crown);
  for (const o of ch.cols.b) L.box(o, C.bld, C.roof);
  return L;
}
function hbSig(ch) {
  const b = ch.cols.b; let s = ch.cols.c.length * 7 + b.length * 13 + ch.cols.t.length * 17;
  for (let i = 0; i < b.length; i++) if (b[i].h) s += b[i][0] * 0.37 + b[i][2] * 0.71 + b[i][1] * 0.13 + b[i][3] * 0.29;   /* garage display cars move */
  return s;
}
function hbMake(L) {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(L.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(L.c, 3));
  const m = new THREE.LineSegments(g, HB.mat); m.frustumCulled = false; m.renderOrder = 999; return m;
}
function hbFree(e) { HB.root.remove(e.mesh); e.mesh.geometry.dispose(); }

HB.init = function () {
  HB.mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false, fog: false, toneMapped: false });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(HB_CAP * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(HB_CAP * 3), 3).setUsage(THREE.DynamicDrawUsage));
  g.setDrawRange(0, 0); HB.live = new THREE.LineSegments(g, HB.mat); HB.live.frustumCulled = false; HB.live.renderOrder = 1000;
  HB.root.add(HB.live); HB.root.visible = false; HB.root.renderOrder = 999; scene.add(HB.root); HB.added = true; HB.scene = scene;
};
HB.clear = function () { for (const e of HB.cache.values()) hbFree(e); HB.cache.clear(); HB.n = 0; if (HB.live) HB.live.geometry.setDrawRange(0, 0); };

/* moving shapes: your car, traffic, your character, the plane's test points */
const _hbV = new THREE.Vector3();
function hbLive() {
  const g = HB.live.geometry, P = g.attributes.position.array, Cc = g.attributes.color.array, C = HB.C; let n = 0;
  const seg = (x0, y0, z0, x1, y1, z1, k) => { if (n + 2 > HB_CAP) return; let i = n * 3; P[i] = x0; P[i + 1] = y0; P[i + 2] = z0; P[i + 3] = x1; P[i + 4] = y1; P[i + 5] = z1; Cc[i] = Cc[i + 3] = k[0]; Cc[i + 1] = Cc[i + 4] = k[1]; Cc[i + 2] = Cc[i + 5] = k[2]; n += 2; };
  const ring = (x, y, z, r, k, m) => { let px = x + r, pz = z; for (let i = 1; i <= m; i++) { const a = i / m * TAU, qx = x + Math.cos(a) * r, qz = z + Math.sin(a) * r; seg(px, y, pz, qx, y, qz, k); px = qx; pz = qz; } };
  const cyl = (x, z, r, y0, y1, k, m) => { ring(x, y0, z, r, k, m); ring(x, y1, z, r, k, m); for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; seg(x + Math.cos(a) * r, y0, z + Math.sin(a) * r, x + Math.cos(a) * r, y1, z + Math.sin(a) * r, k); } };
  if (!Fly.on) {   /* the car's three circles, as collideStatic uses them (a walker bumps the same ones) */
    const c = car, s = Math.sin(c.yaw), co = Math.cos(c.yaw);
    for (let k = 0; k < 3; k++) cyl(c.x + s * CIRC[k][0], c.z + co * CIRC[k][0], CIRC[k][1], c.y, c.y + 1.5, C.car, 16);
  }
  const all = Dyn.list.concat(Dyn.extra);
  for (let i = 0; i < all.length; i++) {
    const d = all[i]; if (!d || (d.x - Pl.x) * (d.x - Pl.x) + (d.z - Pl.z) * (d.z - Pl.z) > 14400) continue;
    const ds = Math.sin(d.yaw), dc = Math.cos(d.yaw);
    for (let m = 0; m < 3; m++) ring(d.x + ds * _cs[m], d.y + 0.6, d.z + dc * _cs[m], 0.95, C.car, 10);
  }
  if (Foot.on) cyl(Foot.x, Foot.z, FR, Foot.y, Foot.y + 1.8, C.foot, 12);
  if (Fly.on && Fly.p) {
    const P0 = Fly.p, S = P0.spec;
    for (let i = 0; i < 5; i++) {
      _hbV.set(i === 3 ? S.span * 0.5 : i === 4 ? -S.span * 0.5 : 0, i < 1 ? 0 : i < 3 ? 0.2 : 0.6, i === 1 ? S.len * 0.5 : i === 2 ? -S.len * 0.5 : 0).applyQuaternion(P0.q);
      const x = P0.x + _hbV.x, y = P0.y + _hbV.y, z = P0.z + _hbV.z, s = 0.5;
      seg(x - s, y, z, x + s, y, z, C.plane); seg(x, y - s, z, x, y + s, z, C.plane); seg(x, y, z - s, x, y, z + s, C.plane); ring(x, y, z, 0.5, C.plane, 8);
    }
  }
  if (Boat.inited) for (const B0 of Boat.all) {   /* boats: the hull outline test points the sea collision uses */
    if ((B0.x - Pl.x) * (B0.x - Pl.x) + (B0.z - Pl.z) * (B0.z - Pl.z) > 14400) continue;
    for (const pt of B0.spec.pts) { const x = B0.x + pt[0] * B0.cy + pt[1] * B0.sy, z = B0.z - pt[0] * B0.sy + pt[1] * B0.cy, y = B0.y + 0.3; seg(x - 0.35, y, z, x + 0.35, y, z, C.plane); seg(x, y, z - 0.35, x, y, z + 0.35, C.plane); ring(x, y, z, 0.35, C.plane, 8); }
  }
  g.setDrawRange(0, n); g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true;
}

HB.update = function () {
  if (!HB.added) { if (!scene) return; HB.init(); }
  const on = devOn('hbox') && (App.mode === 'play' || App.mode === 'pause');
  if (!on) { if (HB.root.visible) { HB.root.visible = false; HB.clear(); } return; }
  HB.root.visible = true;
  const fx = devOn('free') ? Dev.fx : Pl.x, fz = devOn('free') ? Dev.fz : Pl.z, ccx = Math.floor(fx / CHUNK), ccz = Math.floor(fz / CHUNK), R = Fly.on || devOn('free') ? 2 : 1;
  let built = 0;
  for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
    const ch = Chunks.get(ccx + dx, ccz + dz); if (!ch) continue; const key = ckey(ch.cx, ch.cz), sig = hbSig(ch), e = HB.cache.get(key);
    if (e && e.sig === sig && e.ch === ch) continue; if (built >= 3) continue; built++;
    if (e) hbFree(e); const mesh = hbMake(hbBuild(ch)); HB.root.add(mesh); HB.cache.set(key, { mesh, sig, ch });
  }
  for (const [key, e] of HB.cache) { const ch = e.ch; if (Chunks.map.get(key) !== ch || Math.abs(ch.cx - ccx) > R + 1 || Math.abs(ch.cz - ccz) > R + 1) { hbFree(e); HB.cache.delete(key); } }
  HB.n = HB.cache.size; hbLive();
};
