/* ================= WORKSHOP SOLAR SYSTEM: bodies, Kepler orbits, spheres of influence =================
   A small star system in the Workshop's game-scaled units. The craft is always simulated in the frame of the body whose sphere of influence
   it is inside (patched conics): bodies move on exact circular orbits in the X-Y plane (clockwise seen from +Z, so an eastward launch from the
   pole is prograde), the craft crosses from one frame to the next at the SOI boundary, and coasting far from any surface uses exact universal-
   variable Kepler propagation so time warp can run at 100,000x. Pure numbers (no three.js), unit-tested in node. */
const _WK_PI2 = Math.PI * 2;
const _wkAtmExp = (p0, H, T, Rg, gam, top) => (h, o) => {
  o = o || {}; if (!(h > 0)) h = 0; const p = h > top ? 0 : p0 * Math.exp(-h / H);
  o.T = T; o.p = p; o.rho = p / (Rg * T); o.a = Math.sqrt(gam * Rg * T); o.mu = 1.2e-5; return o;
};
/* id, name, parent, radius, surface g, orbit radius, start angle (deg), look: kind + colours; atmosphere and warp / sky limits per body */
const _WK_DEF = [
  { id: 'sun', name: 'Helios', parent: null, R: 2.616e8, mu: 1.1723e18, kind: 'star', c1: 0xffe2a0, c2: 0xffb347, rails: 4e8 },
  { id: 'ember', name: 'Ember', parent: 'sun', R: 250e3, g: 2.7, a: 5.263e9, ph: -142.4, kind: 'rock', c1: 0x6b5f57, c2: 0x3a322d, rails: 12e3, desc: 'Scorched, airless rock close to the sun.' },
  { id: 'home', name: 'Home', parent: 'sun', R: 637100, g: 9.80665, a: 1.36e10, ph: -35, kind: 'home', c1: 0x2d6cc0, c2: 0x4a8a3a, rails: 70e3, desc: 'Your home world, with the island.' },
  { id: 'luna', name: 'Luna', parent: 'home', R: 200e3, g: 1.63, a: 1.2e7, ph: 20, kind: 'rock', c1: 0xa8a8a8, c2: 0x6e6e72, rails: 10e3, desc: 'Airless grey moon of Home.' },
  { id: 'rust', name: 'Rust', parent: 'sun', R: 320e3, g: 2.94, a: 2.07e10, ph: -79.8, kind: 'rock', c1: 0xc4602f, c2: 0x7a3a22, atm: _wkAtmExp(4500, 8000, 210, 188.9, 1.3, 70e3), atmTop: 70e3, rails: 60e3, sky: [0, 45e3, 0.55], desc: 'Cold desert world with a thin red atmosphere.' },
  { id: 'pebble', name: 'Pebble', parent: 'rust', R: 130e3, g: 1.1, a: 3.2e6, ph: 150, kind: 'rock', c1: 0x8c7a6a, c2: 0x5a4c42, rails: 6e3, desc: 'Small dusty moon of Rust.' },
  { id: 'jove', name: 'Jove', parent: 'sun', R: 6.0e6, g: 7.85, a: 6.8e10, ph: -131.4, kind: 'gas', c1: 0xd9b27c, c2: 0xa6623a, atm: _wkAtmExp(1.0e6, 20e3, 250, 3500, 1.4, 250e3), atmTop: 250e3, rails: 260e3, sky: [0, 200e3, 0.0], crush: true, desc: 'Gas giant: no surface, crushing depths.' },
  { id: 'cinder', name: 'Cinder', parent: 'jove', R: 300e3, g: 2.31, a: 4.3e7, ph: 60, kind: 'rock', c1: 0x7a3b2e, c2: 0x2e1f1c, rails: 12e3, desc: 'Dark volcanic moon of Jove.' }
];
WK.BODIES = []; WK.BY = {};
for (const d of _WK_DEF) {
  const B = Object.assign({ atm: null, atmTop: 0, kids: [], rails: 10e3, sky: null, crush: false }, d);
  B.mu = d.mu || (d.g * d.R * d.R); B.g0 = B.mu / (B.R * B.R); B.th0 = (d.ph || 0) * Math.PI / 180; WK.BODIES.push(B); WK.BY[d.id] = B;
}
for (const B of WK.BODIES) {
  if (B.parent) { const P = WK.BY[B.parent]; B.parent = P; P.kids.push(B); B.n = Math.sqrt(P.mu / (B.a * B.a * B.a)); B.T = _WK_PI2 / B.n; B.soi = B.a * Math.pow(B.mu / P.mu, 0.4); }
  else { B.parent = null; B.soi = Infinity; B.n = 0; B.T = Infinity; }
}
WK.HOME = WK.BY.home; WK.SUN = WK.BY.sun; WK.HOME.atm = WK.atmISA; WK.HOME.atmTop = WK.ATM_TOP; WK.HOME.sky = [18000, 75000, 0];
WK.UT0 = 0;
/* make B the body the physics globals (WK.R, WK.MU, WK.atm) refer to */
WK.use = function (B) { if (WK.B === B) return B; WK.B = B; WK.R = B.R; WK.MU = B.mu; return B; };
WK.use(WK.HOME);

