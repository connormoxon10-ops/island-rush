/* ================= WORKSHOP CORE: constants, atmosphere, quaternions, orbits =================
   The Workshop (aircraft + rocket builder, see 09_wkparts / 09_wksim / 10_wk*) runs on its own physics, written as plain numbers with no
   three.js so it can be unit-tested headless. SI units, doubles throughout.
   World model: a non-rotating planet one tenth of Earth's radius with Earth's surface gravity (so low orbit is ~2.3 km/s and a game-sized
   rocket can reach it) wrapped in the real International Standard Atmosphere. Physics runs in a planet-centred inertial frame whose +Y axis
   points up at the launch site; WK.proj maps that onto the flat island map (azimuthal equidistant) for rendering and terrain queries. */
const WK = { R: 637100, G0: 9.80665, RAIR: 287.05287, GAMMA: 1.4, ATM_TOP: 160000 };
WK.MU = WK.G0 * WK.R * WK.R;

/* ---------- International Standard Atmosphere (geometric altitude treated as geopotential: <1% error at this scale) ---------- */
const _WK_ISA = [[0, 288.15, -0.0065, 101325], [11000, 216.65, 0, 22632.06], [20000, 216.65, 0.001, 5474.889], [32000, 228.65, 0.0028, 868.0187],
  [47000, 270.65, 0, 110.9063], [51000, 270.65, -0.0028, 66.93887], [71000, 214.65, -0.002, 3.95642]];
WK.atmISA = function (h, o) {
  o = o || {}; if (!(h > 0)) h = 0;
  let T, p;
  if (h >= 84852) { T = 186.946; p = 0.3734 * Math.exp(-(h - 84852) / 7000); if (h > WK.ATM_TOP) p = 0; }
  else {
    let i = 0; while (i < 6 && h >= _WK_ISA[i + 1][0]) i++;
    const b = _WK_ISA[i], dh = h - b[0];
    if (b[2] !== 0) { T = b[1] + b[2] * dh; p = b[3] * Math.pow(T / b[1], -WK.G0 / (WK.RAIR * b[2])); }
    else { T = b[1]; p = b[3] * Math.exp(-WK.G0 * dh / (WK.RAIR * T)); }
  }
  o.T = T; o.p = p; o.rho = p / (WK.RAIR * T); o.a = Math.sqrt(WK.GAMMA * WK.RAIR * T); o.mu = 1.458e-6 * Math.pow(T, 1.5) / (T + 110.4);
  return o;
};
/* the atmosphere of whichever body the simulation is currently in (WK.use, 09_wksys.js); Home's is the ISA above */
WK.B = null;
WK.atm = function (h, o) {
  const B = WK.B; if (!B) return WK.atmISA(h, o);
  if (B.atm) return B.atm(h, o || {});
  o = o || {}; o.T = 3; o.p = 0; o.rho = 0; o.a = 300; o.mu = 1e-9; return o;   /* airless body: hard vacuum */
};
WK.g = function (r) { return WK.MU / (r * r); };

