/* ================= WORKSHOP PARTS: catalogue, assembly layout, compile =================
   A craft is a tree of parts: { id, t:type, par:{params}, p:parentId, at:{attach}, st:stage, ss:separationStage, sep:bool }.
   Every type turns its parameters into a descriptor (mass, fuel, nodes, aerodynamic elements, collision points) in part-local axes:
   +Z forward, +Y up, +X to port; radially attached parts (wings, gear, boosters) extend along local +X. `at` says where a part hangs on its
   parent: stack nodes {k:'s', pn, cn}, a point on a body {k:'f', u:z, phi}, or on a wing {k:'w', u:span fraction, v:chord fraction, side:+1/-1}.
   Mirrored copies need no flag: the frame built from the surface normal yields a mirror factor sx = ±1 on its own. */
const _WK_FUEL = { none: { rho: 0, ks: 7, name: 'Empty' }, jet: { rho: 800, ks: 10, name: 'Jet fuel' }, rocket: { rho: 1030, ks: 20, name: 'Kerolox' }, hydro: { rho: 360, ks: 26, name: 'Hydrolox' } };
WK.FUEL = _WK_FUEL;
const _WK_JET = [
  { n: 'Turbofan S', kind: 'tf', T: 18e3, tsfc: 1.65e-5, m: 170, r: 0.38 }, { n: 'Turbofan M', kind: 'tf', T: 45e3, tsfc: 1.65e-5, m: 400, r: 0.6 }, { n: 'Turbofan L', kind: 'tf', T: 110e3, tsfc: 1.6e-5, m: 900, r: 0.93 },
  { n: 'Turbojet S', kind: 'tj', T: 22e3, ab: 1.55, tsfc: 2.6e-5, atsfc: 5.6e-5, m: 230, r: 0.35 }, { n: 'Turbojet M', kind: 'tj', T: 48e3, ab: 1.55, tsfc: 2.6e-5, atsfc: 5.6e-5, m: 480, r: 0.5 }, { n: 'Turbojet L', kind: 'tj', T: 90e3, ab: 1.6, tsfc: 2.5e-5, atsfc: 5.4e-5, m: 880, r: 0.68 }];
const _WK_PROP = [
  { n: 'Piston 75 kW', P: 75e3, bsfc: 7.8e-8, m: 90, D: 1.7, tp: 0 }, { n: 'Piston 160 kW', P: 160e3, bsfc: 7.8e-8, m: 170, D: 2.0, tp: 0 }, { n: 'Piston 320 kW', P: 320e3, bsfc: 7.6e-8, m: 330, D: 2.4, tp: 0 },
  { n: 'Turboprop 700 kW', P: 700e3, bsfc: 6.3e-8, m: 330, D: 3.0, tp: 1 }, { n: 'Turboprop 1500 kW', P: 1500e3, bsfc: 6.1e-8, m: 660, D: 3.8, tp: 1 }];
const _WK_ROCK = [
  { n: 'Pixie', fuel: 'rocket', F: 20e3, iv: 276, is: 240, m: 52, r: 0.22, L: 0.8, gim: 4, mt: 0.4 },
  { n: 'Lark', fuel: 'rocket', F: 110e3, iv: 311, is: 282, m: 160, r: 0.34, L: 1.2, gim: 5, mt: 0.4 },
  { n: 'Condor', fuel: 'rocket', F: 450e3, iv: 318, is: 290, m: 480, r: 0.6, L: 2.0, gim: 5, mt: 0.6 },
  { n: 'Owl vacuum', fuel: 'rocket', F: 60e3, iv: 352, is: 170, m: 130, r: 0.7, L: 1.8, gim: 3, mt: 0.4 },
  { n: 'Heron hydrolox', fuel: 'hydro', F: 40e3, iv: 462, is: 190, m: 115, r: 0.85, L: 2.2, gim: 3, mt: 0.1 },
  { n: 'Swift hydrolox', fuel: 'hydro', F: 250e3, iv: 450, is: 365, m: 460, r: 0.6, L: 2.4, gim: 5, mt: 0.5 }];
