/* ================= CAR MODELS v2 =================
   Smooth lofted bodies (cross-sections swept along the car, with wheel arches, fender flares, pillars and glass),
   decals sampled straight off the surface (lamps, grille, door cuts), clear-coat paint lit by a sky reflection probe
   (a PMREM of the live sky shader, refreshed every few seconds), and spinning / steering wheels drawn as instanced meshes. */
const Env = { mats: new Set(), rt: null, tex: null, studio: null, pm: null, scene: null, ground: null, t: 5.6, ok: false };
const sm01 = (t) => t * t * (3 - 2 * t);

function initEnv() {
  try {
    Env.pm = new THREE.PMREMGenerator(renderer);
    const sc = Env.scene = new THREE.Scene();
    const skyM = new THREE.ShaderMaterial({ vertexShader: MAT.sky.vertexShader, fragmentShader: MAT.sky.fragmentShader.replace('gl_FragColor=vec4(col,1.0);', 'gl_FragColor=vec4(min(col,vec3(2.0)),1.0);'), uniforms: MAT.sky.uniforms, side: THREE.BackSide, depthWrite: false, fog: false });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 14), skyM); sky.scale.setScalar(40); sky.frustumCulled = false; sc.add(sky);
    Env.ground = new THREE.Mesh(new THREE.CircleGeometry(90, 22), new THREE.MeshBasicMaterial({ color: 0x252b1c })); Env.ground.rotation.x = -Math.PI / 2; Env.ground.position.y = -2; sc.add(Env.ground);
    /* studio probe for garage thumbnails: soft gradient room with a big overhead box and two strip lights */
    const st = new THREE.Scene(), g = new THREE.SphereGeometry(30, 20, 12), pos = g.attributes.position, col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 30, up = y > 0, t = up ? Math.pow(y, 0.7) : Math.pow(-y, 0.6);
      const k = up ? [0.55 + 0.45 * t, 0.62 + 0.45 * t, 0.7 + 0.5 * t] : [0.5 - 0.44 * t, 0.52 - 0.46 * t, 0.56 - 0.5 * t]; col[i * 3] = k[0]; col[i * 3 + 1] = k[1]; col[i * 3 + 2] = k[2];
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); st.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const box = (w, h, x, y, z, v) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(v, v, v * 1.04), side: THREE.DoubleSide })); m.position.set(x, y, z); m.lookAt(0, 0, 0); st.add(m); };
    box(16, 6, 0, 18, 5, 7); box(3, 14, -20, 6, 2, 5); box(3, 14, 20, 6, -4, 4.5); box(10, 3, 0, 8, -20, 3);
    Env.studio = Env.pm.fromScene(st, 0, 0.1, 100).texture; Env.ok = true;
  } catch (e) { Env.ok = false; }
}
Env.reg = function (m, studio) { m.envMap = studio ? Env.studio : Env.tex; m.needsUpdate = true; if (!studio) Env.mats.add(m); return m; };
Env.refresh = function () {
  if (!Env.ok) return;
  try {
    const k = 0.05 + 0.2 * env.day; Env.ground.material.color.setRGB(0.5 * k, 0.56 * k, 0.38 * k);
    const rt = Env.pm.fromScene(Env.scene, 0, 0.1, 100), old = Env.rt; Env.rt = rt; Env.tex = rt.texture;
    for (const m of Env.mats) { const first = !m.envMap; m.envMap = Env.tex; if (first) m.needsUpdate = true; }
    if (old) old.dispose();
  } catch (e) { Env.ok = false; }
};
Env.update = function (dt) { Env.t += dt; if (Env.t > (Q.dpr < 1 ? 14 : 7)) { Env.t = 0; Env.refresh(); } };

function initCarMats() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  MAT.carGlass = Env.reg(std({ color: lc(0x0d141b), roughness: 0.05, metalness: 0.9, envMapIntensity: 1.25 }));
  MAT.carTrim = Env.reg(std({ vertexColors: true, roughness: 0.62, metalness: 0.15, envMapIntensity: 0.45, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }));
  MAT.carBrake = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 0.06, 0.05), polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  MAT.carHead.polygonOffset = true; MAT.carHead.polygonOffsetFactor = -1; MAT.carHead.polygonOffsetUnits = -2;
  MAT.carTail.polygonOffset = true; MAT.carTail.polygonOffsetFactor = -1; MAT.carTail.polygonOffsetUnits = -2;
  MAT.tire = std({ vertexColors: true, roughness: 0.92, metalness: 0 });
  MAT.rim = Env.reg(std({ vertexColors: true, roughness: 0.28, metalness: 0.8, envMapIntensity: 1.1, side: THREE.DoubleSide }));
}
function mkPaint(hex, studio, fin) {
  const m = new THREE.MeshPhysicalMaterial({ color: lc(hex), roughness: 0.45, metalness: 0.25, clearcoat: 0.9, clearcoatRoughness: 0.16, vertexColors: true, envMapIntensity: 0.55 });
  if (fin && fin !== 'gloss') applyFinish(m, fin);
  return Env.reg(m, studio);
}

/* ---------- small geometry helpers ---------- */
function chaikin(pts, n) {
  for (let k = 0; k < n; k++) { const o = [pts[0]]; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1]; o.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]); } o.push(pts[pts.length - 1]); pts = o; }
  return pts;
}
function samp(poly, z) {
  const n = poly.length; if (z <= poly[0][0]) return poly[0][1]; if (z >= poly[n - 1][0]) return poly[n - 1][1];
  let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (poly[m][0] <= z) lo = m; else hi = m; }
  const t = (z - poly[lo][0]) / (poly[hi][0] - poly[lo][0] || 1); return poly[lo][1] + (poly[hi][1] - poly[lo][1]) * t;
}
function flipGeo(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array;
  for (let i = 0; i < p.length; i += 9) { for (let k = 0; k < 3; k++) { const a = p[i + 3 + k]; p[i + 3 + k] = p[i + 6 + k]; p[i + 6 + k] = a; const b = n[i + 3 + k]; n[i + 3 + k] = n[i + 6 + k]; n[i + 6 + k] = b; } }
  for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return g;
}
function triOut(gb, a, b, c) {
  const ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
  const cx = uy * vz - uz * vy, cy = uz * vx - ux * vz, cz = ux * vy - uy * vx;
  if (cx * (a.nx + b.nx + c.nx) + cy * (a.ny + b.ny + c.ny) + cz * (a.nz + b.nz + c.nz) < 0) { const t = b; b = c; c = t; }
  gb.vtx(a.x, a.y, a.z, a.nx, a.ny, a.nz, a.r, a.g, a.b); gb.vtx(b.x, b.y, b.z, b.nx, b.ny, b.nz, b.r, b.g, b.b); gb.vtx(c.x, c.y, c.z, c.nx, c.ny, c.nz, c.r, c.g, c.b);
}
function insideSec(sec, x, y) {
  const X = sec.X, Y = sec.Y, n = X.length; let c = false, px = -X[0], py = Y[0];
  const tst = (qx, qy) => { if ((qy > y) !== (py > y) && x < (px - qx) * (y - qy) / (py - qy) + qx) c = !c; px = qx; py = qy; };
  for (let j = 0; j < n; j++) tst(X[j], Y[j]);
  for (let j = n - 2; j >= 0; j--) tst(-X[j], Y[j]);
  return c;
}