/* body position/velocity relative to its parent at universal time ut (circular orbit, clockwise in the X-Y plane) */
WK.relState = function (B, ut, o) {
  o = o || { r: [0, 0, 0], v: [0, 0, 0] }; if (!B.parent) { o.r[0] = o.r[1] = o.r[2] = 0; o.v[0] = o.v[1] = o.v[2] = 0; return o; }
  const th = B.th0 - B.n * ut, c = Math.cos(th), s = Math.sin(th), a = B.a, w = a * B.n;
  o.r[0] = a * c; o.r[1] = a * s; o.r[2] = 0; o.v[0] = w * s; o.v[1] = -w * c; o.v[2] = 0; return o;
};
/* absolute (sun-centred) position of a body */
WK.absPos = function (B, ut, o) {
  o = o || [0, 0, 0]; o[0] = o[1] = o[2] = 0; const t = WK._tmpRel || (WK._tmpRel = { r: [0, 0, 0], v: [0, 0, 0] });
  for (let b = B; b && b.parent; b = b.parent) { WK.relState(b, ut, t); o[0] += t.r[0]; o[1] += t.r[1]; o[2] += t.r[2]; } return o;
};
/* a state (r, v) in B's frame -> in the Sun's frame (absolute position and velocity) */
WK.absState = function (B, r, v, ut, o) {
  o = o || { r: [0, 0, 0], v: [0, 0, 0] }; o.r[0] = r[0]; o.r[1] = r[1]; o.r[2] = r[2]; o.v[0] = v[0]; o.v[1] = v[1]; o.v[2] = v[2]; const t = { r: [0, 0, 0], v: [0, 0, 0] };
  for (let b = B; b && b.parent; b = b.parent) { WK.relState(b, ut, t); for (let i = 0; i < 3; i++) { o.r[i] += t.r[i]; o.v[i] += t.v[i]; } } return o;
};
/* a body's position in the frame of another body */
WK.posIn = function (B, F, ut, o) { o = o || [0, 0, 0]; const a = WK.absPos(B, ut, [0, 0, 0]), f = WK.absPos(F, ut, [0, 0, 0]); o[0] = a[0] - f[0]; o[1] = a[1] - f[1]; o[2] = a[2] - f[2]; return o; };
/* unit vector from a point at r (in frame F) towards the sun */
WK.sunDir = function (F, r, ut, o) {
  o = o || [0, 0, 0]; const f = WK.absPos(F, ut, [0, 0, 0]); let x = -(f[0] + r[0]), y = -(f[1] + r[1]), z = -(f[2] + r[2]); const l = Math.hypot(x, y, z) || 1; o[0] = x / l; o[1] = y / l; o[2] = z / l; return o;
};