const _WK_GEAR = [
  { n: 'Nose wheel', r: 0.22, L: 0.8, steer: 1, brake: 0, leg: 0 }, { n: 'Main wheel', r: 0.3, L: 0.9, steer: 0, brake: 1, leg: 0 },
  { n: 'Heavy wheel', r: 0.5, L: 1.2, steer: 0, brake: 1, leg: 0 }, { n: 'Landing leg', r: 0.2, L: 2.0, steer: 0, brake: 0, leg: 1 }];
const _WK_RW = [{ n: 'Small', tq: 600, m: 25 }, { n: 'Medium', tq: 3000, m: 110 }, { n: 'Large', tq: 15000, m: 520 }];
WK.JET = _WK_JET; WK.PROP = _WK_PROP; WK.ROCK = _WK_ROCK; WK.GEARS = _WK_GEAR; WK.RW = _WK_RW;
const _wkPI = Math.PI;

/* ---------- geometry helpers ---------- */
function _wkFrustum(r1, r2, L) {
  const S = _wkPI * (r1 + r2) * Math.sqrt(L * L + (r1 - r2) * (r1 - r2)), V = _wkPI * L * (r1 * r1 + r1 * r2 + r2 * r2) / 3, den = 4 * (r1 * r1 + r1 * r2 + r2 * r2) || 1e-9;
  return { S, V, zc: L / 2 - L * (r1 * r1 + 2 * r1 * r2 + 3 * r2 * r2) / den };
}
/* a hollow-ish body: structure plus optional propellant. Returns a descriptor (local axes, front at +z). */
function _wkBody(r1, r2, L, o) {
  o = o || {}; const F = _wkFrustum(r1, r2, L), fk = _WK_FUEL[o.fuel || 'none'], fill = o.fill == null ? 1 : o.fill;
  const struct = (o.ks != null ? o.ks : fk.ks) * F.S * (o.k || 1) + (o.add || 0), cap = fk.rho * F.V * 0.93, ra = (r1 + r2) / 2;
  const hull = []; for (const [z, r] of [[L / 2, r1], [0, (r1 + r2) / 2], [-L / 2, r2]]) for (let k = 0; k < 4; k++) { const a = _wkPI / 4 + k * _wkPI / 2; hull.push([r * Math.cos(a), r * Math.sin(a), z]); }
  const d = {
    kind: 'body', mass: struct, fuelType: o.fuel || 'none', fuelCap: cap, fuel0: cap * fill, com: [0, 0, F.zc], ra, L, I: [0, 0, 0],
    body: { r1, r2, L, nose: !!o.nose, shp: o.shp || 0, S: F.S, V: F.V, f: L / (2 * Math.max(r1, r2, 0.05)), zc: F.zc, cockpit: !!o.cockpit },
    nodes: { front: { p: [0, 0, L / 2], d: [0, 0, 1], r: r1 }, back: { p: [0, 0, -L / 2], d: [0, 0, -1], r: r2 } },
    hull, lim: o.lim || 16, mount: [-Math.max(r1, r2), 0, 0], sk: o.sk || 0.7
  };
  d.surf = (at) => { const z = clamp(at.u == null ? 0 : at.u, -L / 2, L / 2), r = r2 + (r1 - r2) * (z + L / 2) / L, ph = at.phi || 0, dr = (r1 - r2) / L, c = Math.cos(ph), s = Math.sin(ph), il = 1 / Math.sqrt(1 + dr * dr);
    return { p: [r * c, r * s, z], n: [c * il, s * il, -dr * il] }; };
  return d;
}
function _wkIner(d) {   /* diagonal inertia about the part's own centre of mass (solid cylinder approximation of structure + fuel) */
  const m = d.mass + (d.fuel0 || 0), ra = d.ra || 0.3, L = d.L || 1;
  d.I = [m * (3 * ra * ra + L * L) / 12, m * (3 * ra * ra + L * L) / 12, 0.5 * m * ra * ra]; return d;
}