/* ---------- body spec: all the numbers the loft needs ---------- */
function carSpec(def) {
  const b = def.body, p = def.p || {}, hl = b.L / 2, hw = b.W / 2, wr = b.wr, y0 = b.y0 != null ? b.y0 : 0.36, y1 = b.y1 != null ? b.y1 : y0 + b.H + 0.1, C = b.C, yR = y1 + C, tww = b.tw || 0.28;
  const cb = b.cab || {}, cz = cb.cz != null ? cb.cz : -0.1, bd = cb.bd != null ? cb.bd : hl * 0.5, td = cb.td != null ? cb.td : hl * 0.3, zoff = cb.zoff != null ? cb.zoff : -0.12, inset = cb.inset != null ? cb.inset : 0.08, tw = cb.tw != null ? cb.tw : hw - 0.25;
  const zRB = Math.max(cz - bd, -hl + 0.14), zFB = Math.min(cz + bd, hl - 0.3);
  let zRT = Math.max(cz + zoff - td, zRB + 0.08), zFT = Math.min(cz + zoff + td, zFB - 0.1); if (zFT < zRT + 0.25) { const m = (zFT + zRT) / 2; zRT = m - 0.125; zFT = m + 0.125; }
  const boxy = !!b.boxy, S = { def, b, hl, hw, wr, y0, y1, yR, C, tww, cz, inset, tw, zRB, zFB, zRT, zFT, boxy };
  const wa = p.a != null ? p.a : hl - 0.85, wbk = p.b != null ? p.b : hl - 0.85;
  S.wheels = []; for (const sx of [-1, 1]) for (const [z, front] of [[wa, true], [-wbk, false]]) S.wheels.push({ x: sx * (hw - tww / 2 - 0.04), z, r: wr, w: tww, front, side: sx });
  S.Ra = wr + 0.065; S.ySill = Math.max(0.16, y0 - 0.14);
  S.rise = Math.max(0, wr + S.Ra + 0.055 - y1); S.flare = b.flares ? 0.065 : 0; S.crown = b.crown != null ? b.crown : 0.045;
  S.noseR = b.noseR != null ? b.noseR : (boxy ? 0.32 : 0.62); S.tailR = b.tailR != null ? b.tailR : (boxy ? 0.3 : 0.5);
  S.nN = boxy ? 4.2 : 3.8; S.sEnd = boxy ? 0.9 : 0.94; S.cEnd = boxy ? 0.28 : 0.32; S.cP = boxy ? 2.2 : 3;
  const hd = b.hoodDrop != null ? b.hoodDrop : 0.12, dd = b.deckDrop != null ? b.deckDrop : 0.07; S.hoodDrop = hd;
  const gap = (z, lo, hi) => Math.min(hi, Math.max(lo, z));
  let ctrl = [[-hl, y1 - dd - 0.04], [-hl + 0.22, y1 + 0.005 - dd * 0.4], [zRB - 0.14, y1 + 0.015], [zRB, y1 + 0.02], [zRT, yR - 0.015], [(zRT + zFT) / 2, yR + 0.022], [zFT, yR - 0.015], [zFB, y1 + 0.035], [gap(zFB + 0.3, zFB + 0.05, hl - 0.4), y1 + 0.05], [hl - 0.3, y1 + 0.02 - hd * 0.35], [hl, y1 - hd]];
  ctrl = ctrl.filter((q, i) => i === 0 || i === ctrl.length - 1 || (q[0] > ctrl[0][0] + 0.05 && q[0] < hl - 0.05));
  ctrl.sort((a, c) => a[0] - c[0]); for (let i = 1; i < ctrl.length; i++) if (ctrl[i][0] < ctrl[i - 1][0] + 0.02) ctrl[i][0] = ctrl[i - 1][0] + 0.02;
  S.sil = chaikin(ctrl, 2);
  S.bpil = b.bpil != null ? b.bpil : null; const cp = b.cpil != null ? b.cpil : (b.squareback ? 0.06 : 0.3);
  S.win = b.win || [[zRB + cp, zFB - 0.04]];
  if (S.bpil != null) { const w = []; for (const q of S.win) { if (S.bpil > q[0] && S.bpil < q[1]) { w.push([q[0], S.bpil - 0.055], [S.bpil + 0.055, q[1]]); } else w.push(q); } S.win = w; }
  return S;
}

/* cross-section (right half) at height-line z: 12 points from the sill up over the body to the centre line */
function secAt(S, z) {
  const hl = S.hl, hw = S.hw, y1 = S.y1;
  let wf = 1, cv = 0;
  if (z > hl - S.noseR) { const s = clamp((z - (hl - S.noseR)) / S.noseR, 0, 1); wf = Math.pow(1 - Math.pow(s * S.sEnd, S.nN), 1 / S.nN); cv = S.cEnd * Math.pow(s, S.cP); }
  else if (z < -hl + S.tailR) { const s = clamp((-hl + S.tailR - z) / S.tailR, 0, 1); wf = Math.pow(1 - Math.pow(s * S.sEnd, S.nN), 1 / S.nN); cv = S.cEnd * Math.pow(s, S.cP); }
  const yT = samp(S.sil, z);
  let bump = 0; for (const w of S.wheels) if (w.side > 0) { const dz = z - w.z, R = S.Ra + 0.2; if (Math.abs(dz) < R) bump = Math.max(bump, 0.5 + 0.5 * Math.cos(Math.PI * dz / R)); }
  const rise = S.rise * bump, wB = hw + S.flare * bump, inCab = z > S.zRB && z < S.zFB, deckY = inCab ? y1 + 0.03 : yT;
  const u = clamp((yT - deckY) / Math.max(0.05, S.yR - (y1 + 0.03)), 0, 1), c0 = S.crown * (1 - 0.45 * u), xb = wB * 0.955;
  const ytop = (x, yc) => yc - c0 * (x / xb) * (x / xb) + rise * Math.pow(Math.min(1, x / xb), 3) * (1 - u);
  const cab0 = hw - S.inset, xCab = cab0 + (S.tw - cab0) * u, xE = Math.min(xCab, xb * 0.97), yE = ytop(xE, yT);
  const xG = xE - 0.07 * (0.4 + 0.6 * u), x10 = xE * 0.5, yB = ytop(xb, deckY) - 0.014 + rise * u;
  let yS = S.ySill; for (const w of S.wheels) if (w.side > 0) { const dz = z - w.z; if (Math.abs(dz) < S.Ra) yS = Math.max(yS, w.r + Math.sqrt(S.Ra * S.Ra - dz * dz)); }
  yS = Math.min(yS, yB - 0.14); const h = yB - yS, bul = 0.014 * u;
  const X = [wB * 0.9, wB * 0.985, wB, wB * 0.985, xb, xb + (xE - xb) * 0.16 + bul * 0.6, xb + (xE - xb) * 0.55 + bul, xb + (xE - xb) * 0.88 + bul * 0.4, xE, xG, x10, 0];
  const Y = [yS, yS + 0.18 * h, yS + 0.5 * h, yS + 0.85 * h, yB, yB + (yE - yB) * 0.16, yB + (yE - yB) * 0.55, yB + (yE - yB) * 0.88, yE, ytop(xG, yT), ytop(x10, yT), yT];
  if (cv > 0 || wf < 1) { const ym = (yS + yT) * 0.5; for (let k = 0; k < 12; k++) { Y[k] += (ym - Y[k]) * cv; X[k] *= wf; } }
  return { X, Y, u, yS, yB, yT };
}