/* ---------- universal-variable Kepler propagation (exact two-body motion over any dt) ---------- */
function _wkStumpff(z) {
  if (z > 1e-7) { const s = Math.sqrt(z); return [(1 - Math.cos(s)) / z, (s - Math.sin(s)) / (s * s * s)]; }
  if (z < -1e-7) { const s = Math.sqrt(-z); return [(Math.cosh(s) - 1) / -z, (Math.sinh(s) - s) / (s * s * s)]; }
  return [0.5 - z / 24, 1 / 6 - z / 120];
}
WK.kepler = function (r0, v0, mu, dt, out) {
  out = out || { r: [0, 0, 0], v: [0, 0, 0] };
  const r = Math.hypot(r0[0], r0[1], r0[2]), vv = v0[0] * v0[0] + v0[1] * v0[1] + v0[2] * v0[2], vr = (r0[0] * v0[0] + r0[1] * v0[1] + r0[2] * v0[2]) / r, al = 2 / r - vv / mu, sm = Math.sqrt(mu);
  if (al > 1e-14) { const T = _WK_PI2 / (sm * Math.pow(al, 1.5)); if (Math.abs(dt) > T) dt -= T * Math.trunc(dt / T); }
  const rvs = r * vr / sm, ar = 1 - al * r, tt = sm * dt;
  let chi;
  if (al > 1e-12) chi = sm * al * dt;
  else if (al < -1e-12) {
    const a = 1 / al, sg = dt < 0 ? -1 : 1; chi = sg * Math.sqrt(-a) * Math.log((-2 * mu * al * dt) / (r * vr + sg * Math.sqrt(-mu * a) * (1 - r * al)));
    if (!isFinite(chi) || chi * sg <= 0) chi = sm * dt / r; /* the log guess is only valid for long arcs */
  } else chi = sm * dt / r;
  /* F(chi) is monotone increasing in chi, so keep a bracket around the root and fall back to bisection whenever Newton leaves it */
  const Ff = (x) => { const zz = al * x * x, c2 = _wkStumpff(zz); return rvs * x * x * c2[0] + ar * x * x * x * c2[1] + r * x - tt; };
  let lo = -Infinity, hi = Infinity, F = Ff(chi);
  if (F === 0) { /* done */ } else {
    let stp = Math.max(1, Math.abs(chi));
    if (F < 0) { lo = chi; let x = chi + stp, g = 0; while (Ff(x) < 0 && g++ < 200) { lo = x; stp *= 2; x = chi + stp; } hi = x; }
    else { hi = chi; let x = chi - stp, g = 0; while (Ff(x) > 0 && g++ < 200) { hi = x; stp *= 2; x = chi - stp; } lo = x; }
    for (let i = 0; i < 200; i++) {
      const zz = al * chi * chi, cs = _wkStumpff(zz), C = cs[0], S = cs[1];
      F = rvs * chi * chi * C + ar * chi * chi * chi * S + r * chi - tt; const dF = rvs * chi * (1 - zz * S) + ar * chi * chi * C + r;
      if (F < 0) lo = chi; else hi = chi;
      let nx = chi - F / dF; if (!isFinite(nx) || nx <= lo || nx >= hi) nx = (lo + hi) / 2;
      const d = nx - chi; chi = nx; if (Math.abs(d) <= 1e-13 * Math.abs(chi) || hi - lo <= 1e-13 * Math.abs(chi)) break;
    }
  }
  const z = al * chi * chi, cs = _wkStumpff(z), C = cs[0], S = cs[1], f = 1 - chi * chi / r * C, g = dt - chi * chi * chi / sm * S;
  const x = f * r0[0] + g * v0[0], y = f * r0[1] + g * v0[1], zz = f * r0[2] + g * v0[2], rr = Math.hypot(x, y, zz), fd = sm / (rr * r) * (al * chi * chi * chi * S - chi), gd = 1 - chi * chi / rr * C;
  out.r[0] = x; out.r[1] = y; out.r[2] = zz; out.v[0] = fd * r0[0] + gd * v0[0]; out.v[1] = fd * r0[1] + gd * v0[1]; out.v[2] = fd * r0[2] + gd * v0[2]; return out;
};

