/* ================= RALLY: breakable plank gates (pure physics, no rendering) =================
   A gate is a row of upright planks nailed to two rails between a pair of posts. When the car's footprint reaches a plank it first bends (a quick
   forward lean, the crack), then snaps at a rail: the upper part is flung forward with the car's speed, the stub may topple, splinters fly off the
   break. Pieces are small rigid bodies (a capsule along the long axis against the ground, quaternion integration). The sim writes straight into
   per-kind instance-matrix arrays that the renderer uploads as they are, so this file never touches three.js.
   Kinds: 0 whole plank, 1 stub (jagged top), 2 upper part (jagged bottom), 3 rail piece, 4 splinter. Every geometry is unit-sized and centred on its
   centre of mass; the instance scale carries the real size. */
const RW = { PW: 0.205, PT: 0.045, PH: 2.05, PITCH: 0.215, RAILS: [0.55, 1.45], RL: 1.3, SHARDS: 420, GRAV: 9.81 };

const _rwQ = {
  mul(a, b) { return [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]]; },
  axis(x, y, z, a) { const s = Math.sin(a / 2); return [x * s, y * s, z * s, Math.cos(a / 2)]; },
  rot(q, x, y, z) { /* rotate (x,y,z) by q */
    const ix = q[3] * x + q[1] * z - q[2] * y, iy = q[3] * y + q[2] * x - q[0] * z, iz = q[3] * z + q[0] * y - q[1] * x, iw = -q[0] * x - q[1] * y - q[2] * z;
    return [ix * q[3] + iw * -q[0] + iy * -q[2] - iz * -q[1], iy * q[3] + iw * -q[1] + iz * -q[0] - ix * -q[2], iz * q[3] + iw * -q[2] + ix * -q[1] - iy * -q[0]];
  }
};
/* write a TRS matrix (column-major) for instance `slot` of kind k */
function _rwPut(sim, k, slot, px, py, pz, q, sx, sy, sz) {
  const m = sim.mats[k], o = slot * 16, x = q[0], y = q[1], z = q[2], w = q[3], xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  m[o] = (1 - 2 * (yy + zz)) * sx; m[o + 1] = 2 * (xy + wz) * sx; m[o + 2] = 2 * (xz - wy) * sx; m[o + 3] = 0;
  m[o + 4] = 2 * (xy - wz) * sy; m[o + 5] = (1 - 2 * (xx + zz)) * sy; m[o + 6] = 2 * (yz + wx) * sy; m[o + 7] = 0;
  m[o + 8] = 2 * (xz + wy) * sz; m[o + 9] = 2 * (yz - wx) * sz; m[o + 10] = (1 - 2 * (xx + yy)) * sz; m[o + 11] = 0;
  m[o + 12] = px; m[o + 13] = py; m[o + 14] = pz; m[o + 15] = 1; sim.dirty[k] = true;
}
function _rwHide(sim, k, slot) { const m = sim.mats[k], o = slot * 16; for (let i = 0; i < 16; i++) m[o + i] = 0; sim.dirty[k] = true; }