function genStations(S, lod) {
  const hl = S.hl, zs = [], step = lod ? 0.3 : 0.14, es = lod ? 0.1 : 0.05;
  for (let z = -hl; z < hl; z += step) zs.push(z); zs.push(hl);
  for (let d = es; d < 0.45; d += es) zs.push(-hl + d, hl - d);
  for (const w of S.wheels) if (w.side > 0) { const R = S.Ra + 0.02, st = lod ? 0.13 : 0.065; for (let d = -R; d <= R + 1e-6; d += st) zs.push(w.z + d); }
  for (const z of [S.zRB, S.zRT, S.zFT, S.zFB]) zs.push(z - 0.05, z, z + 0.05);
  zs.sort((a, c) => a - c);
  const out = []; for (const z of zs) { if (z < -hl - 1e-6 || z > hl + 1e-6) continue; if (!out.length || z - out[out.length - 1] > 0.02) out.push(clamp(z, -hl, hl)); }
  out[0] = -hl; if (hl - out[out.length - 1] < 0.02) out[out.length - 1] = hl; else out.push(hl);
  return out;
}

/* ---------- body loft: paint into gP, glass into gG ---------- */
function loftBody(S, gP, gG, lod) {
  const zs = genStations(S, lod), K = zs.length, M = 12, secs = zs.map((z) => secAt(S, z)), G = [], Nn = [];
  for (let k = 0; k < K; k++) { G.push([]); for (let j = 0; j < M; j++) G[k].push([secs[k].X[j], secs[k].Y[j], zs[k]]); }
  for (let k = 0; k < K; k++) {
    Nn.push([]);
    for (let j = 0; j < M; j++) {
      const a = G[Math.max(0, k - 1)][j], b = G[Math.min(K - 1, k + 1)][j], c = G[k][Math.max(0, j - 1)], d = G[k][Math.min(M - 1, j + 1)];
      const tz = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], tp = [d[0] - c[0], d[1] - c[1], d[2] - c[2]];
      let nx = tp[1] * tz[2] - tp[2] * tz[1], ny = tp[2] * tz[0] - tp[0] * tz[2], nz = tp[0] * tz[1] - tp[1] * tz[0]; if (j === M - 1) nx = 0;
      const l = Math.hypot(nx, ny, nz) || 1; Nn[k].push([nx / l, ny / l, nz / l]);
    }
  }
  const inWin = (zc) => { for (const w of S.win) if (zc >= w[0] && zc <= w[1]) return true; return false; };
  const cls = (j, zc, um) => {
    if (j <= 4 || j === 7 || j === 8) return 0;
    if (j === 5 || j === 6) return um > 0.12 && inWin(zc) ? 1 : 0;
    return um > 0.08 && ((zc >= S.zFT - 0.01 && zc <= S.zFB + 0.01) || (zc >= S.zRB - 0.01 && zc <= S.zRT + 0.01)) ? 1 : 0;
  };
  const V = (k, j, sd, isGlass) => {
    const g = G[k][j], n = Nn[k][j], ao = isGlass ? 1 : 0.6 + 0.4 * sm01(clamp((g[1] - S.ySill) / 0.38, 0, 1));
    return { x: g[0] * sd, y: g[1], z: g[2], nx: n[0] * sd, ny: n[1], nz: n[2], r: ao, g: ao, b: ao };
  };
  for (let k = 0; k < K - 1; k++) {
    const zc = (zs[k] + zs[k + 1]) / 2, um = (secs[k].u + secs[k + 1].u) / 2;
    for (let j = 0; j < M - 1; j++) {
      const gl = cls(j, zc, um), gb = gl ? gG : gP;
      for (const sd of [1, -1]) {
        const a = V(k, j, sd, gl), b = V(k + 1, j, sd, gl), c = V(k + 1, j + 1, sd, gl), d = V(k, j + 1, sd, gl);
        triOut(gb, a, b, c); triOut(gb, a, c, d);
      }
    }
  }
  /* end caps: fan from the middle of each end ring, normals bent from the ring toward the face so the flat face blends in */
  for (const e of [0, K - 1]) {
    const sg = e ? 1 : -1, ring = [], z = zs[e];
    for (let j = 0; j < M; j++) ring.push([G[e][j], Nn[e][j]]); for (let j = M - 2; j >= 0; j--) ring.push([[-G[e][j][0], G[e][j][1], G[e][j][2]], [-Nn[e][j][0], Nn[e][j][1], Nn[e][j][2]]]);
    let cy = 0; for (const r of ring) cy += r[0][1]; cy /= ring.length;
    const ctr = { x: 0, y: cy, z, nx: 0, ny: 0, nz: sg, r: 1, g: 1, b: 1 };
    const rv = ring.map((r) => { const nx = r[1][0] * 0.35, ny = r[1][1] * 0.35, nz = r[1][2] * 0.35 + sg * 0.95, l = Math.hypot(nx, ny, nz); const ao = 0.6 + 0.4 * sm01(clamp((r[0][1] - S.ySill) / 0.38, 0, 1)); return { x: r[0][0], y: r[0][1], z, nx: nx / l, ny: ny / l, nz: nz / l, r: ao, g: ao, b: ao }; });
    for (let i = 0; i < rv.length; i++) triOut(gP, ctr, rv[i], rv[(i + 1) % rv.length]);
  }
}