/* ---------- catalogue ---------- */
WK.P = {
  cockpit: { label: 'Cockpit', cat: 'cmd', root: true, par: { sz: 1, col: 0 }, rng: { sz: [0.7, 1.6, 0.05] },
    info(p) { const s = p.sz, d = _wkBody(0.14 * s, 0.62 * s, 2.3 * s, { ks: 14, add: 210 * Math.pow(s, 2.2), nose: true, shp: 0, cockpit: true, lim: 11 }); d.crew = 1; d.cockpitKind = 'cockpit'; return _wkIner(d); } },
  capsule: { label: 'Capsule', cat: 'cmd', root: true, par: { sz: 1, col: 0 }, rng: { sz: [0.7, 1.6, 0.05] },
    info(p) { const s = p.sz, d = _wkBody(0.42 * s, 1.0 * s, 1.5 * s, { ks: 55, add: 160 * s * s, nose: true, shp: 1, cockpit: true, lim: 12 }); d.crew = 1; d.cockpitKind = 'capsule'; d.heatShield = true; return _wkIner(d); } },
  body: { label: 'Tube / tank', cat: 'str', par: { r: 0.6, r2: 0.6, len: 3, fuel: 'none', fill: 1, col: 0 }, rng: { r: [0.15, 3, 0.05], r2: [0.1, 3, 0.05], len: [0.4, 12, 0.1], fill: [0, 1, 0.05] }, opt: { fuel: ['none', 'jet', 'rocket', 'hydro'] },
    info(p) { return _wkIner(_wkBody(p.r, p.r2, p.len, { fuel: p.fuel, fill: p.fill, lim: p.fuel === 'none' ? 15 : 13 })); } },
  nose: { label: 'Nose cone', cat: 'str', par: { r: 0.6, len: 2, shp: 0, col: 0 }, rng: { r: [0.15, 3, 0.05], len: [0.4, 8, 0.1], shp: [0, 1, 1] },
    info(p) { const d = _wkBody(Math.max(0.03, p.r * 0.04), p.r, p.len, { ks: 16, nose: true, shp: p.shp, lim: 12 }); d.mount = [-p.r * 0.5, 0, 0]; return _wkIner(d); } },
  wing: { label: 'Wing / fin', cat: 'aero', par: { span: 4, cr: 2, ct: 1, sw: 12, tc: 0.12, dih: 2, inc: 0, cs: 0, csp: 0.45, gr: 1, role: 0, col: 0 },
    rng: { span: [0.3, 14, 0.1], cr: [0.3, 8, 0.1], ct: [0.1, 8, 0.1], sw: [-25, 72, 1], tc: [0.04, 0.2, 0.01], dih: [-15, 25, 1], inc: [-8, 8, 0.5], cs: [0, 0.45, 0.05], csp: [0.15, 1, 0.05], gr: [0, 2, 1], role: [0, 3, 1] },
    info(p) { return _wkWing(p); } },
  jet: { label: 'Jet engine', cat: 'eng', par: { v: 0 }, rng: { v: [0, 5, 1] }, info(p) { return _wkJet(p); } },
  prop: { label: 'Propeller engine', cat: 'eng', par: { v: 0 }, rng: { v: [0, 4, 1] }, info(p) { return _wkProp(p); } },
  rocket: { label: 'Rocket engine', cat: 'eng', par: { v: 1 }, rng: { v: [0, 5, 1] }, info(p) { return _wkRocket(p); } },
  solid: { label: 'Solid booster', cat: 'eng', par: { r: 0.4, len: 4, col: 0 }, rng: { r: [0.15, 1.6, 0.05], len: [1, 14, 0.5] }, info(p) { return _wkSolid(p); } },
  gear: { label: 'Landing gear', cat: 'sys', par: { v: 1, len: 0.9 }, rng: { v: [0, 3, 1], len: [0.3, 3.5, 0.05] }, info(p) { return _wkGear(p); } },
  decoupler: { label: 'Decoupler', cat: 'sys', par: { r: 0.6 }, rng: { r: [0.15, 2.8, 0.05] },
    info(p) { const d = _wkBody(p.r, p.r, 0.2, { ks: 0, add: 14 + 60 * p.r * p.r, lim: 20 }); d.dec = true; return _wkIner(d); } },
  chute: { label: 'Parachute', cat: 'sys', par: { d: 8 }, rng: { d: [2, 28, 0.5] },
    info(p) { const d = _wkBody(0.16, 0.16, 0.45, { ks: 0, add: 5 + 0.09 * p.d * p.d, lim: 10 }); d.chute = { d: p.d, CdA: 1.7 * _wkPI * p.d * p.d / 4 }; d.mount = [-0.16, 0, 0]; return _wkIner(d); } },
  rwheel: { label: 'Reaction wheel', cat: 'sys', par: { v: 1 }, rng: { v: [0, 2, 1] },
    info(p) { const w = _WK_RW[p.v | 0] || _WK_RW[1], d = _wkBody(0.28, 0.28, 0.4, { ks: 0, add: w.m, lim: 12 }); d.rw = { tq: w.tq }; d.mount = [-0.28, 0, 0]; return _wkIner(d); } }
};
WK.CATS = [['cmd', 'Command'], ['str', 'Structure'], ['aero', 'Aero'], ['eng', 'Engines'], ['sys', 'Systems']];
/* parts that can start a craft */
WK.isRoot = (t) => !!(WK.P[t] && WK.P[t].root);
WK.describe = function (P) {
  const T = WK.P[P.t]; const par = Object.assign({}, T.par, P.par || {}); const d = T.info(par); d.t = P.t; d.par = par;
  if (P.sep) d.mass += 25 + 20 * (d.ra || 0.3) * (d.ra || 0.3);
  return d;
};

