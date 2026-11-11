/* ================= AIRPORT =================
   One airfield on a levelled site: an 860 m runway (09/27), parallel taxiway with four connectors, a concrete apron,
   terminal, control tower, three hangars, fuel tanks, a car park, lights, windsock and an access road to the nearest highway.
   The site is chosen once at world generation (before the highways get their heights) and everything is axis-aligned, which keeps
   terrain levelling, colliders and the paved-area test trivial. Local coords: u runs along the runway (east), v across it (south);
   world x = cx + u, z = cz + v. Planes live in 06_plane.js, flying in 07_fly.js. */
const AIR = {
  U0: -450, U1: 450, V0: -60, V1: 240,
  RW: { u0: -430, u1: 430, hw: 22.5 },
  TWV: 75, TWH: 10, TWU: 385,
  CONN: [-330, -150, 120, 330],
  APRON: [-200, 60, 85, 176], HAP: [60, 265, 85, 126],
  HANG: [[76, 126], [134, 184], [192, 242]], HV0: 126, HV1: 166, HH: 11.5,
  TERM: [-110, 10, 176, 204], TH: 9, TOWER: [41, 49, 182, 190], LOT: [-125, 15, 208, 238],
  FUEL: [[-172, 194], [-158, 194], [-144, 194]]
};
const Air = { s: null, name: 'Airfield', built: false, group: null, boxes: [], pave: [], spots: [], lights: null, als: null, sock: null, beacon: null, seed: 0, onApron: false };