/* ---------- small vector / quaternion kit (arrays: v=[x,y,z], q=[x,y,z,w]; body -> inertial) ---------- */
const WKV = {
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  len: (a) => Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]),
  cross: (a, b, o) => { o = o || [0, 0, 0]; const x = a[1] * b[2] - a[2] * b[1], y = a[2] * b[0] - a[0] * b[2], z = a[0] * b[1] - a[1] * b[0]; o[0] = x; o[1] = y; o[2] = z; return o; },
  norm: (a, o) => { o = o || [0, 0, 0]; const l = Math.sqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]) || 1; o[0] = a[0] / l; o[1] = a[1] / l; o[2] = a[2] / l; return o; },
  q: { id: () => [0, 0, 0, 1] }
};
function _wkqmul(a, b, o) {
  const ax = a[0], ay = a[1], az = a[2], aw = a[3], bx = b[0], by = b[1], bz = b[2], bw = b[3];
  o[0] = aw * bx + ax * bw + ay * bz - az * by; o[1] = aw * by - ax * bz + ay * bw + az * bx; o[2] = aw * bz + ax * by - ay * bx + az * bw; o[3] = aw * bw - ax * bx - ay * by - az * bz; return o;
}
function _wkqnorm(q) { const l = 1 / (Math.hypot(q[0], q[1], q[2], q[3]) || 1); q[0] *= l; q[1] *= l; q[2] *= l; q[3] *= l; return q; }
function _wkqrot(q, v, o) {   /* rotate vector v by q */
  const x = q[0], y = q[1], z = q[2], w = q[3], vx = v[0], vy = v[1], vz = v[2];
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  o[0] = vx + w * tx + (y * tz - z * ty); o[1] = vy + w * ty + (z * tx - x * tz); o[2] = vz + w * tz + (x * ty - y * tx); return o;
}
function _wkqrotInv(q, v, o) {   /* rotate by the inverse of q */
  const x = -q[0], y = -q[1], z = -q[2], w = q[3], vx = v[0], vy = v[1], vz = v[2];
  const tx = 2 * (y * vz - z * vy), ty = 2 * (z * vx - x * vz), tz = 2 * (x * vy - y * vx);
  o[0] = vx + w * tx + (y * tz - z * ty); o[1] = vy + w * ty + (z * tx - x * tz); o[2] = vz + w * tz + (x * ty - y * tx); return o;
}
function _wkqaxis(ax, ay, az, ang, o) { const s = Math.sin(ang / 2), l = 1 / (Math.hypot(ax, ay, az) || 1); o[0] = ax * l * s; o[1] = ay * l * s; o[2] = az * l * s; o[3] = Math.cos(ang / 2); return o; }
/* rotation taking unit vector a to unit vector b */
function _wkqfromTo(a, b, o) {
  const d = a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  if (d < -0.999999) { let x = [1, 0, 0]; if (Math.abs(a[0]) > 0.9) x = [0, 1, 0]; const c = WKV.cross(a, x); WKV.norm(c, c); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = 0; return o; }
  const c = WKV.cross(a, b); o[0] = c[0]; o[1] = c[1]; o[2] = c[2]; o[3] = 1 + d; return _wkqnorm(o);
}
/* rotation matrix (row-major 9) from columns x,y,z axes -> quaternion */
function _wkqfromAxes(x, y, z, o) {
  const m00 = x[0], m10 = x[1], m20 = x[2], m01 = y[0], m11 = y[1], m21 = y[2], m02 = z[0], m12 = z[1], m22 = z[2], t = m00 + m11 + m22;
  if (t > 0) { const s = Math.sqrt(t + 1) * 2; o[3] = 0.25 * s; o[0] = (m21 - m12) / s; o[1] = (m02 - m20) / s; o[2] = (m10 - m01) / s; }
  else if (m00 > m11 && m00 > m22) { const s = Math.sqrt(1 + m00 - m11 - m22) * 2; o[3] = (m21 - m12) / s; o[0] = 0.25 * s; o[1] = (m01 + m10) / s; o[2] = (m02 + m20) / s; }
  else if (m11 > m22) { const s = Math.sqrt(1 + m11 - m00 - m22) * 2; o[3] = (m02 - m20) / s; o[0] = (m01 + m10) / s; o[1] = 0.25 * s; o[2] = (m12 + m21) / s; }
  else { const s = Math.sqrt(1 + m22 - m00 - m11) * 2; o[3] = (m10 - m01) / s; o[0] = (m02 + m20) / s; o[1] = (m12 + m21) / s; o[2] = 0.25 * s; }
  return _wkqnorm(o);
}
/* matrix (3x3 row-major) from quaternion */
function _wkqmat(q, m) {
  const x = q[0], y = q[1], z = q[2], w = q[3], xx = x * x, yy = y * y, zz = z * z, xy = x * y, xz = x * z, yz = y * z, wx = w * x, wy = w * y, wz = w * z;
  m[0] = 1 - 2 * (yy + zz); m[1] = 2 * (xy - wz); m[2] = 2 * (xz + wy); m[3] = 2 * (xy + wz); m[4] = 1 - 2 * (xx + zz); m[5] = 2 * (yz - wx); m[6] = 2 * (xz - wy); m[7] = 2 * (yz + wx); m[8] = 1 - 2 * (xx + yy); return m;
}
function _wkinv3(m, o) {
  const a = m[0], b = m[1], c = m[2], d = m[3], e = m[4], f = m[5], g = m[6], h = m[7], i = m[8];
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C, id = 1 / (Math.abs(det) < 1e-12 ? 1e-12 : det);
  o[0] = A * id; o[1] = -(b * i - c * h) * id; o[2] = (b * f - c * e) * id; o[3] = B * id; o[4] = (a * i - c * g) * id; o[5] = -(a * f - c * d) * id; o[6] = C * id; o[7] = -(a * h - b * g) * id; o[8] = (a * e - b * d) * id; return o;
}