/* ---------- wings ---------- */
function _wkWing(p) {
  const b = Math.max(0.2, p.span), cr = p.cr, ct = p.ct, tanL = Math.tan(p.sw * _wkPI / 180), S = b * (cr + ct) / 2, tc = p.tc, gr = p.gr | 0;
  const gm = [0.8, 1, 1.6][gr] || 1, gs = [0.7, 1, 2.2][gr] || 1, mass = S * (9 + 60 * tc) * gm + (p.cs > 0 ? 3 * b * p.csp : 0);
  const gam = p.dih * _wkPI / 180, inc = -p.inc * _wkPI / 180, cg = Math.cos(gam), sg = Math.sin(gam), ci = Math.cos(inc), si = Math.sin(inc);
  /* panel frame (span +x, normal +y, chord forward +z) -> part-local: incidence about x, then dihedral about z */
  const rot = (x, y, z) => { const y1 = y * ci - z * si, z1 = y * si + z * ci; return [x * cg - y1 * sg, x * sg + y1 * cg, z1]; };
  const sA = rot(1, 0, 0), nA = rot(0, 1, 0), fA = rot(0, 0, 1);
  const tanC4 = tanL - (cr - ct) / (4 * b), lam4 = Math.atan(tanC4), lamLE = Math.atan(tanL), AR = 2 * b * b / S, cm = S / b;
  const n = clamp(Math.ceil(b / 1.2), 1, 5), strips = [];
  for (let i = 0; i < n; i++) {
    const f0 = i / n, f1 = (i + 1) / n, fm = (f0 + f1) / 2, c = cr + (ct - cr) * fm, le = cr / 2 - fm * b * tanL, area = b * (f1 - f0) * c;
    strips.push({ pos: rot(fm * b, 0, le - 0.25 * c), area, c, fr: fm, ctl: p.cs > 0 && fm >= 1 - p.csp ? 1 : 0 });
  }
  const hull = []; for (const f of [0.5, 1]) { const c = cr + (ct - cr) * f, le = cr / 2 - f * b * tanL; hull.push(rot(f * b, 0, le), rot(f * b, 0, le - c)); }
  const d = {
    kind: 'wing', mass, fuelType: 'none', fuelCap: 0, fuel0: 0, com: rot(0.4 * b, 0, -0.1 * cr), ra: b / 3, L: b, I: [mass * cm * cm / 12, mass * (b * b + cm * cm) / 12, mass * b * b / 12],
    wing: { b, cr, ct, S, AR, tc, lam4, lamLE, tanL, gam, inc, strips, sA, nA, fA, cs: p.cs, csp: p.csp, role: p.role | 0, Fmax: (4000 + 80000 * tc) * S * gs * (0.5 + 0.5 * gm) * 0.7 },
    nodes: {}, hull, lim: 7, mount: [0, 0, 0]
  };
  d.surf = (at) => {
    const u = clamp(at.u == null ? 0.5 : at.u, 0, 1), v = clamp(at.v == null ? 0.5 : at.v, 0, 1), side = at.side < 0 ? -1 : 1, c = cr + (ct - cr) * u, le = cr / 2 - u * b * tanL;
    return { p: rot(u * b, side * c * tc / 2, le - v * c), n: rot(0, side, 0) };
  };
  return d;
}