/* walls: [{x,z,yaw,hw,y}], gh(x,z) = ground height. seed makes the wood tones and break points repeatable. */
RW.make = function (walls, gh, seed) {
  const rnd = mulberry32((seed || 3) * 977 + 13), sim = { walls: [], gh, rnd, live: [], bend: [], ev: [], now: 0, broken: 0, total: 0, shardNext: 0, cap: [0, 0, 0, 0, RW.SHARDS], used: 0, acc: 0 };
  let nP = 0, nR = 0;
  for (const w of walls) { const W = 2 * (w.hw + 0.65), n = Math.floor(W / RW.PITCH); nP += n; nR += RW.RAILS.length * Math.ceil(W / RW.RL); }
  sim.cap = [nP, nP, nP, nR, RW.SHARDS]; sim.mats = sim.cap.map((c) => new Float32Array(c * 16)); sim.tint = sim.cap.map((c) => new Float32Array(c * 3)); sim.dirty = [true, true, true, true, true]; sim.count = [0, 0, 0, 0, 0];
  let pi = 0, ri = 0;
  for (let wi = 0; wi < walls.length; wi++) {
    const w = walls[wi], ty = Math.sin(w.yaw), tz = Math.cos(w.yaw), lx = tz, lz = -ty, W = 2 * (w.hw + 0.65), n = Math.floor(W / RW.PITCH), qw = _rwQ.axis(0, 1, 0, w.yaw);
    const G = { i: wi, x: w.x, z: w.z, yaw: w.yaw, tx: ty, tz, lx, lz, W, hw: w.hw, planks: [], rails: [], qw, hit: false, posts: [{ x: w.x + lx * (W / 2 + 0.18), z: w.z + lz * (W / 2 + 0.18) }, { x: w.x - lx * (W / 2 + 0.18), z: w.z - lz * (W / 2 + 0.18) }] };
    for (let i = 0; i < n; i++) {
      const off = -W / 2 + (i + 0.5) * W / n * 1 + (rnd() - 0.5) * 0.01, px = w.x + lx * off, pz = w.z + lz * off, by = gh(px, pz), H = RW.PH * (0.93 + rnd() * 0.12), tone = 0.78 + rnd() * 0.42, tilt = (rnd() - 0.5) * 0.03;
      const p = { g: G, off, bx: px, bz: pz, by, H, tone, tilt, state: 0, ang: 0, angMax: 0, t0: 0, snapAt: 0, slot: pi++, bp: null };
      G.planks.push(p); sim.tint[0].set([tone, tone * 0.97, tone * 0.92], p.slot * 3); sim.tint[1].set([tone, tone * 0.97, tone * 0.92], p.slot * 3); sim.tint[2].set([tone, tone * 0.97, tone * 0.92], p.slot * 3);
      _rwHide(sim, 1, p.slot); _rwHide(sim, 2, p.slot); RW.putPlank(sim, p, 0);
    }
    for (const ry of RW.RAILS) for (let s = 0; s < Math.ceil(W / RW.RL); s++) {
      const len = W / Math.ceil(W / RW.RL), off = -W / 2 + (s + 0.5) * len, px = w.x + lx * off + ty * 0.055, pz = w.z + lz * off + tz * 0.055, by = gh(px, pz) + ry, tone = 0.6 + rnd() * 0.25;
      const r = { g: G, off, len, px, py: by, pz, slot: ri++, state: 0, ry }; G.rails.push(r); sim.tint[3].set([tone, tone * 0.95, tone * 0.88], r.slot * 3); _rwPut(sim, 3, r.slot, px, by, pz, qw, len, 0.12, 0.07);
    }
    sim.walls.push(G); sim.total += n;
  }
  sim.count = [pi, pi, pi, ri, 0];
  for (let i = 0; i < RW.SHARDS; i++) _rwHide(sim, 4, i);
  return sim;
};
/* pose of a whole / bending plank (leaning forward along the road by `ang` about its foot) */
RW.putPlank = function (sim, p, ang) {
  const G = p.g, qb = _rwQ.mul(_rwQ.axis(G.lx, 0, G.lz, ang + p.tilt), G.qw), u = _rwQ.rot(qb, 0, 1, 0), h = p.H / 2;
  _rwPut(sim, 0, p.slot, p.bx + u[0] * h, p.by + u[1] * h - 0.02, p.bz + u[2] * h, qb, RW.PW, p.H, RW.PT);
};
RW.reset = function (sim) {
  for (const G of sim.walls) { G.hit = false; for (const p of G.planks) { p.state = 0; p.ang = 0; p.bp = null; _rwHide(sim, 1, p.slot); _rwHide(sim, 2, p.slot); RW.putPlank(sim, p, 0); } for (const r of G.rails) { r.state = 0; _rwPut(sim, 3, r.slot, r.px, r.py, r.pz, G.qw, r.len, 0.12, 0.07); } }
  for (let i = 0; i < RW.SHARDS; i++) _rwHide(sim, 4, i);
  sim.live.length = 0; sim.bend.length = 0; sim.ev.length = 0; sim.broken = 0; sim.shardNext = 0;
};