/* ---------- site selection (runs inside genWorld, after the highways exist) ---------- */
Air.test = function (cx, cz) {
  const x0 = cx + AIR.U0, x1 = cx + AIR.U1, z0 = cz + AIR.V0, z1 = cz + AIR.V1;
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) if (Math.hypot(x, z) > 2250) return null;
  for (const T of towns) { const dx = Math.max(x0 - T.cx, 0, T.cx - x1), dz = Math.max(z0 - T.cz, 0, T.cz - z1); if (Math.hypot(dx, dz) < T.R1 + 165) return null; }
  for (const r of roads) if (r.kind === 'hw') for (const p of r.pts) { const dx = Math.max(x0 - p.x, 0, p.x - x1), dz = Math.max(z0 - p.z, 0, p.z - z1); if (dx * dx + dz * dz < 170 * 170) return null; }
  let mn = 1e9, mx = -1e9, sum = 0, n = 0, sum2 = 0, n2 = 0;
  for (let x = x0 - 30; x <= x1 + 30; x += 45) for (let z = z0 - 30; z <= z1 + 30; z += 45) {
    const h = terrainNoRoad(x, z); if (h < 5) return null; mn = Math.min(mn, h); mx = Math.max(mx, h); sum += h; n++;
    if (x >= x0 && x <= x1 && z >= z0 && z <= z1) { sum2 += h; n2++; }
  }
  return { range: mx - mn, H0: sum2 / Math.max(1, n2), mn, mx };
};
Air.pick = function () {
  Air.s = null;
  const list = [[-1000, -640], [-940, -640], [-1000, -700], [-1000, -520]];
  let best = null;
  for (const [cx, cz] of list) { const r = Air.test(cx, cz); if (r && r.range < 46) { best = { cx, cz, r }; break; } }
  if (!best) {
    for (let gx = -1800; gx <= 1800; gx += 100) for (let gz = -1900; gz <= 1900; gz += 100) {
      const r = Air.test(gx, gz); if (r && (!best || r.range < best.r.range)) best = { cx: gx, cz: gz, r };
    }
  }
  if (!best) { Air.fail = true; return; }
  const cx = best.cx, cz = best.cz, H0 = Math.max(7, best.r.H0);
  Air.s = { cx, cz, H0, x0: cx + AIR.U0, x1: cx + AIR.U1, z0: cz + AIR.V0, z1: cz + AIR.V1 };
  let bd = 1e9; for (const T of towns) { const d = Math.hypot(T.cx - cx, T.cz - cz); if (d < bd) { bd = d; Air.name = T.name + ' Airfield'; } }
  Air.pave.length = 0;
  const R = AIR.RW; Air.pave.push([R.u0, R.u1, -R.hw, R.hw]);
  Air.pave.push([-AIR.TWU, AIR.TWU, AIR.TWV - AIR.TWH, AIR.TWV + AIR.TWH]);
  for (const u of AIR.CONN) Air.pave.push([u - AIR.TWH, u + AIR.TWH, R.hw, AIR.TWV - AIR.TWH]);
  Air.pave.push(AIR.APRON.slice(), AIR.HAP.slice(), AIR.LOT.slice(), [-60, -50, 238, 242]);
  /* solids in absolute y: boxes [x0, z0, x1, z1, yt, yb, rise, axis, arch] and upright cylinders [x, z, r, yb, yt] */
  Air.boxes = []; Air.cyls = [];
  const bx = (u0, u1, v0, v1, yb, yt, rise, axis, arch) => Air.boxes.push([cx + u0, cz + v0, cx + u1, cz + v1, H0 + yt, H0 + yb, rise || 0, axis || 0, arch ? 1 : 0]);
  const T = AIR.TERM, TW = AIR.TOWER;
  bx(T[0], T[1], T[2], T[3], 0, AIR.TH);                                       /* terminal block, its overhanging roof and the rooftop plant */
  bx(T[0] - 4, T[1] + 4, T[2] - 4, T[3] + 4, AIR.TH - 0.1, AIR.TH + 0.7);
  bx(T[0] + 20, T[1] - 28, T[2] + 6, T[3] - 6, AIR.TH + 0.6, AIR.TH + 2.2);
  bx(TW[0], TW[1], TW[2], TW[3], 0, 5); bx(43, 47, 184, 188, 0, 22.2);          /* tower: base, shaft, cab, mast */
  bx(37, 53, 178, 194, 22, 27.4); bx(44.6, 45.4, 185.6, 186.4, 27.4, 34.4);
  for (const h of AIR.HANG) bx(h[0], h[1], AIR.HV0, AIR.HV1, 0, AIR.HH - 2.6, 4.4, 2, true);   /* hangars: walls plus the round roof */
  for (const f of AIR.FUEL) Air.cyls.push([cx + f[0], cz + f[1], 5, H0, H0 + 9.5]);
  for (const p of [[-190, 100], [-190, 168], [-100, 100], [-20, 100], [40, 100], [110, 96], [200, 96], [255, 112], [-118, 224], [-55, 224], [8, 224], [-118, 212], [8, 212]])
    Air.cyls.push([cx + p[0], cz + p[1], 0.25, H0, H0 + (p[1] < 200 ? 15 : 7.5) + 0.35]);                                       /* floodlight poles */
  Air.cyls.push([cx - 200, cz + 47, 0.15, H0, H0 + 7.2]);                                                                       /* windsock mast */
  /* parked aircraft: id, local position, heading (yaw 0 = +z; pi faces the runway) */
  Air.spots = [
    { id: 'sparrow', u: -172, v: 128, yaw: Math.PI, hue: 0 },
    { id: 'sparrow', u: -134, v: 128, yaw: Math.PI, hue: 1 },
    { id: 'vixen', u: 101, v: 106, yaw: Math.PI, hue: 0 },
    { id: 'talon', u: 168, v: 108, yaw: Math.PI, hue: 0 },
    { id: 'wren', u: -92, v: 128, yaw: Math.PI, hue: 0 },
    { id: 'meridian', u: 12, v: 136, yaw: Math.PI, hue: 0 },
    { id: 'gull', u: 134, v: 106, yaw: Math.PI, hue: 0 },
    { id: 'kestrel', u: -72, v: 102, yaw: Math.PI, hue: 0 },
    { id: 'zephyr', u: 226, v: 106, yaw: Math.PI / 2, hue: 0 }
  ];
};