/* ---------- surface sampling for decals ---------- */
function faceZ(S, sgn, x, y) {
  const hl = S.hl, R = sgn > 0 ? S.noseR : S.tailR; let lo = sgn > 0 ? hl - R : -hl + R, hi = sgn > 0 ? hl : -hl;
  if (!insideSec(secAt(S, lo), x, y)) return lo;
  if (insideSec(secAt(S, hi), x, y)) return hi;
  for (let i = 0; i < 12; i++) { const m = (lo + hi) / 2; if (insideSec(secAt(S, m), x, y)) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
function sideX(S, z, y) {
  const s = secAt(S, z), X = s.X, Y = s.Y; if (y <= Y[0]) return X[0];
  for (let j = 0; j < 4; j++) if (y <= Y[j + 1]) { const t = (y - Y[j]) / (Y[j + 1] - Y[j] || 1); return X[j] + (X[j + 1] - X[j]) * t; }
  return X[4];
}
function topY(S, x, z) {
  const s = secAt(S, z), X = s.X, Y = s.Y; x = Math.abs(x);
  for (let j = 7; j < 11; j++) if (x >= X[j + 1]) { const t = (X[j] - x) / (X[j] - X[j + 1] || 1); return Y[j] + (Y[j + 1] - Y[j]) * clamp(t, 0, 1); }
  return Y[11];
}
/* a grid of surface points (fn(s,t) -> [x,y,z]) lifted off the body by `off`, with smooth normals; hint = outward direction */
function patch(gb, fn, nu, nv, off, col, hint) {
  const P = [], N = [];
  for (let a = 0; a <= nu; a++) { P.push([]); for (let b = 0; b <= nv; b++) P[a].push(fn(a / nu, b / nv)); }
  for (let a = 0; a <= nu; a++) {
    N.push([]);
    for (let b = 0; b <= nv; b++) {
      const p0 = P[Math.max(0, a - 1)][b], p1 = P[Math.min(nu, a + 1)][b], q0 = P[a][Math.max(0, b - 1)], q1 = P[a][Math.min(nv, b + 1)];
      const du = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]], dv = [q1[0] - q0[0], q1[1] - q0[1], q1[2] - q0[2]];
      let nx = du[1] * dv[2] - du[2] * dv[1], ny = du[2] * dv[0] - du[0] * dv[2], nz = du[0] * dv[1] - du[1] * dv[0]; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      if (nx * hint[0] + ny * hint[1] + nz * hint[2] < 0) { nx = -nx; ny = -ny; nz = -nz; }
      N[a].push([nx, ny, nz]);
    }
  }
  const V = (a, b) => ({ x: P[a][b][0] + N[a][b][0] * off, y: P[a][b][1] + N[a][b][1] * off, z: P[a][b][2] + N[a][b][2] * off, nx: N[a][b][0], ny: N[a][b][1], nz: N[a][b][2], r: col[0], g: col[1], b: col[2] });
  for (let a = 0; a < nu; a++) for (let b = 0; b < nv; b++) { const A = V(a, b), B = V(a + 1, b), C = V(a + 1, b + 1), D = V(a, b + 1); triOut(gb, A, B, C); triOut(gb, A, C, D); }
}
const pFront = (S, gb, sg, xa, xb, ya, yb, off, col, nu, nv, slant) => patch(gb, (s, t) => { const x = xa + (xb - xa) * s, y = ya + (yb - ya) * t + (slant ? slant * (s - 0.5) : 0); return [x, y, faceZ(S, sg, x, y)]; }, nu || 6, nv || 2, off, col, [0, 0, sg]);
const pSide = (S, gb, sd, za, zb, ya, yb, off, col, nu, nv) => patch(gb, (s, t) => { const z = za + (zb - za) * s, y = ya + (yb - ya) * t; return [sd * sideX(S, z, y), y, z]; }, nu || 2, nv || 4, off, col, [sd, 0, 0]);
const pTop = (S, gb, xa, xb, za, zb, off, col, nu, nv) => patch(gb, (s, t) => { const x = xa + (xb - xa) * s, z = za + (zb - za) * t; return [x, topY(S, x, z), z]; }, nu || 2, nv || 8, off, col, [0, 1, 0]);