/* ---------- bodies ---------- */
function _rwBody(sim, k, slot, px, py, pz, q, v, w, half, axis, sx, sy, sz, life) {
  const b = { k, slot, px, py, pz, q, vx: v[0], vy: v[1], vz: v[2], wx: w[0], wy: w[1], wz: w[2], half, axis, sx, sy, sz, rest: 0, life, fade: 0 };
  sim.live.push(b); _rwPut(sim, k, slot, px, py, pz, q, sx, sy, sz); return b;
}
function _rwShards(sim, x, y, z, vx, vz, n, power) {
  const r = sim.rnd;
  for (let i = 0; i < n; i++) {
    const slot = sim.shardNext; sim.shardNext = (sim.shardNext + 1) % RW.SHARDS;
    for (let j = sim.live.length - 1; j >= 0; j--) if (sim.live[j].k === 4 && sim.live[j].slot === slot) { sim.live.splice(j, 1); break; }   /* recycle the oldest */
    const a = r() * 6.2832, up = 1.5 + r() * 5, sp = (2 + r() * 6) * power, len = 0.18 + r() * 0.5; let ax = r() - 0.5, ay = r() - 0.5, az = r() - 0.5; const al = Math.hypot(ax, ay, az) || 1, q = _rwQ.axis(ax / al, ay / al, az / al, r() * 6.28);
    sim.tint[4].set([0.85 + r() * 0.3, 0.72 + r() * 0.25, 0.5 + r() * 0.25], slot * 3);
    _rwBody(sim, 4, slot, x + (r() - 0.5) * 0.3, y + (r() - 0.5) * 0.3, z + (r() - 0.5) * 0.3, q, [vx * 0.55 + Math.cos(a) * sp, up, vz * 0.55 + Math.sin(a) * sp], [(r() - 0.5) * 36, (r() - 0.5) * 36, (r() - 0.5) * 36], len / 2, 1, 0.025 + r() * 0.02, len, 0.02 + r() * 0.02, 3.5 + r() * 3);
  }
  if (sim.count[4] < RW.SHARDS) sim.count[4] = RW.SHARDS;
}

/* ---------- the car meets the gate ---------- */
/* car: {x,y,z,yaw,vx,vz,L,W}; returns the fraction of the car's speed the gate took this step (0 if untouched) */
RW.carStep = function (sim, car) {
  let took = 0; const cx = Math.sin(car.yaw), cz = Math.cos(car.yaw), hl = car.L / 2, hwid = car.W / 2 + 0.1;
  for (const G of sim.walls) {
    const dx = car.x - G.x, dz = car.z - G.z; if (dx * dx + dz * dz > 14 * 14) continue;
    for (const p of G.planks) {
      if (p.state !== 0) continue;
      const rx = p.bx - car.x, rz = p.bz - car.z, fwd = rx * cx + rz * cz, side = rx * cz - rz * cx;
      if (side > hwid + 0.1 || side < -hwid - 0.1 || fwd > hl + 0.12 || fwd < -hl) continue;
      if (car.y > p.by + p.H - 0.15 || car.y + 1.5 < p.by + 0.1) continue;   /* flying over the top, or underneath */
      const near = Math.abs(side) < hwid - 0.1;      /* direct hit vs a clipped neighbour */
      const vn = car.vx * G.tx + car.vz * G.tz, sp = Math.hypot(car.vx, car.vz);
      p.state = 1; p.t0 = sim.now; p.snapAt = sim.now + (near ? 0.04 + sim.rnd() * 0.06 : 0.07 + sim.rnd() * 0.12); p.angMax = (near ? 0.34 : 0.22) + sim.rnd() * 0.1; p.dir = vn >= 0 ? 1 : -1;
      p.cvx = car.vx; p.cvz = car.vz; p.cside = side; p.sp = sp; p.near = near; sim.bend.push(p);
      took += near ? 0.008 : 0.0025; G.hit = true;
      if (sim.ev.length < 40) sim.ev.push({ t: 'crack', x: p.bx, y: p.by + 0.8, z: p.bz, sp });
    }
    for (const r of G.rails) {
      if (r.state !== 0) continue;
      const rx = r.px - car.x, rz = r.pz - car.z, fwd = rx * cx + rz * cz, side = rx * cz - rz * cx;
      if (Math.abs(side) > hwid + r.len / 2 || fwd > hl + 0.12 || fwd < -hl) continue;
      if (car.y > r.py + 0.1 || car.y + 1.5 < r.py - 0.1) continue;
      r.state = 1; took += 0.012;
      const sp = Math.hypot(car.vx, car.vz), rnd = sim.rnd, q = G.qw;
      _rwBody(sim, 3, r.slot, r.px, r.py, r.pz, q, [car.vx * (0.9 + rnd() * 0.3), 2 + rnd() * 2.5, car.vz * (0.9 + rnd() * 0.3)], [(rnd() - 0.5) * 8, (rnd() - 0.5) * 6, (rnd() - 0.5) * 10 + 3 * Math.sign(side || 1)], r.len / 2, 0, r.len, 0.12, 0.07, 14);
      _rwShards(sim, r.px, r.py, r.pz, car.vx, car.vz, 4, 0.8 + Math.min(1.5, sp / 25));
      if (sim.ev.length < 40) sim.ev.push({ t: 'rail', x: r.px, y: r.py, z: r.pz, sp });
    }
  }
  return Math.min(took, 0.2);
};