/* access road from the car park to the nearest highway */
Air.spur = function () {
  const A = Air.s; if (!A) return;
  const sx = A.cx - 55, sz = A.z1 + 2; let best = null, bd = 1e18;
  for (const r of roads) if (r.kind === 'hw') for (const p of r.pts) { const d = (p.x - sx) * (p.x - sx) + (p.z - sz) * (p.z - sz); if (d < bd) { bd = d; best = p; } }
  if (!best) return;
  const L = Math.sqrt(bd), nx0 = best.x - sx, nz0 = best.z - sz;
  const px = -nz0 / L, pz = nx0 / L, n = Math.max(4, Math.round(L / 30)), mid = [{ x: sx, z: sz }, { x: sx, z: sz + 40 }];
  for (let i = 1; i < n; i++) {
    const t = i / n, dev = Math.sin(Math.PI * t) * (L * 0.07 * noise2(t * 2.1 + 3.3, 7.7) + L * 0.03 * noise2(t * 5.3 + 1.1, 2.9));
    mid.push({ x: sx + nx0 * t + px * dev, z: sz + 40 + (nz0 - 40) * t + pz * dev });
  }
  mid.push({ x: best.x, z: best.z });
  const pts = resample(mid, 30), N = pts.length, h = new Float32Array(N);
  for (let i = 0; i < N; i++) h[i] = terrainNoRoad(pts[i].x, pts[i].z);
  for (let pass = 0; pass < 6; pass++) { const t = Float32Array.from(h); for (let i = 2; i < N - 2; i++) h[i] = (t[i - 2] + 2 * t[i - 1] + 3 * t[i] + 2 * t[i + 1] + t[i + 2]) / 9; }
  const K = 6; for (let i = 0; i < Math.min(K, N); i++) { const w = i / K; h[i] = lerp(A.H0 + 0.07, h[i], w); h[N - 1 - i] = lerp(best.h, h[N - 1 - i], w); }
  h[0] = A.H0 + 0.07; h[N - 1] = best.h;
  const maxStep = 0.075 * 30;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < N - 1; i++) h[i] = clamp(h[i], h[i - 1] - maxStep, h[i - 1] + maxStep);
    for (let i = N - 2; i > 0; i--) h[i] = clamp(h[i], h[i + 1] - maxStep, h[i + 1] + maxStep);
  }
  for (let i = 0; i < N; i++) pts[i].h = Math.max(h[i], 2.4);
  pts[0].h = A.H0 + 0.07; pts[N - 1].h = best.h;
  Air.road = addRoad('hw', pts, 6.5, { name: 'Airport Road', spur: true });
};

/* ---------- queries used by terrain, physics and scenery ---------- */
Air.flat = function (x, z, h) {
  const A = Air.s; if (!A) return h;
  const dx = Math.max(A.x0 - x, 0, x - A.x1), dz = Math.max(A.z0 - z, 0, z - A.z1);
  if (dx > 150 || dz > 150) return h;
  const d = Math.sqrt(dx * dx + dz * dz); if (d >= 150) return h;
  return h + (A.H0 - h) * (1 - sstep(8, 150, d));
};
Air.near = function (x, z, m) { const A = Air.s; return !!A && x > A.x0 - m && x < A.x1 + m && z > A.z0 - m && z < A.z1 + m; };
/* no trees or rocks on the site, nor in the approach corridors off both runway ends */
Air.clear = function (x, z, m) { const A = Air.s; if (!A) return false; if (Air.near(x, z, m)) return true; return Math.abs(z - A.cz) < 85 && x > A.x0 - 700 && x < A.x1 + 700; };
Air.paved = function (x, z) {
  const A = Air.s; if (!A || x < A.x0 || x > A.x1 || z < A.z0 || z > A.z1) return false;
  const u = x - A.cx, v = z - A.cz, P = Air.pave;
  for (let i = 0; i < P.length; i++) { const r = P[i]; if (u >= r[0] && u <= r[1] && v >= r[2] && v <= r[3]) return true; }
  return false;
};
Air.groundY = function (x, z) { return terrainHeight(x, z) + (Air.paved(x, z) ? 0.07 : 0); };
const AIRGRASS = lc(0x6a8440);
Air.grassW = function (x, z) {
  const A = Air.s; if (!A) return 0;
  const dx = Math.max(A.x0 - x, 0, x - A.x1), dz = Math.max(A.z0 - z, 0, z - A.z1); if (dx > 70 || dz > 70) return 0;
  return 1 - sstep(10, 70, Math.sqrt(dx * dx + dz * dz));
};
Air.cols = function (ch) {
  const A = Air.s; if (!A) return;
  if (ch.x0 > A.x1 + 4 || ch.x0 + CHUNK < A.x0 - 4 || ch.z0 > A.z1 + 4 || ch.z0 + CHUNK < A.z0 - 4) return;
  for (const b of Air.boxes) if (b[2] > ch.x0 && b[0] < ch.x0 + CHUNK && b[3] > ch.z0 && b[1] < ch.z0 + CHUNK) ch.cols.b.push(b.slice());
  for (const c of Air.cyls) if (c[0] > ch.x0 - c[2] && c[0] < ch.x0 + CHUNK + c[2] && c[1] > ch.z0 - c[2] && c[1] < ch.z0 + CHUNK + c[2]) colCyl(ch, c[0], c[1], c[2], c[3], c[4], 2);
};
Air.dist = function (x, z) { const A = Air.s; return A ? Math.hypot(x - A.cx, z - (A.cz + 80)) : 1e9; };
Air.toWorld = function (u, v, out) { const A = Air.s; out.x = A.cx + u; out.z = A.cz + v; return out; };
Air.hdg = function (yaw) { return ((Math.atan2(Math.sin(yaw), -Math.cos(yaw)) / DEG) + 360) % 360; };   /* compass heading: north is -z, east +x */