/* ---------- engines ---------- */
function _wkJet(p) {
  const e = _WK_JET[clamp(p.v | 0, 0, _WK_JET.length - 1)], r = e.r, L = 3.4 * r + 0.4;
  const d = _wkBody(r * 0.92, r * 0.78, L, { ks: 0, add: e.m, fuel: 'none', lim: 14 }); d.hull = d.hull.slice(); d.mount = [-r, 0, 0];
  d.eng = { kind: 'jet', jt: e.kind, T: e.T, ab: e.ab || 0, tsfc: e.tsfc, atsfc: e.atsfc || 0, name: e.n, fuel: 'jet', pos: [0, 0, -L / 2], dir: [0, 0, 1], r };
  d.body.baseClosed = true; return _wkIner(d);
}
function _wkProp(p) {
  const e = _WK_PROP[clamp(p.v | 0, 0, _WK_PROP.length - 1)], r = 0.2 + 0.1 * Math.sqrt(e.P / 1e5), L = 1.2 + r * 1.5;
  const d = _wkBody(r * 0.7, r, L, { ks: 0, add: e.m, fuel: 'none', lim: 14 }); d.mount = [-r, 0, 0];
  d.eng = { kind: 'prop', P: e.P, bsfc: e.bsfc, tp: e.tp, D: e.D, name: e.n, fuel: 'jet', pos: [0, 0, L / 2 + 0.05], dir: [0, 0, 1], r };
  d.body.baseClosed = true; return _wkIner(d);
}
function _wkRocket(p) {
  const e = _WK_ROCK[clamp(p.v | 0, 0, _WK_ROCK.length - 1)], d = _wkBody(e.r * 0.45, e.r, e.L, { ks: 0, add: e.m, lim: 15 }); d.mount = [-e.r, 0, 0];
  d.eng = { kind: 'rocket', F: e.F, iv: e.iv, is: e.is, name: e.n, fuel: e.fuel, gim: e.gim * _wkPI / 180, mt: e.mt, pos: [0, 0, -e.L / 2], dir: [0, 0, 1], r: e.r };
  d.body.baseClosed = true; return _wkIner(d);
}
function _wkSolid(p) {
  const r = p.r, L = p.len, d = _wkBody(r, r * 0.97, L, { fuel: 'none', ks: 22, add: 40, lim: 15 }), V = _wkPI * r * r * L, prop = 1750 * V * 0.92;
  d.fuelType = 'solid'; d.fuelCap = prop; d.fuel0 = prop; d.mount = [-r, 0, 0];
  const tb = 60 * r + 8, F = prop * WK.G0 * 268 / tb;
  d.eng = { kind: 'solid', F, iv: 268, is: 242, tb, name: 'Solid booster', fuel: 'solid', pos: [0, 0, -L / 2], dir: [0, 0, 1], r };
  d.body.baseClosed = true; return _wkIner(d);
}