/* ---------- sphere-of-influence test: which body's frame should a craft at r (in B's frame) be in at time ut? ---------- */
WK.soiTarget = function (B, r, ut) {
  if (B.parent && r[0] * r[0] + r[1] * r[1] + r[2] * r[2] > B.soi * B.soi) return B.parent;
  const t = WK._tmpRel2 || (WK._tmpRel2 = { r: [0, 0, 0], v: [0, 0, 0] });
  for (const c of B.kids) { WK.relState(c, ut, t); const dx = r[0] - t.r[0], dy = r[1] - t.r[1], dz = r[2] - t.r[2]; if (dx * dx + dy * dy + dz * dz < c.soi * c.soi) return c; }
  return null;
};
/* state (r, v) in B's frame -> in the frame of target T (parent or child of B) at ut */
WK.reframe = function (B, T, r, v, ut, o) {
  o = o || { r: [0, 0, 0], v: [0, 0, 0] }; const t = { r: [0, 0, 0], v: [0, 0, 0] };
  if (T === B.parent) { WK.relState(B, ut, t); for (let i = 0; i < 3; i++) { o.r[i] = r[i] + t.r[i]; o.v[i] = v[i] + t.v[i]; } }
  else { WK.relState(T, ut, t); for (let i = 0; i < 3; i++) { o.r[i] = r[i] - t.r[i]; o.v[i] = v[i] - t.v[i]; } }
  return o;
};
/* orbital elements of a state relative to body B regardless of the current frame */
WK.orbitIn = function (B, r, v, o) { const sv = WK.B; WK.use(B); const e = WK.orbit(r, v, o); WK.use(sv); return e; };

/* a circular orbit at altitude alt over body B, over the launch pole heading east (prograde for every body) */
WK.orbitState = function (B, alt) {
  const rr = B.R + alt, vc = Math.sqrt(B.mu / rr); return { r: [0, rr, 0], v: [vc, 0, 0] };
};

/* ---------- patched-conic prediction: the next time the current orbit crosses into another sphere of influence ---------- */
WK.predict = function (B, r0, v0, ut0, horizon, maxSteps) {
  const mu = B.mu, st = { r: [0, 0, 0], v: [0, 0, 0] }, tmp = { r: [0, 0, 0], v: [0, 0, 0] }; let vMax = 0;
  for (const c of B.kids) vMax = Math.max(vMax, c.a * c.n);
  const o0 = WK.orbitIn(B, r0, v0, {}); if (!B.kids.length && !(B.parent && (o0.hyper || o0.ra > B.soi))) return null;
  const test = (t) => { WK.kepler(r0, v0, mu, t, st); return WK.soiTarget(B, st.r, ut0 + t); };
  let t = 0, tPrev = 0, guard = 0;
  while (t <= horizon && guard++ < (maxSteps || 80000)) {
    WK.kepler(r0, v0, mu, t, st); const rr = Math.hypot(st.r[0], st.r[1], st.r[2]), vv = Math.hypot(st.v[0], st.v[1], st.v[2]);
    const hit = WK.soiTarget(B, st.r, ut0 + t);
    if (hit) {
      if (t <= 0) return null;
      let lo = tPrev, hi = t; for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (test(mid)) hi = mid; else lo = mid; }
      WK.kepler(r0, v0, mu, hi, st); const tg = WK.soiTarget(B, st.r, ut0 + hi) || hit, ps = WK.reframe(B, tg, st.r, st.v, ut0 + hi, { r: [0, 0, 0], v: [0, 0, 0] });
      return { kind: tg === B.parent ? 'exit' : 'enter', body: tg, from: B, t: hi, ut: ut0 + hi, r: ps.r, v: ps.v, rB: st.r.slice(), vB: st.v.slice(), orb: WK.orbitIn(tg, ps.r, ps.v, {}) };
    }
    let slack = B.parent ? B.soi - rr : Infinity;
    for (const c of B.kids) { WK.relState(c, ut0 + t, tmp); const d = Math.hypot(st.r[0] - tmp.r[0], st.r[1] - tmp.r[1], st.r[2] - tmp.r[2]) - c.soi; if (d < slack) slack = d; }
    const h = Math.max(5, Math.min(0.45 * slack / (vv + vMax + 1), horizon / 30)); tPrev = t; t += h;
  }
  return null;
};