/* ---------- inertial frame -> flat island map ---------- */
/* r = planet-centred position. Returns local altitude and map coordinates (arc length from the launch point) plus the rotation qL that
   carries the launch frame's axes onto the local frame at r (so a render orientation is qL^-1 * q). */
WK.proj = function (r, o) {
  o = o || { x: 0, y: 0, z: 0, qL: [0, 0, 0, 1], th: 0 };
  const rho = Math.hypot(r[0], r[1], r[2]), ux = r[0] / rho, uy = r[1] / rho, uz = r[2] / rho, th = Math.acos(uy > 1 ? 1 : uy < -1 ? -1 : uy), s = Math.sin(th);
  o.y = rho - WK.R; o.th = th;
  if (s < 1e-9) { o.x = 0; o.z = 0; o.qL[0] = o.qL[1] = o.qL[2] = 0; o.qL[3] = 1; return o; }
  const k = WK.R * th / s; o.x = ux * k; o.z = uz * k;
  /* axis = ŷ × u / |..| = (uz, 0, -ux)/s */
  _wkqaxis(uz, 0, -ux, th, o.qL); return o;
};
/* inverse: map (x, altitude, z) back to an inertial position */
WK.unproj = function (x, y, z, o) {
  o = o || [0, 0, 0]; const d = Math.hypot(x, z), th = d / WK.R, rho = WK.R + y;
  if (d < 1e-9) { o[0] = 0; o[1] = rho; o[2] = 0; return o; }
  const s = Math.sin(th); o[0] = rho * s * x / d; o[1] = rho * Math.cos(th); o[2] = rho * s * z / d; return o;
};

/* ---------- Keplerian elements from state ---------- */
WK.orbit = function (r, v, o) {
  o = o || {}; const mu = WK.MU, rr = Math.hypot(r[0], r[1], r[2]), vv2 = v[0] * v[0] + v[1] * v[1] + v[2] * v[2];
  const h = WKV.cross(r, v), hh = WKV.len(h), eps = vv2 / 2 - mu / rr;
  const rv = WKV.dot(r, v), ev = [(vv2 - mu / rr) * r[0] / mu - rv * v[0] / mu, (vv2 - mu / rr) * r[1] / mu - rv * v[1] / mu, (vv2 - mu / rr) * r[2] / mu - rv * v[2] / mu];
  const e = WKV.len(ev); o.e = e; o.eps = eps; o.h = hh; o.r = rr; o.v = Math.sqrt(vv2); o.hv = h; o.ev = ev;
  o.hyper = eps >= 0 || e >= 1;
  if (!o.hyper) { o.a = -mu / (2 * eps); o.rp = o.a * (1 - e); o.ra = o.a * (1 + e); o.T = TAU * Math.sqrt(o.a * o.a * o.a / mu); o.pe = o.rp - WK.R; o.ap = o.ra - WK.R; }
  else { o.a = eps === 0 ? 1e12 : -mu / (2 * eps); o.rp = hh * hh / (mu * (1 + e)); o.ra = Infinity; o.T = Infinity; o.pe = o.rp - WK.R; o.ap = Infinity; }
  /* true anomaly */
  let nu = 0; if (e > 1e-7) { let c = WKV.dot(ev, r) / (e * rr); c = c > 1 ? 1 : c < -1 ? -1 : c; nu = Math.acos(c); if (rv < 0) nu = TAU - nu; } else { nu = 0; }
  o.nu = nu; o.incl = hh > 1e-9 ? Math.acos(clamp(h[1] / hh, -1, 1)) : 0;
  if (!o.hyper && e > 1e-7) {
    const E = 2 * Math.atan2(Math.sqrt(1 - e) * Math.sin(nu / 2), Math.sqrt(1 + e) * Math.cos(nu / 2)), M = (E - e * Math.sin(E) + TAU) % TAU, n = TAU / o.T;
    o.tPe = (TAU - M) / n; o.tAp = (((Math.PI - M) % TAU + TAU) % TAU) / n;
  } else if (!o.hyper) { o.tPe = o.tAp = o.T / 2; } else { o.tPe = rv < 0 ? 1 : NaN; o.tAp = NaN; }
  return o;
};
/* speed of a circular orbit at radius rr, and the speed to escape it */
WK.vCirc = (rr) => Math.sqrt(WK.MU / rr);