/* ---------- wheel meshes (shared geometry, drawn instanced) ---------- */
const Wheels = { recs: [], sets: null, ready: false, cap: 200, geo: null };
function lathe(pts, seg) { const g = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); g.rotateZ(-Math.PI / 2); return ni(g); }
function wheelGeos() {
  const out = { tire: {}, rim: {} }, M = new THREE.Matrix4(), c = new THREE.Color();
  const tireProfile = (rho, shoulder) => [[rho - 0.02, -0.4], [rho + 0.01, -0.46], [rho + 0.07, -0.5], [0.8, -0.5], [0.93, -0.49 + shoulder], [0.985, -0.43], [1, -0.32], [1, 0.32], [0.985, 0.43], [0.93, 0.49 - shoulder], [0.8, 0.5], [rho + 0.07, 0.5], [rho + 0.01, 0.46], [rho - 0.02, 0.4]];
  for (const kind of ['std', 'sport']) {
    const rho = kind === 'sport' ? 0.7 : 0.62, gb = new GB(0, 0, false);
    c.setRGB(0.028, 0.028, 0.03); gb.geo(lathe(tireProfile(rho, kind === 'sport' ? 0.0 : 0.02), 22), M.identity(), c, 0);
    /* backing plate + brake rotor + caliper, seen through the spokes */
    const cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 16)); cyl.rotateZ(Math.PI / 2);
    c.setRGB(0.02, 0.02, 0.022); M.compose(new THREE.Vector3(0.1, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.97, rho * 0.97)); gb.geo(cyl, M, c, 0);
    c.setRGB(0.3, 0.3, 0.32); M.compose(new THREE.Vector3(0.17, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.8, rho * 0.8)); gb.geo(cyl, M, c, 0);
    c.setRGB(0.07, 0.07, 0.08); M.compose(new THREE.Vector3(0.2, 0, 0), new THREE.Quaternion(), new THREE.Vector3(0.05, rho * 0.3, rho * 0.3)); gb.geo(cyl, M, c, 0);
    if (kind === 'sport') { const bx = ni(new THREE.BoxGeometry(1, 1, 1)); c.setRGB(0.75, 0.04, 0.03); M.compose(new THREE.Vector3(0.2, rho * 0.62, 0.12), new THREE.Quaternion(), new THREE.Vector3(0.14, rho * 0.34, rho * 0.4)); gb.geo(bx, M, c, 0); }
    out.tire[kind] = gb.mesh(MAT.tire).geometry;
  }
  const bx = ni(new THREE.BoxGeometry(1, 1, 1)), cyl = ni(new THREE.CylinderGeometry(1, 1, 1, 18)); cyl.rotateZ(Math.PI / 2);
  const q = new THREE.Quaternion(), v = new THREE.Vector3(), s = new THREE.Vector3(), e = new THREE.Euler();
  const barrel = (gb) => { c.setRGB(1, 1, 1); gb.geo(lathe([[0.78, -0.4], [0.97, -0.38], [1, -0.3], [1, 0.4], [0.97, 0.47], [0.9, 0.46], [0.86, 0.38]], 22), M.identity(), c, 0); };
  const hub = (gb, cap) => { c.setRGB(0.85, 0.85, 0.85); M.compose(v.set(0.36, 0, 0), q.identity(), s.set(0.16, 0.2, 0.2)); gb.geo(cyl, M, c, 0); c.setRGB(cap, cap, cap); M.compose(v.set(0.44, 0, 0), q.identity(), s.set(0.08, 0.11, 0.11)); gb.geo(cyl, M, c, 0); };
  const spokes = (gb, n, ws, th, r0) => { for (let i = 0; i < n; i++) { const a = i * TAU / n; e.set(a, 0, 0); q.setFromEuler(e); v.set(0.36, 0, 0); M.compose(v, q, s.set(th, 1, 1)); const sp = new THREE.Matrix4().compose(new THREE.Vector3(0.36, Math.sin(a) * 0, 0), q, new THREE.Vector3(1, 1, 1)); c.setRGB(1, 1, 1);
      const L = 0.97 - r0, m2 = new THREE.Matrix4().compose(new THREE.Vector3(0.36, 0, 0), q, new THREE.Vector3(1, 1, 1)); const off = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, (r0 + L / 2)), new THREE.Quaternion(), new THREE.Vector3(th, ws, L)); gb.geo(bx, m2.multiply(off), c, 0); } };
  const dish = (gb, r1, r0, a1, a0) => { c.setRGB(0.95, 0.95, 0.95); gb.geo(lathe([[r0, a0], [r1 * 0.5, (a0 + a1) / 2], [r1, a1]], 22), M.identity(), c, 0); };
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 10, 0.075, 0.06, 0.15); hub(gb, 0.4); out.rim.multi = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 5, 0.2, 0.07, 0.15); hub(gb, 0.4); out.rim.five = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 18, 0.042, 0.04, 0.15); hub(gb, 0.45); out.rim.mesh = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 3, 0.4, 0.08, 0.15); hub(gb, 0.4); out.rim.tri = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); spokes(gb, 7, 0.14, 0.06, 0.15); hub(gb, 0.4); out.rim.seven = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); dish(gb, 0.92, 0.12, 0.3, 0.42); hub(gb, 0.35); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; e.set(a, 0, 0); q.setFromEuler(e); const m2 = new THREE.Matrix4().compose(new THREE.Vector3(0.38, 0, 0), q, new THREE.Vector3(1, 1, 1)); const off = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.58), new THREE.Quaternion(), new THREE.Vector3(0.04, 0.12, 0.17)); c.setRGB(0.06, 0.06, 0.06); gb.geo(bx, m2.multiply(off), c, 0); } out.rim.steel = gb.mesh(MAT.rim).geometry; }
  { const gb = new GB(0, 0, false); barrel(gb); dish(gb, 0.97, 0.1, 0.36, 0.44); hub(gb, 0.25); for (let i = 0; i < 12; i++) { const a = i * TAU / 12; e.set(a, 0, 0); q.setFromEuler(e); const m2 = new THREE.Matrix4().compose(new THREE.Vector3(0.375, 0, 0), q, new THREE.Vector3(1, 1, 1)); const off = new THREE.Matrix4().compose(new THREE.Vector3(0, 0, 0.74), new THREE.Quaternion(), new THREE.Vector3(0.03, 0.05, 0.16)); c.setRGB(0.08, 0.08, 0.08); gb.geo(bx, m2.multiply(off), c, 0); } out.rim.disc = gb.mesh(MAT.rim).geometry; }
  return out;
}
function wheelsInit() {
  if (Wheels.ready) return; const geo = wheelGeos(), white = new THREE.Color(1, 1, 1); Wheels.geo = geo; Wheels.sets = {}; Wheels.group = new THREE.Group();
  const mk = (key, g, mat) => { const m = new THREE.InstancedMesh(g, mat, Wheels.cap); m.frustumCulled = false; m.castShadow = false; m.receiveShadow = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); if (mat === MAT.rim) { for (let i = 0; i < Wheels.cap; i++) m.setColorAt(i, white); m.instanceColor.setUsage(THREE.DynamicDrawUsage); } m.count = 0; Wheels.group.add(m); Wheels.sets[key] = { m, n: 0 }; };
  mk('t:std', geo.tire.std, MAT.tire); mk('t:sport', geo.tire.sport, MAT.tire); for (const k in geo.rim) mk('r:' + k, geo.rim[k], MAT.rim);
  scene.add(Wheels.group); Wheels.ready = true;
}
function wheelsAdd(grp, S) { wheelsInit(); const b = S.b, rec = { obj: grp, S, roll: 0, tire: b.tire === 'sport' ? 'sport' : 'std', rimKey: b.rimStyle || 'multi', col: new THREE.Color(...(b.rim || [0.6, 0.6, 0.64])), player: false }; Wheels.recs.push(rec); grp.userData.wrec = rec; return rec; }
function wheelsRemove(grp) { const r = grp.userData && grp.userData.wrec; if (!r) return; const i = Wheels.recs.indexOf(r); if (i >= 0) Wheels.recs.splice(i, 1); grp.userData.wrec = null; }
const _wm = new THREE.Matrix4(), _wl = new THREE.Matrix4(), _wq = new THREE.Quaternion(), _we = new THREE.Euler(), _wp = new THREE.Vector3(), _ws = new THREE.Vector3();
function updateWheels(dt) {
  if (!Wheels.ready) return;
  for (const k in Wheels.sets) Wheels.sets[k].n = 0;
  for (const rec of Wheels.recs) {
    const o = rec.obj; let vis = true; for (let q = o; q; q = q.parent) if (!q.visible) { vis = false; break; } if (!vis || !o.parent) continue; o.updateWorldMatrix(true, false);
    let v, steer = 0, brake = false; if (rec.player) { v = car.speed; steer = clamp(car.delta || 0, -0.6, 0.6); brake = (car.brk > 0.1 && !car.rev) || car.braking; } else { v = o.userData.v || 0; brake = !!o.userData.brake; steer = o.userData.steer || 0; }
    rec.roll = (rec.roll + v * dt / rec.S.wr) % TAU;
    const tail = o.userData.tail; if (tail) tail.material = brake ? MAT.carBrake : MAT.carTail;
    const ts = Wheels.sets['t:' + rec.tire], rs = Wheels.sets['r:' + rec.rimKey], rho = rec.tire === 'sport' ? 0.7 : 0.62;
    for (const w of rec.S.wheels) {
      const left = w.side < 0; _we.set(left ? -rec.roll : rec.roll, (w.front ? steer : 0) + (left ? Math.PI : 0), 0, 'YXZ'); _wq.setFromEuler(_we);
      _wl.compose(_wp.set(w.x, w.r, w.z), _wq, _ws.set(w.w, w.r, w.r)); _wm.multiplyMatrices(o.matrixWorld, _wl); ts.m.setMatrixAt(ts.n++, _wm);
      _wl.compose(_wp, _wq, _ws.set(w.w, w.r * rho * 1.0, w.r * rho * 1.0)); _wm.multiplyMatrices(o.matrixWorld, _wl); rs.m.setColorAt(rs.n, rec.col); rs.m.setMatrixAt(rs.n++, _wm);
    }
  }
  for (const k in Wheels.sets) { const s = Wheels.sets[k]; s.m.count = s.n; s.m.instanceMatrix.needsUpdate = true; if (s.m.instanceColor) s.m.instanceColor.needsUpdate = true; }
}