/* a bending plank reaches its snap time: split into stub + upper part, throw splinters */
function _rwSnap(sim, p) {
  const G = p.g, r = sim.rnd, ang = p.ang;
  const roll = r(), hb = roll < 0.5 ? 0.46 + r() * 0.22 : roll < 0.8 ? 1.32 + r() * 0.2 : 0.3 + r() * (p.H - 0.5);   /* breaks at the rails, mostly */
  const qb = _rwQ.mul(_rwQ.axis(G.lx, 0, G.lz, ang + p.tilt), G.qw), u = _rwQ.rot(qb, 0, 1, 0), hu = p.H - hb;
  /* stub keeps its lean */
  _rwPut(sim, 1, p.slot, p.bx + u[0] * hb / 2, p.by + u[1] * hb / 2 - 0.02, p.bz + u[2] * hb / 2, qb, RW.PW, hb, RW.PT); sim.count[1] = Math.max(sim.count[1], p.slot + 1);
  _rwHide(sim, 0, p.slot);
  const sp = p.sp || 10, side = p.cside || 0;
  /* upper part: thrown forward with the car and tumbling */
  const cxp = p.bx + u[0] * (hb + hu / 2), cyp = p.by + u[1] * (hb + hu / 2), czp = p.bz + u[2] * (hb + hu / 2), k = p.near ? 1 : 0.45;
  const lat = Math.max(-1, Math.min(1, -side * 1.2));
  const v = [p.cvx * (0.8 + r() * 0.45) * k + G.lx * lat * sp * 0.12 * k, 1.2 + r() * 2.8 + sp * 0.07 * k, p.cvz * (0.8 + r() * 0.45) * k + G.lz * lat * sp * 0.12 * k];
  const spin = p.dir * (4 + r() * 10) * k + 2;
  const up = _rwBody(sim, 2, p.slot, cxp, cyp, czp, qb, v, [G.lx * spin + (r() - 0.5) * 6, (r() - 0.5) * 7, G.lz * spin + (r() - 0.5) * 6], hu / 2, 1, RW.PW, hu, RW.PT, 12);
  /* the stub sometimes goes over as well */
  if (p.near && r() < 0.55) {
    const st = _rwBody(sim, 1, p.slot, p.bx + u[0] * hb / 2, p.by + u[1] * hb / 2, p.bz + u[2] * hb / 2, qb, [p.cvx * 0.35, 0.6, p.cvz * 0.35], [G.lx * p.dir * (2 + r() * 3), (r() - 0.5) * 2, G.lz * p.dir * (2 + r() * 3)], hb / 2, 1, RW.PW, hb, RW.PT, 12);
    st.pivot = true;
  }
  p.state = 2; sim.broken++;
  const bx = p.bx + u[0] * hb, by = p.by + u[1] * hb, bz = p.bz + u[2] * hb;
  _rwShards(sim, bx, by, bz, p.cvx, p.cvz, p.near ? 6 + ((r() * 5) | 0) : 2, 0.6 + Math.min(1.6, sp / 22) * (p.near ? 1 : 0.5));
  if (sim.ev.length < 40) sim.ev.push({ t: 'snap', x: bx, y: by, z: bz, sp, vx: p.cvx, vz: p.cvz, near: p.near });
}

