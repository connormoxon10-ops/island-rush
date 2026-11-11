/* ================= TRAFFIC + DYNAMIC OBSTACLES ================= */
const Dyn = { list: [], extra: [], spawnT: 0 };
const _rp = {}, _np = {};
const TRAFFIC_COL = [0xc9ccd1, 0x2a2f36, 0x8f1f1f, 0x2f5d9e, 0xd8d8d0, 0x3b6b4a, 0xb9892f, 0x6a6e75];

function placeDyn(d) {
  const r = d.road; roadPoint(r, d.s, _rp);
  let dx = _rp.tx * d.dir, dz = _rp.tz * d.dir; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
  const rx = dz, rz = -dx;
  d.x = _rp.x + rx * d.lane; d.z = _rp.z + rz * d.lane; d.y = _rp.h + 0.12;
  d.dx = dx; d.dz = dz; d.yaw = Math.atan2(dx, dz);
  const sg = r.pts[_rp.seg], sb = r.pts[Math.min(r.pts.length - 1, _rp.seg + 1)]; const sl = (sb.h - sg.h) / (r.cum[Math.min(r.cum.length - 1, _rp.seg + 1)] - r.cum[_rp.seg] || 1) * d.dir;
  d.pitch = Math.atan(sl); d.vx = dx * d.v; d.vz = dz * d.v;
  const m = d.mesh; m.position.set(d.x, d.y, d.z); m.rotation.set(-d.pitch, d.yaw, 0, 'YXZ'); m.userData.v = d.v; m.userData.brake = !!d.brake;
}
function spawnTrafficOne() {
  const c = Pl;
  for (let tries = 0; tries < 8; tries++) {
    const a = Math.random() * TAU, dist = 220 + Math.random() * 480;
    if (!findNearestRoadPoint(c.x + Math.cos(a) * dist, c.z + Math.sin(a) * dist, _np)) return false;
    const dd = Math.hypot(_np.x - c.x, _np.z - c.z);
    if (_np.dist > 120 || dd < 180 || dd > 760) continue;
    const r = roads[_np.road]; if (!r) continue;
    const hw = r.kind === 'hw';
    const d = { road: r, s: _np.s, dir: Math.random() < 0.5 ? 1 : -1, lane: 3.2, v: 0, vt: hw ? 20 + Math.random() * 14 : 8 + Math.random() * 5, stun: 0, kind: 'traffic', hitT: 0 };
    const vi = Math.random() < 0.55 ? 0 : Math.random() < 0.5 ? 1 : Math.random() < 0.7 ? 2 : 3;
    d.vi = vi; d.hex = trafficColorAt(_np.x, _np.z); d.mesh = buildCarMesh(d.hex, vi); d.hl = CAR_VARIANTS[vi].L / 2 - 0.5;
    d.v = d.vt; placeDyn(d); scene.add(d.mesh); Dyn.list.push(d); return true;
  }
  return false;
}
function removeDyn(d) { scene.remove(d.mesh); disposeCar(d.mesh); }
function updateTraffic(dt) {
  const c = car, pl = Pl;
  const want = Math.round(Q.traffic * (save.set.traffic === 'off' ? 0 : save.set.traffic === 'low' ? 0.45 : 1) * Biome.atm.traffic);
  Dyn.spawnT -= dt;
  let live = 0; for (let i = 0; i < Dyn.list.length; i++) if (!Dyn.list[i].free) live++;
  if (live < want && Dyn.spawnT <= 0) { spawnTrafficOne(); Dyn.spawnT = 0.15; }
  for (let i = Dyn.list.length - 1; i >= 0 && live > want; i--) if (!Dyn.list[i].free) { removeDyn(Dyn.list[i]); Dyn.list.splice(i, 1); live--; }
  for (let i = Dyn.list.length - 1; i >= 0; i--) {
    const d = Dyn.list[i];
    const dc = Math.hypot(d.x - pl.x, d.z - pl.z);
    if (dc > 820) { removeDyn(d); Dyn.list.splice(i, 1); continue; }
    if (d.free) {   /* knocked off its road by a crash: slides to a stop and stays as a wreck until the player has moved on */
      Crash.freeStep(d, dt);
      if ((d.rest > 6 && dc > 70) || d.age > 90 || (d.age > 25 && dc > 140)) { removeDyn(d); Dyn.list.splice(i, 1); }
      continue;
    }
    let tv = d.jack ? 0 : d.vt * (d.stun > 0 ? 0.05 : 1); if (d.stun > 0) d.stun -= dt;
    const rx = d.dz, rz = -d.dx;
    const look = (ox, oz, ov) => {
      const ex = ox - d.x, ez = oz - d.z, along = ex * d.dx + ez * d.dz, lat = ex * rx + ez * rz;
      if (along > 0 && along < 12 + d.v * 1.0 && Math.abs(lat) < 2.4) tv = Math.min(tv, Math.max(0, ov * 0.85 - (12 - along) * 0.5));
    };
    look(c.x, c.z, c.speed * (c.speed > 0 ? 1 : 0));
    if (Foot.on) look(Foot.x, Foot.z, 0);   /* a walker standing in the lane stops the traffic (and can be carjacked) */
    for (const o of Dyn.list) if (o !== d && o.road === d.road && o.dir === d.dir) look(o.x, o.z, o.v);
    for (const o of Dyn.extra) look(o.x, o.z, o.v);
    for (const o of Peds.list) if (o.onRoad && Math.abs(o.x - d.x) < 40 && Math.abs(o.z - d.z) < 40) look(o.x, o.z, 0);
    d.brake = tv < d.v - 0.6; d.v += clamp(tv - d.v, -9 * dt, 3.2 * dt);
    d.s += d.dir * d.v * dt;
    if (d.s < 0 || d.s > d.road.len) { d.dir = -d.dir; d.s = clamp(d.s, 0, d.road.len); }
    placeDyn(d);
  }
}
const _cs = [1.5, 0, -1.5];
function collideDyn(c) {
  const s = Math.sin(c.yaw), co = Math.cos(c.yaw);
  const all = Dyn.list.concat(Dyn.extra);
  for (let i = 0; i < all.length; i++) {
    const d = all[i], dxm = d.x - c.x, dzm = d.z - c.z; if (dxm * dxm + dzm * dzm > 64 || d.kind === 'traffic') continue;   /* traffic is handled by Crash (07_racers.js) */
    const ds = Math.sin(d.yaw), dco = Math.cos(d.yaw);
    for (let k = 0; k < 3; k++) {
      const px = c.x + s * CIRC[k][0], pz = c.z + co * CIRC[k][0];
      for (let m = 0; m < 3; m++) {
        const qx = d.x + ds * _cs[m], qz = d.z + dco * _cs[m], ex = px - qx, ez = pz - qz, rr = CIRC[k][1] + 0.95, d2 = ex * ex + ez * ez;
        if (d2 < rr * rr) { const dist = Math.sqrt(d2) || 0.01, nx = -ex / dist, nz = -ez / dist, cl = d.kind === 'rival' ? (c.vx - d.vx) * nx + (c.vz - d.vz) * nz : 0; contact(c, px, pz, ex / dist, ez / dist, (rr - dist) * 0.8, d.vx, d.vz); if (cl > 0.6) { /* the street-race rival is knocked too: shoved along the road and sideways, then it fights back to its lane */ const dv = cl * 0.7; d.v = clamp(d.v + dv * (nx * d.dx + nz * d.dz), 0, 70); d.lane = clamp(d.lane + dv * (nx * d.dz - nz * d.dx) * 0.45, -3.8, 3.8); d.stun = 0.7; d.hitT = 1; } if (d.kind === 'traffic') { d.stun = 1.6; d.hitT = 1; } else if (d.kind === 'police') { Police.ram = true; d.hit = 1; d.nx = -ex / dist; d.nz = -ez / dist; d.hv = Math.max(d.hv || 0, Math.hypot(c.vx - d.vx, c.vz - d.vz)); } }
      }
    }
  }
}