/* ---------- the car ---------- */
function buildCarModel(def, hex, opts) {
  opts = opts || {};
  const cs = opts.cos || null;
  const S = carSpec(def), b = S.b, hl = S.hl, hw = S.hw, y0 = S.y0, y1 = S.y1, wr = S.wr, C = S.C, lod = opts.lod ? 1 : 0, tww = S.tww;
  const gP = new GB(0, 0, false), gG = new GB(0, 0, false), gT = new GB(0, 0, false), gD = new GB(0, 0, false), gLt = new GB(0, 0, false), tl = new GB(0, 0, false);
  const DK = [0.03, 0.03, 0.034], CH = [0.62, 0.64, 0.68];
  loftBody(S, gP, gG, lod);
  const tbx = (x0, ya, z0, x1, yb, z1, k) => gT.box(Math.min(x0, x1), Math.min(ya, yb), Math.min(z0, z1), Math.max(x0, x1), Math.max(ya, yb), Math.max(z0, z1), k == null ? 0.03 : k, k == null ? 0.03 : k, k == null ? 0.034 : k);
  /* hollow body: dark chassis block seen through the wheel arches, plus a dark liner round each wheel */
  tbx(-(hw - 0.16), S.ySill - 0.04, -(hl - 0.5), hw - 0.16, y1 - 0.14, hl - 0.5, 0.025);
  for (const w of S.wheels) {
    const xi = Math.abs(w.x) - tww / 2 - 0.1, xo = hw - 0.015, lg = ni(new THREE.CylinderGeometry(S.Ra - 0.012, S.Ra - 0.012, xo - xi, 16, 1, true, 0, Math.PI)); lg.rotateZ(Math.PI / 2); flipGeo(lg);
    _m4.compose(_p3.set(w.side * (xi + xo) / 2, wr, w.z), _q.identity(), _s3.set(1, 1, 1)); gT.geo(lg, _m4, _tcol.setRGB(0.02, 0.02, 0.022), 0); lg.dispose();
  }
  /* ---- front / rear fascia decals ---- */
  const yN = samp(S.sil, hl - 0.05), yTl = samp(S.sil, -hl + 0.05), lw = b.lw || 0.4, lh = Math.max(b.lh || 0.13, 0.1), tlh = Math.max(b.tlh || 0.1, 0.08), xin = Math.min(0.42 * hw, hw - lw - 0.1);
  for (const sx of [-1, 1]) {
    pFront(S, gLt, 1, sx * xin, sx * (xin + lw), yN - 0.09 - lh, yN - 0.09, 0.006, [1, 1, 1], 7, 2, sx * 0.05);
    pFront(S, gD, 1, sx * (xin + 0.04), sx * (xin + lw - 0.04), yN - 0.09 - lh * 0.3 - 0.01, yN - 0.09 - lh * 0.3 + 0.012, 0.011, [0.55, 0.57, 0.6], 5, 1);
    if (b.tailBar) { if (sx > 0) pFront(S, tl, -1, -(hw - 0.2), hw - 0.2, yTl - 0.06 - tlh, yTl - 0.06, 0.006, [1, 1, 1], 12, 2); }
    else pFront(S, tl, -1, sx * (hw * 0.35), sx * (hw - 0.1), yTl - 0.07 - tlh, yTl - 0.07, 0.006, [1, 1, 1], 7, 2);
    /* lower intakes */ pFront(S, gD, 1, sx * hw * 0.52, sx * hw * 0.88, S.ySill + 0.12, yN - 0.09 - lh - 0.05, 0.005, DK, 5, 2);
  }
  pFront(S, gD, 1, -hw * 0.34, hw * 0.34, yN - 0.07 - Math.max(lh, 0.12), yN - 0.1, 0.007, DK, 8, 2);
  for (let k = 0; k < 2; k++) { const yy = yN - 0.12 - k * 0.045 - (Math.max(lh, 0.12) - 0.1) * 0.5; pFront(S, gD, 1, -hw * 0.32, hw * 0.32, yy - 0.006, yy + 0.006, 0.011, [0.55, 0.57, 0.6], 8, 1); }
  pFront(S, gD, 1, -hw * 0.28, hw * 0.28, S.ySill + 0.1, S.ySill + 0.2, 0.005, DK, 8, 1);
  pFront(S, gD, -1, -0.26, 0.26, S.ySill + 0.2, S.ySill + 0.33, 0.007, [0.92, 0.92, 0.88], 4, 1);
  pFront(S, gD, -1, -hw * 0.9, hw * 0.9, S.ySill + 0.05, S.ySill + 0.17, 0.004, DK, 10, 1);
  /* ---- door cuts, handles, side trim ---- */
  const doorZ = [S.zFB - 0.36, S.bpil != null ? S.bpil : null, S.zRB + (b.squareback ? 0.3 : 0.62)].filter((z) => z != null);
  for (const sd of [-1, 1]) {
    for (const z of doorZ) pSide(S, gD, sd, z - 0.006, z + 0.006, S.ySill + 0.16, y1 - 0.02, 0.004, [0.02, 0.02, 0.024], 1, 6);
    for (const z of [doorZ[0] - 0.2, doorZ[doorZ.length - 1] - 0.18]) pSide(S, gD, sd, z - 0.07, z + 0.07, y1 - 0.12, y1 - 0.095, 0.011, CH, 2, 1);
    pSide(S, gD, sd, -S.wheels[1].z * 0 + S.wheels[1].z + S.Ra + 0.05, S.wheels[0].z - S.Ra - 0.05, S.ySill + 0.02, S.ySill + 0.1, 0.006, [0.04, 0.04, 0.045], 8, 1);
    /* mirror */ { const mx = sd * (hw - S.inset + 0.03), mz = S.zFB - 0.12, my = y1 + 0.08; gP.box(Math.min(mx, mx + sd * 0.17), my, mz - 0.06, Math.max(mx, mx + sd * 0.17), my + 0.1, mz + 0.06, 0.9, 0.9, 0.9); tbx(mx, my + 0.01, mz - 0.062, mx + sd * 0.15, my + 0.09, mz - 0.058, 0.05); tbx(mx - sd * 0.03, my - 0.03, mz - 0.02, mx + sd * 0.02, my + 0.0, mz + 0.02, 0.04); }
  }
  /* exhaust tips */
  const ex = b.exhaust != null ? b.exhaust : 2;
  if (ex > 0) { const eg = ni(new THREE.CylinderGeometry(0.048, 0.052, 0.14, 12)); eg.rotateX(Math.PI / 2); for (let k = 0; k < ex; k++) { const xx = ex === 1 ? 0.5 * hw : (ex === 2 ? (k ? 1 : -1) * 0.52 * hw : (k - 1.5) * 0.28 * hw); _m4.compose(_p3.set(xx, S.ySill + 0.12, -hl + 0.0), _q.identity(), _s3.set(1, 1, 1)); gD.geo(eg, _m4, _tcol.setRGB(0.32, 0.33, 0.36), 0); } eg.dispose(); }
  /* ---- optional body kit (as the old recipe, placed on the new surface) ---- */
  const dk = (x0, ya, z0, x1, yb, z1, k) => tbx(x0, ya, z0, x1, yb, z1, k), sy0 = Math.max(0.05, y0 - 0.2), topAt = (z) => samp(S.sil, z) - 0.02;
  if (b.stripes) { const s = b.stripes; for (const sx of [-1, 1]) { const xa = sx * 0.05, xb2 = sx * 0.2; pTop(S, gD, xa, xb2, S.zFB + 0.04, hl - 0.06, 0.006, s, 1, 8); pTop(S, gD, xa, xb2, -hl + 0.06, S.zRB - 0.04, 0.006, s, 1, 8); pTop(S, gD, xa, xb2, S.zRT + 0.02, S.zFT - 0.02, 0.006, s, 1, 8); } }
  if (cs && cs.livery) {
    const lv = cs.livery, c = lv.c, zH0 = S.zFB + 0.04, zH1 = hl - 0.06, zT0 = -hl + 0.06, zT1 = S.zRB - 0.04, zR0 = S.zRT + 0.02, zR1 = S.zFT - 0.02;
    if (lv.k === 'center') for (const [a, z0, z1] of [[0, zH0, zH1], [0, zT0, zT1], [0, zR0, zR1]]) pTop(S, gD, -0.14, 0.14, z0, z1, 0.006, c, 1, 8);
    else if (lv.k === 'hood') { pTop(S, gD, -0.32, 0.32, zH0, zH1, 0.006, c, 2, 8); pTop(S, gD, -0.32, 0.32, zR0, zR1, 0.006, c, 2, 8); }
    else if (lv.k === 'sides') for (const sd of [-1, 1]) pSide(S, gD, sd, S.wheels[3].z + S.Ra + 0.12, S.wheels[0].z - S.Ra - 0.12, S.ySill + 0.3, S.ySill + 0.4, 0.007, c, 8, 1);
    else if (lv.k === 'rocker') for (const sd of [-1, 1]) pSide(S, gD, sd, S.wheels[3].z + S.Ra + 0.1, S.wheels[0].z - S.Ra - 0.1, S.ySill + 0.11, S.ySill + 0.2, 0.007, c, 8, 1);
    else if (lv.k === 'checker') {
      const cell = 0.13, dk2 = [c[0], c[1], c[2]], lt = [0.92, 0.92, 0.92];
      for (const [z0, z1] of [[zH0, zH1], [zR0, zR1]]) { let row = 0; for (let z = z0; z < z1 - 0.02; z += cell, row++) for (let k = -3; k < 3; k++) if (((row + k) & 1) === 0) pTop(S, gD, k * cell, (k + 1) * cell, z, Math.min(z + cell, z1), 0.006, row & 1 ? dk2 : dk2, 1, 1); }
      for (const [z0, z1] of [[zH0, zH1], [zR0, zR1]]) { let row = 0; for (let z = z0; z < z1 - 0.02; z += cell, row++) for (let k = -3; k < 3; k++) if (((row + k) & 1) === 1) pTop(S, gD, k * cell, (k + 1) * cell, z, Math.min(z + cell, z1), 0.006, lt, 1, 1); }
    }
  }
  if (b.scoop) { const s = b.scoop, yb = topAt(s.z + s.len / 2); dk(-s.w, yb, s.z, s.w, yb + s.h + 0.02, s.z + s.len, 0.02); }
  if (b.lip) { const yb = samp(S.sil, -hl + 0.12) - 0.01; gP.box(-hw + 0.14, yb, -hl + 0.02, hw - 0.14, yb + 0.07, -hl + 0.22, 1, 1, 1); }
  if (b.skirts) for (const sx of [-1, 1]) dk(sx * (hw - 0.02), S.ySill - 0.04, S.wheels[3].z + 0.5, sx * (hw + 0.045), S.ySill + 0.12, S.wheels[0].z - 0.5, 0.03);
  if (b.splitter) { const zs0 = hl - 0.45, sw = hw * 0.55; dk(-sw, sy0, zs0, sw, sy0 + 0.03, hl + 0.04, 0.02); for (const sx of [-1, 1]) dk(sx * sw - 0.02, sy0, zs0 + 0.05, sx * sw + 0.02, sy0 + 0.1, hl + 0.04, 0.03); }
  if (b.diffuser) { dk(-hw + 0.28, sy0, -hl - 0.12, hw - 0.28, S.ySill + 0.14, -hl + 0.3, 0.02); for (const fx of [-0.45, -0.15, 0.15, 0.45]) dk(fx - 0.015, sy0, -hl - 0.14, fx + 0.015, S.ySill + 0.14, -hl + 0.15, 0.05); }
  if (b.intakes) for (const sx of [-1, 1]) pSide(S, gD, sx, S.wheels[3].z + 0.15, S.wheels[3].z + 0.85, S.ySill + 0.2, y1 - 0.08, 0.008, [0.015, 0.015, 0.02], 6, 3);
  if (b.deck) { const d = b.deck; for (let z = d.z0; z < d.z1; z += 0.16) { const yb = topAt(z + 0.035) + 0.012; dk(-0.42, yb, z, 0.42, yb + 0.014, z + 0.07, 0.02); } }
  if (b.wing) {
    const w = b.wing, wz = -hl + (w.z != null ? w.z : 0.3), wy = y1 + w.h, ww = hw * (w.span || 0.86), ch = w.chord || 0.4, yb = samp(S.sil, wz) - 0.03;
    for (const sx of [-1, 1]) dk(sx * ww * 0.6 - 0.03, yb, wz - 0.05, sx * ww * 0.6 + 0.03, wy, wz + 0.05, 0.03);
    gP.box(-ww, wy, wz - ch / 2, ww, wy + 0.05, wz + ch / 2, 1, 1, 1);
    if (w.plates) for (const sx of [-1, 1]) dk(sx * ww - 0.02, wy - 0.1, wz - ch / 2, sx * ww + 0.02, wy + 0.16, wz + ch / 2, 0.03);
  }
  if (b.bed) {
    const z1 = b.bed.z1, z0 = -hl + 0.02, yb = y1 - 0.02;
    dk(-hw + 0.12, yb, z0 + 0.1, hw - 0.12, yb + 0.03, z1, 0.015);
    for (const sx of [-1, 1]) gP.box(Math.min(sx * (hw - 0.02), sx * (hw - 0.14)), yb - 0.1, z0, Math.max(sx * (hw - 0.02), sx * (hw - 0.14)), y1 + 0.3, z1, 1, 1, 1);
    gP.box(-hw + 0.02, yb - 0.1, z0, hw - 0.02, y1 + 0.3, z0 + 0.12, 1, 1, 1);
    gP.box(-hw + 0.02, yb - 0.1, z1 - 0.1, hw - 0.02, y1 + 0.2, z1, 1, 1, 1);
  }
  if (b.rack) {
    const rz0 = S.zRT + 0.05, rz1 = S.zFT - 0.05, ry = S.yR + 0.015;
    for (const sx of [-1, 1]) dk(sx * (S.tw - 0.14) - 0.025, ry, rz0, sx * (S.tw - 0.14) + 0.025, ry + 0.07, rz1, 0.025);
    for (let k = 0; k < 4; k++) { const z = rz0 + (rz1 - rz0) * k / 3; dk(-(S.tw - 0.14), ry + 0.04, z - 0.025, S.tw - 0.14, ry + 0.08, z + 0.025, 0.025); }
  }
  if (b.lightbar) { const z = S.zFT - 0.18, ry = S.yR + 0.08; gLt.box(-0.55, ry, z - 0.05, 0.55, ry + 0.09, z + 0.05, 1, 1, 1); for (const sx of [-1, 1]) dk(sx * 0.5 - 0.02, S.yR, z - 0.05, sx * 0.5 + 0.02, ry, z + 0.05, 0.03); }
  if (b.bullbar) {
    dk(-0.62, y0 - 0.06, hl + 0.02, 0.62, y0 + 0.04, hl + 0.14, 0.03); dk(-0.62, y0 + 0.26, hl + 0.02, 0.62, y0 + 0.34, hl + 0.14, 0.03);
    for (const sx of [-1, 1]) dk(sx * 0.62 - 0.04, y0 - 0.06, hl + 0.02, sx * 0.62 + 0.04, y0 + 0.46, hl + 0.14, 0.03);
  }
  if (b.rally) {
    const yN2 = samp(S.sil, hl - 0.05);
    /* bonnet vents: a pair of louvred slots, and a roof air intake */
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) { const z = S.zFB + 0.3 + k * 0.1; pTop(S, gD, sx * 0.2, sx * 0.5, z, z + 0.05, 0.012, [0.012, 0.012, 0.015], 3, 1); }
    dk(-0.17, S.yR - 0.005, S.zRT + 0.12, 0.17, S.yR + 0.1, S.zRT + 0.5, 0.03);
    gD.box(-0.12, S.yR + 0.06, S.zRT + 0.48, 0.12, S.yR + 0.095, S.zRT + 0.512, 0.01, 0.01, 0.012);
    /* mud flaps behind every wheel */
    for (const w of S.wheels) { const zf = w.z + (w.front ? -1 : -1) * (S.Ra + 0.03), xf = w.side * (hw - 0.2); dk(xf - 0.16, S.ySill - 0.08, zf - 0.012, xf + 0.16, S.ySill + 0.2, zf + 0.012, 0.02); }
    /* door roundels (white number panels), tow loops, and a pair of driving lamps on the nose */
    for (const sd of [-1, 1]) { const zc = S.zFB - 0.5; pSide(S, gD, sd, zc - 0.17, zc + 0.17, S.ySill + 0.34, S.ySill + 0.68, 0.009, [0.93, 0.93, 0.9], 3, 3); pSide(S, gD, sd, zc - 0.07, zc + 0.07, S.ySill + 0.4, S.ySill + 0.62, 0.012, [0.04, 0.04, 0.05], 2, 3); }
    pTop(S, gD, -0.36, 0.36, S.zRT - 0.02, S.zRT + 0.02, 0.01, [0.9, 0.9, 0.88], 4, 1);
    for (const sx of [-1, 1]) { gT.box(Math.min(sx * 0.58, sx * 0.64), yN2 - 0.42, hl - 0.05, Math.max(sx * 0.58, sx * 0.64), yN2 - 0.36, hl + 0.14, 0.9, 0.2, 0.1); gLt.box(sx * 0.34 - 0.09, yN2 - 0.3, hl - 0.06, sx * 0.34 + 0.09, yN2 - 0.2, hl + 0.025, 1, 1, 1); }
  }
  const grp = new THREE.Group(), paint = mkPaint(hex, !!opts.studio, cs && cs.fin);
  const mP = gP.mesh(paint, true, true), mG = gG.mesh(MAT.carGlass, true, false), mT = gT.mesh(MAT.carTrim, false, true), mD = gD.mesh(MAT.carTrim, false, true), mH = gLt.mesh(MAT.carHead, false, false), mTl = tl.mesh(MAT.carTail, false, false);
  if (opts.studio) { const gm = MAT.carGlass.clone(); gm.envMap = Env.studio; mG.material = gm; grp.userData.studioMats = [gm]; }
  grp.add(mP, mG, mT, mD, mH, mTl);
  grp.userData.paint = paint; grp.userData.hl = hl; grp.userData.tail = mTl; grp.userData.dm = { P: mP, G: mG, T: mT, D: mD, H: mH, TL: mTl };
  if (cs) {
    if (cs.tint != null) { const gm = (opts.studio ? mG.material : Env.reg(MAT.carGlass.clone(), false)); gm.color.copy(lc(cs.tint)); mG.material = gm; grp.userData.studioMats = (grp.userData.studioMats || []).concat(opts.studio ? [] : [gm]); if (!opts.studio) grp.userData.envMats = [gm]; }
    if (cs.head != null) { const hm = new THREE.MeshBasicMaterial({ color: MAT.carHead.color.clone() }); hm.polygonOffset = true; hm.polygonOffsetFactor = -1; hm.polygonOffsetUnits = -2; mH.material = hm; grp.userData.headMat = hm; grp.userData.headTint = lc(cs.head); if (opts.studio) hm.color.copy(lc(cs.head)).multiplyScalar(1.4); grp.userData.studioMats = (grp.userData.studioMats || []).concat([hm]); }
    if (cs.glow) { const gm2 = makeGlow(S, cs.glow.hex, cs.glow.mode); grp.add(gm2); grp.userData.glowM = gm2; grp.userData.studioMats = (grp.userData.studioMats || []).concat([gm2.material]); gm2.userData.geoOwn = gm2.geometry; }
  }
  if (opts.static) {
    /* thumbnails: ordinary wheel meshes (no instancing) */
    wheelsInit(); const geo = Wheels.geo, rim = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.28, metalness: 0.8, envMapIntensity: 1.1, side: THREE.DoubleSide, envMap: Env.studio, color: new THREE.Color(...(b.rim || [0.6, 0.6, 0.64])) });
    grp.userData.studioMats = (grp.userData.studioMats || []).concat([rim]);
    for (const w of S.wheels) {
      const left = w.side < 0, rho = (b.tire === 'sport') ? 0.7 : 0.62;
      const t = new THREE.Mesh(geo.tire[b.tire === 'sport' ? 'sport' : 'std'], MAT.tire), r = new THREE.Mesh(geo.rim[b.rimStyle || 'multi'], rim);
      for (const m of [t, r]) { m.position.set(w.x, w.r, w.z); m.rotation.y = left ? Math.PI : 0; m.castShadow = false; grp.add(m); }
      t.scale.set(w.w, w.r, w.r); r.scale.set(w.w, w.r * rho, w.r * rho);
    }
  } else wheelsAdd(grp, S);
  grp.userData.S = S;
  return grp;
}
function disposeCar(g) {
  if (!g) return; wheelsRemove(g);
  g.traverse((o) => { if (o.geometry && !(Wheels.geo && (o.geometry === Wheels.geo.tire.std || o.geometry === Wheels.geo.tire.sport || Object.values(Wheels.geo.rim).includes(o.geometry)))) o.geometry.dispose(); });
  const p = g.userData.paint; if (p) { Env.mats.delete(p); p.dispose(); } if (g.userData.studioMats) for (const m of g.userData.studioMats) m.dispose(); if (g.userData.envMats) for (const m of g.userData.envMats) { Env.mats.delete(m); m.dispose(); }
}