/* ---------- landing gear ---------- */
function _wkGear(p) {
  const g = _WK_GEAR[clamp(p.v | 0, 0, _WK_GEAR.length - 1)], Ls = p.len, rw = g.r, leg = g.leg;
  const mass = leg ? 30 + 18 * Ls : 18 + 55 * rw * rw * 6 + 10 * Ls, stroke = clamp(0.3 * Ls, 0.18, 0.6);
  /* strut runs along local +X from the mount; wheel axle along local Y, rolling direction local Z */
  const d = { kind: 'gear', mass, fuelType: 'none', fuelCap: 0, fuel0: 0, com: [Ls * 0.5, 0, 0], ra: 0.15, L: Ls, I: [mass * Ls * Ls / 12, mass * 0.05, mass * Ls * Ls / 12], nodes: {}, hull: [], mount: [0, 0, 0], lim: 22,
    gear: { Ls, rw, stroke, steer: !!g.steer, brake: !!g.brake, leg: !!leg, name: g.n, tip: [Ls + (leg ? 0 : 0) + rw * (leg ? 0.3 : 0), 0, 0], CdA: leg ? 0.05 : 0.5 * (2 * rw) * (0.45 * rw) + 0.06 * Ls * 0.4 } };
  d.gear.tip = [Ls + rw * (leg ? 0 : 1), 0, 0];
  return d;
}

/* ---------- assembly layout: absolute transforms from the attach tree ---------- */
function _wkpt(T, v) { const r = _wkqrot(T.q, [T.sx * v[0], v[1], v[2]], [0, 0, 0]); r[0] += T.p[0]; r[1] += T.p[1]; r[2] += T.p[2]; return r; }
function _wkdir(T, v) { return _wkqrot(T.q, [T.sx * v[0], v[1], v[2]], [0, 0, 0]); }
/* frame for a part hanging off a surface: local +X along the outward normal, +Z along the parent's forward, +Y as 'up' as the parent sees it.
   A mirror factor sx appears by itself on the far side of the parent. */
function _wkFrame(n, zref, upref, xref) {
  const dz = WKV.dot(zref, n); let z = [zref[0] - dz * n[0], zref[1] - dz * n[1], zref[2] - dz * n[2]];
  if (WKV.len(z) < 1e-4) { z = WKV.cross(upref, n); if (WKV.len(z) < 1e-4) z = WKV.cross(xref, n); }
  WKV.norm(z, z); const y = WKV.norm(WKV.cross(z, n));
  const du = WKV.dot(y, upref); if (du < -1e-5 || (Math.abs(du) <= 1e-5 && WKV.dot(y, xref) < 0)) { y[0] = -y[0]; y[1] = -y[1]; y[2] = -y[2]; }
  const x = WKV.cross(y, z), sx = WKV.dot(n, x) >= 0 ? 1 : -1;
  return { q: _wkqfromAxes(x, y, z, [0, 0, 0, 1]), sx };
}
WK.layout = function (spec) {
  const T = {}, D = {}, byId = {};
  for (const P of spec.parts) { byId[P.id] = P; D[P.id] = WK.describe(P); }
  for (const P of spec.parts) {
    const d = D[P.id]; let t = null;
    const par = P.p != null ? byId[P.p] : null;
    if (par && T[par.id]) {
      const pd = D[par.id], pT = T[par.id], at = P.at || { k: 's', pn: 'back', cn: 'front' }, roll = at.roll || 0;
      if (at.k === 's') {
        const pn = pd.nodes[at.pn] || pd.nodes.back || pd.nodes.front, cn = d.nodes[at.cn] || d.nodes.front || d.nodes.back;
        if (pn && cn) {
          const pw = _wkpt(pT, pn.p), pdw = _wkdir(pT, pn.d); let q = pT.q.slice();
          const c0 = _wkqrot(q, [pT.sx * cn.d[0], cn.d[1], cn.d[2]], [0, 0, 0]);
          if (WKV.dot(c0, pdw) > 0) q = _wkqmul(q, [1, 0, 0, 0], [0, 0, 0, 1]);
          if (roll) q = _wkqmul(q, _wkqaxis(0, 0, 1, roll, [0, 0, 0, 1]), [0, 0, 0, 1]);
          const tt = { p: [0, 0, 0], q, sx: pT.sx }, off = _wkdir(tt, cn.p); tt.p = [pw[0] - off[0], pw[1] - off[1], pw[2] - off[2]]; t = tt;
        }
      } else if (pd.surf) {
        const sf = pd.surf(at), pw = _wkpt(pT, sf.p), nw = WKV.norm(_wkdir(pT, sf.n)), fr = _wkFrame(nw, _wkdir(pT, [0, 0, 1]), pd.kind === 'wing' ? _wkdir(pT, [0, 1, 0]) : _wkdir(pT, [0, 1, 0]), _wkdir(pT, [1, 0, 0]));
        let q = fr.q; if (roll) q = _wkqmul(_wkqaxis(nw[0], nw[1], nw[2], roll, [0, 0, 0, 1]), q, [0, 0, 0, 1]);
        const tt = { p: [0, 0, 0], q, sx: fr.sx }, m = d.mount || [0, 0, 0], off = _wkdir(tt, m); tt.p = [pw[0] - off[0], pw[1] - off[1], pw[2] - off[2]]; t = tt;
      }
    }
    T[P.id] = t || { p: [0, 0, 0], q: [0, 0, 0, 1], sx: 1 };
  }
  return { T, D };
};