/* ---------- map symbols ---------- */
Air.drawMini = function (g) {
  const A = Air.s; if (!A) return; const R = AIR.RW;
  g.fillStyle = 'rgba(70,78,92,0.95)'; g.fillRect(A.cx + R.u0, A.cz - R.hw - 4, R.u1 - R.u0, R.hw * 2 + 8);
  g.fillStyle = '#d9dee6'; g.fillRect(A.cx + R.u0, A.cz - R.hw, R.u1 - R.u0, R.hw * 2);
  g.fillStyle = 'rgba(120,130,146,0.95)'; g.fillRect(A.cx - AIR.TWU, A.cz + AIR.TWV - AIR.TWH, AIR.TWU * 2, AIR.TWH * 2);
  const ap = AIR.APRON; g.fillRect(A.cx + ap[0], A.cz + ap[2], ap[1] - ap[0], ap[3] - ap[2]);
  g.fillStyle = 'rgba(255,176,46,0.92)'; g.fillRect(A.cx + AIR.TERM[0], A.cz + AIR.TERM[2], AIR.TERM[1] - AIR.TERM[0], AIR.TERM[3] - AIR.TERM[2]);
};
Air.drawFull = function (g, k) {
  const A = Air.s; if (!A) return; const R = AIR.RW, s0 = FM.toScreen(A.cx + R.u0, A.cz), s1 = FM.toScreen(A.cx + R.u1, A.cz), s2 = FM.toScreen(A.cx, A.cz + 80);
  g.save(); g.lineCap = 'butt'; g.strokeStyle = 'rgba(6,9,14,0.9)'; g.lineWidth = Math.max(5 * k, R.hw * 2 * FM.ppm + 3 * k); g.beginPath(); g.moveTo(s0[0], s0[1]); g.lineTo(s1[0], s1[1]); g.stroke();
  g.strokeStyle = '#e8ecf2'; g.lineWidth = Math.max(3 * k, R.hw * 2 * FM.ppm); g.stroke();
  g.fillStyle = '#ffb02e'; g.strokeStyle = '#06090e'; g.lineWidth = 2 * k; const u = k * 1.15, x = s2[0], y = s2[1] + 4 * k;
  g.beginPath(); g.moveTo(x, y - 9 * u); g.lineTo(x + 2 * u, y - 3 * u); g.lineTo(x + 10 * u, y + 1 * u); g.lineTo(x + 10 * u, y + 3 * u); g.lineTo(x + 2 * u, y + 1 * u); g.lineTo(x + 1.5 * u, y + 7 * u); g.lineTo(x + 5 * u, y + 9 * u); g.lineTo(x + 5 * u, y + 10 * u); g.lineTo(x, y + 9 * u); g.lineTo(x - 5 * u, y + 10 * u); g.lineTo(x - 5 * u, y + 9 * u); g.lineTo(x - 1.5 * u, y + 7 * u); g.lineTo(x - 2 * u, y + 1 * u); g.lineTo(x - 10 * u, y + 3 * u); g.lineTo(x - 10 * u, y + 1 * u); g.lineTo(x - 2 * u, y - 3 * u); g.closePath(); g.stroke(); g.fill();
  g.font = '700 ' + Math.round(13 * k) + 'px Rajdhani, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = 'rgba(0,0,0,0.85)'; g.lineWidth = 3.5 * k; g.strokeText(Air.name.toUpperCase(), x, y - 20 * k); g.fillText(Air.name.toUpperCase(), x, y - 20 * k);
  g.restore();
};