/* ---------- traffic bodies (same builder, simpler lod) ---------- */
const TRAFFIC_DEFS = [
  { name: 'sedan', p: { a: 1.3, b: 1.3 }, body: { L: 4.5, W: 1.82, H: 0.5, C: 0.5, wr: 0.33, y0: 0.36, tw: 0.26, rim: [0.62, 0.62, 0.66], rimStyle: 'multi', cab: { cz: -0.15, bd: 1.1, tw: 0.68, td: 0.62, zoff: -0.12, inset: 0.08 }, bpil: -0.15, exhaust: 1 } },
  { name: 'hatch', p: { a: 1.15, b: 1.15 }, body: { L: 3.9, W: 1.76, H: 0.55, C: 0.55, wr: 0.32, y0: 0.36, tw: 0.24, rim: [0.66, 0.66, 0.7], rimStyle: 'five', cab: { cz: -0.35, bd: 1.35, tw: 0.66, td: 0.95, zoff: -0.12, inset: 0.06 }, squareback: true, noseR: 0.7, exhaust: 0 } },
  { name: 'suv', p: { a: 1.4, b: 1.4 }, body: { L: 4.6, W: 1.92, H: 0.7, C: 0.6, wr: 0.38, y0: 0.38, tw: 0.3, rim: [0.45, 0.46, 0.5], rimStyle: 'five', boxy: true, noseR: 0.5, cab: { cz: -0.3, bd: 1.72, tw: 0.8, td: 1.15, zoff: -0.2, inset: 0.07 }, squareback: true, bpil: -0.1, exhaust: 0 } },
  { name: 'van', p: { a: 1.55, b: 1.45 }, body: { L: 5.0, W: 1.95, H: 0.64, y1: 1.0, C: 0.95, wr: 0.36, y0: 0.3, tw: 0.28, rim: [0.55, 0.56, 0.6], rimStyle: 'steel', boxy: true, noseR: 0.4, hoodDrop: 0.2, deckDrop: 0.0, cab: { cz: -0.5, bd: 2.2, tw: 0.9, td: 1.75, zoff: -0.4, inset: 0.05 }, squareback: true, win: [[0.15, 1.5]], exhaust: 0 } }
];
const CAR_VARIANTS = TRAFFIC_DEFS.map((d) => d.body);
function buildCarMesh(hex, vi) { return buildCarModel(TRAFFIC_DEFS[vi || 0], hex, { lod: 1 }); }