/* ---------- time ---------- */
const _rwE = [0, 0, 0];
RW.step = function (sim, dt) {
  sim.now += dt;
  /* bending planks */
  for (let i = sim.bend.length - 1; i >= 0; i--) {
    const p = sim.bend[i], u = Math.min(1, (sim.now - p.t0) / Math.max(0.02, p.snapAt - p.t0)); p.ang = p.angMax * p.dir * (1 - (1 - u) * (1 - u));
    if (sim.now >= p.snapAt) { _rwSnap(sim, p); sim.bend[i] = sim.bend[sim.bend.length - 1]; sim.bend.pop(); } else RW.putPlank(sim, p, p.ang);
  }
  /* free bodies */
  const g = RW.GRAV, gh = sim.gh;
  for (let i = sim.live.length - 1; i >= 0; i--) {
    const b = sim.live[i];
    if (b.rest > 0.6) { b.life -= dt; if (b.life < 1) { const s = Math.max(0, b.life); _rwPut(sim, b.k, b.slot, b.px, b.py, b.pz, b.q, b.sx * s, b.sy * s, b.sz * s); } if (b.life <= 0) { _rwHide(sim, b.k, b.slot); sim.live[i] = sim.live[sim.live.length - 1]; sim.live.pop(); } else b.rest += dt; continue; }
    b.vy -= g * dt; const drag = 1 - 0.06 * dt; b.vx *= drag; b.vz *= drag;
    b.px += b.vx * dt; b.py += b.vy * dt; b.pz += b.vz * dt;
    /* orientation */
    const wx = b.wx, wy = b.wy, wz = b.wz, q = b.q, h = dt * 0.5, nq = [q[0] + h * (wx * q[3] + wy * q[2] - wz * q[1]), q[1] + h * (wy * q[3] + wz * q[0] - wx * q[2]), q[2] + h * (wz * q[3] + wx * q[1] - wy * q[0]), q[3] + h * (-wx * q[0] - wy * q[1] - wz * q[2])];
    const nl = 1 / Math.hypot(nq[0], nq[1], nq[2], nq[3]); b.q = [nq[0] * nl, nq[1] * nl, nq[2] * nl, nq[3] * nl];
    /* ground: the two ends of the long axis and the middle */
    const ax = b.axis === 0 ? _rwQ.rot(b.q, 1, 0, 0) : _rwQ.rot(b.q, 0, 1, 0);
    let hit = false, lift = 0, thick = b.k === 4 ? 0.02 : b.k === 3 ? 0.07 : 0.03;
    for (const sg of [-1, 0, 1]) {
      const ex = b.px + ax[0] * b.half * sg, ey = b.py + ax[1] * b.half * sg, ez = b.pz + ax[2] * b.half * sg, gy = gh(ex, ez) + thick;
      if (ey < gy) { hit = true; if (gy - ey > lift) lift = gy - ey; }
    }
    if (hit) {
      b.py += lift; const rest = b.k === 4 ? 0.3 : 0.22;
      if (b.vy < 0) { b.vy = -b.vy * rest; if (b.vy < 0.9) b.vy = 0; }
      const fr = Math.max(0, 1 - 5.5 * dt); b.vx *= fr; b.vz *= fr; const ar = Math.max(0, 1 - 5 * dt); b.wx *= ar; b.wy *= ar; b.wz *= ar;
      /* a piece lying down: the long axis levels out */
      b.wx += (ax[2] * 0) * dt;
      if (Math.abs(b.vx) + Math.abs(b.vz) + Math.abs(b.vy) < 0.5 && Math.abs(b.wx) + Math.abs(b.wy) + Math.abs(b.wz) < 1.2) b.rest += dt; else b.rest = 0;
    } else b.rest = 0;
    _rwPut(sim, b.k, b.slot, b.px, b.py, b.pz, b.q, b.sx, b.sy, b.sz);
    if (b.k !== 4 && b.k !== 3) { b.life -= dt * 0.15; }
    if (b.life <= 0 && b.k === 4) { _rwHide(sim, 4, b.slot); sim.live[i] = sim.live[sim.live.length - 1]; sim.live.pop(); }
  }
};
/* the car shoves loose pieces that are in its way (cheap: only while it is near a gate that has been hit) */
RW.bulldoze = function (sim, car) {
  const cx = Math.sin(car.yaw), cz = Math.cos(car.yaw), hl = car.L / 2 + 0.2, hw = car.W / 2 + 0.25, sp = Math.hypot(car.vx, car.vz);
  if (sp < 2) return;
  for (const b of sim.live) {
    if (b.py > car.y + 1.4 || b.k === 4) continue; const rx = b.px - car.x, rz = b.pz - car.z, fwd = rx * cx + rz * cz, side = rx * cz - rz * cx;
    if (fwd > -hl && fwd < hl && Math.abs(side) < hw) { const push = Math.max(0, sp * 0.8 - (b.vx * cx + b.vz * cz)); b.vx += cx * push * 0.5 + (side > 0 ? 1 : -1) * cz * 0.6; b.vz += cz * push * 0.5 - (side > 0 ? 1 : -1) * cx * 0.6; b.vy += 0.6; b.rest = 0; }
  }
};
RW.stats = function (sim) { return { broken: sim.broken, total: sim.total, live: sim.live.length }; };