/* ---------- compile: everything the simulator and the stats need, in craft axes ---------- */
WK.compile = function (spec) {
  const lay = WK.layout(spec), C = { spec, name: spec.name || 'Craft', mode: spec.mode || 'air', parts: [], byId: {}, root: null };
  for (const P of spec.parts) {
    const d = lay.D[P.id], T = lay.T[P.id], cp = { id: P.id, i: C.parts.length, t: P.t, P, d, T, par: null, kids: [], alive: true, nb: {}, st: P.st | 0, ss: P.ss | 0, sep: !!P.sep };
    cp.mass0 = d.mass; cp.com = _wkpt(T, d.com);
    const Rm = _wkqmat(T.q, [0, 0, 0, 0, 0, 0, 0, 0, 0]), I = d.I || [0, 0, 0], Ic = new Array(9);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) Ic[i * 3 + j] = Rm[i * 3] * I[0] * Rm[j * 3] + Rm[i * 3 + 1] * I[1] * Rm[j * 3 + 1] + Rm[i * 3 + 2] * I[2] * Rm[j * 3 + 2];
    cp.I = Ic; cp.fuel = d.fuel0 || 0;
    cp.hull = d.hull.map((h) => _wkpt(T, h));
    C.parts.push(cp); C.byId[P.id] = cp;
  }
  for (const cp of C.parts) { const pid = cp.P.p; if (pid != null && C.byId[pid]) { cp.par = C.byId[pid]; cp.par.kids.push(cp); } else if (!C.root) C.root = cp; }
  /* stack neighbours (for the exposed nose / base areas) */
  for (const cp of C.parts) if (cp.par && cp.P.at && cp.P.at.k === 's') { cp.nb[cp.P.at.cn] = cp.par; cp.par.nb[cp.P.at.pn] = cp; }
  const nodeR = (cp, slot) => { const n = cp.nb[slot]; if (!n) return 0; const at = n === cp.par ? cp.P.at : n.P.at; const nn = n.d.nodes[n === cp.par ? at.pn : at.cn]; return nn ? nn.r : 0; };
  for (const cp of C.parts) {
    const d = cp.d, T = cp.T;
    if (d.kind === 'wing') {
      const w = d.wing; cp.strips = w.strips.map((s) => ({ cp, pos: _wkpt(T, s.pos), s: WKV.norm(_wkdir(T, w.sA)), n: WKV.norm(_wkdir(T, w.nA)), fw: WKV.norm(_wkdir(T, w.fA)), area: s.area, c: s.c, fr: s.fr, ctl: s.ctl, F: [0, 0, 0] }));
      let kb = 1; const par = cp.par; if (par && par.d.kind === 'body') { const rb = Math.max(par.d.body.r1, par.d.body.r2) * 0.9; kb = 1 + rb / (w.b + rb); } cp.kb = kb;
    }
    if (d.body) {
      const B = d.body, n = clamp(Math.round(B.L / 2.2), 1, 5), ax = WKV.norm(_wkdir(T, [0, 0, 1])); cp.bstrips = [];
      const rAt = (z) => B.r2 + (B.r1 - B.r2) * (z + B.L / 2) / B.L;
      for (let i = 0; i < n; i++) {
        const za = B.L / 2 - (i + 1) * B.L / n, zb = B.L / 2 - i * B.L / n, zm = (za + zb) / 2, rf = rAt(zb), rb = rAt(za);
        cp.bstrips.push({ cp, pos: _wkpt(T, [0, 0, zm]), ax, rf, rb, len: B.L / n, first: i === 0, last: i === n - 1, rm: (rf + rb) / 2 });
      }
      cp.exF = _wkPI * Math.max(0, B.r1 * B.r1 - Math.pow(nodeR(cp, 'front'), 2)); cp.exB = B.baseClosed ? 0 : _wkPI * Math.max(0, B.r2 * B.r2 - Math.pow(nodeR(cp, 'back'), 2));
      cp.ax = ax;
    }
    if (d.eng) { const e = d.eng; cp.ePos = _wkpt(T, e.pos); cp.eDir = WKV.norm(_wkdir(T, e.dir)); const a = Math.abs(cp.eDir[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0]; cp.eGx = WKV.norm(WKV.cross(cp.eDir, a)); cp.eGy = WKV.cross(cp.eDir, cp.eGx); }
    if (d.gear) { const g = d.gear; cp.gPos = _wkpt(T, [0, 0, 0]); cp.gDir = WKV.norm(_wkdir(T, [1, 0, 0])); cp.gFwd = WKV.norm(_wkdir(T, [0, 0, 1])); cp.gAx = WKV.norm(_wkdir(T, [0, 1, 0])); }
    if (d.chute) cp.cPos = _wkpt(T, [0, 0, 0]);
  }
  /* fuselage chains: bodies stacked end to end behave as one slender body for skin friction and form drag */
  const seen = new Set();
  for (const cp of C.parts) if (cp.d.body && !seen.has(cp)) {
    const grp = [], st = [cp]; seen.add(cp);
    while (st.length) { const q = st.pop(); grp.push(q); for (const k of ['front', 'back']) { const n = q.nb[k]; if (n && n.d.body && !seen.has(n)) { seen.add(n); st.push(n); } } }
    let L = 0, rm = 0.05; for (const q of grp) { L += q.d.body.L; rm = Math.max(rm, q.d.body.r1, q.d.body.r2); }
    const f = Math.max(L / (2 * rm), 1.5), ff = 1 + 60 / (f * f * f) + f / 400; for (const q of grp) { q.chainL = L; q.chainFF = ff; q.chainF = f; }
  }
  /* a part is 'cut' from its parent by a separation: decoupler children, or parts flagged sep */
  for (const cp of C.parts) { cp.cutStage = 0; if (cp.par) { if (cp.sep) cp.cutStage = cp.ss || 1; else if (cp.par.d.dec) cp.cutStage = cp.par.ss || 1; } }
  return C;
};
/* default staging for a fresh design: air-breathers armed from the start, rocket engines in order, decouplers dropping the deepest stage first */
WK.autoStage = function (spec) {
  const byId = {}; for (const P of spec.parts) byId[P.id] = P;
  const decDepth = (P) => { let n = 0, q = P; while (q && q.p != null) { const par = byId[q.p]; if (!par) break; if (par.t === 'decoupler' && q.at && q.at.k === 's') n++; q = par; } return n; };
  const decs = spec.parts.filter((P) => P.t === 'decoupler' && P.at && P.at.k === 's'); const K = decs.length;
  const serialPath = (P) => { let n = 0, q = P; while (q && q.p != null) { const par = byId[q.p]; if (!par) break; if (par.t === 'decoupler' && q.at && q.at.k === 's') n++; q = par; } return n; };
  for (const P of spec.parts) {
    const ty = P.t;
    if (ty === 'jet' || ty === 'prop') { P.st = 0; continue; }
    if (ty === 'rocket' || ty === 'solid') { P.st = 1 + (K - serialPath(P)); if (P.sep) P.ss = P.st + 1; continue; }
    if (ty === 'decoupler') { const above = serialPath(P); P.ss = 1 + (K - above); if (P.at && P.at.k !== 's') P.ss = 2; continue; }
    if (ty === 'chute') { P.st = K + 2; continue; }
    if (P.sep && !P.ss) P.ss = 2;
  }
  return spec;
};
